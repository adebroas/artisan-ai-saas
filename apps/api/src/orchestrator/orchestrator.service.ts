import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationStateService } from './conversation-state/conversation-state.service';
import { LocalParserService } from './local-parser/local-parser.service';
import { LlmExtractorService } from './llm-extractor/llm-extractor.service';
import { DecisionEngineService } from './decision-engine/decision-engine.service';
import { ResponseBuilderService } from './response-builder/response-builder.service';
import {
  CallState,
  ExtractionResult,
  OrchestratorResponse,
  SessionSummary,
} from './types/orchestrator.types';
import { Speaker, UrgencyLevel } from '@prisma/client';

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly stateService: ConversationStateService,
    private readonly localParser: LocalParserService,
    private readonly llmExtractor: LlmExtractorService,
    private readonly decisionEngine: DecisionEngineService,
    private readonly responseBuilder: ResponseBuilderService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Start ────────────────────────────────────────────────────────────────

  async startSession(
    businessId: string,
    callerPhone?: string,
  ): Promise<{ sessionId: string; assistantMessage: string; state: CallState }> {
    const state = await this.stateService.createSession(businessId, callerPhone);

    // CallSession — champs alignés sur le vrai schéma
    const callSession = await this.prisma.callSession.create({
      data: {
        businessId,
        callerNumber: callerPhone ?? 'unknown',
        status: 'in_progress',
        urgencyLevel: 'none',
        startedAt: new Date(),
      },
    });

    // Patch l'état Redis avec le callId
    const freshState = await this.stateService.getSession(state.sessionId);
    freshState.callId = callSession.id;
    await this.stateService.saveState(freshState);

    const assistantMessage = this.responseBuilder.build('greeting', {}, false);

    await this.stateService.appendTurn(state.sessionId, {
      role: 'assistant',
      content: assistantMessage,
      timestamp: new Date().toISOString(),
    });

    await this.persistMessage(callSession.id, 'assistant', assistantMessage);

    this.logger.log(
      `Session started: ${state.sessionId} | callSession: ${callSession.id}`,
    );

    return {
      sessionId: state.sessionId,
      assistantMessage,
      state: freshState,
    };
  }

  // ─── Message ──────────────────────────────────────────────────────────────

  async handleMessage(
    sessionId: string,
    userMessage: string,
  ): Promise<OrchestratorResponse> {
    const state = await this.stateService.getSession(sessionId);

    if (state.status === 'closed') {
      throw new NotFoundException('Session is already closed');
    }

    // 1. Caller turn
    await this.stateService.appendTurn(sessionId, {
      role: 'caller',
      content: userMessage,
      timestamp: new Date().toISOString(),
    });
    if (state.callId) {
      await this.persistMessage(state.callId, 'caller', userMessage);
    }

    // 2. Parsing local d'abord
    let extracted: ExtractionResult = {};
    const localResult = this.localParser.tryParse(state.currentStep, userMessage);

    if (localResult.success && localResult.confidence >= 0.75) {
      this.logger.debug(`Local parse OK — step: ${state.currentStep}`);
      extracted = this.mapLocalResult(state.currentStep, localResult);
    } else {
      this.logger.debug(`LLM fallback — step: ${state.currentStep}`);
      extracted = await this.llmExtractor.extract(
        userMessage,
        state.currentStep,
        state.collectedData,
      );
    }

    // 3. Décision
    const decision = this.decisionEngine.decide(state, userMessage, extracted);

    // 4. Mise à jour Redis
    await this.stateService.mergeCollectedData(sessionId, decision.extractedData);
    await this.stateService.updateStep(sessionId, decision.nextStep);

    // 5. Persistance DB
    const freshState = await this.stateService.getSession(sessionId);
    if (state.callId) {
      await this.persistExtractedData(state.callId, freshState.collectedData);
    }

    // 6. Réponse assistant
    const assistantMessage = this.responseBuilder.build(
      decision.nextStep,
      freshState.collectedData,
      decision.shouldMarkUrgent,
    );

    await this.stateService.appendTurn(sessionId, {
      role: 'assistant',
      content: assistantMessage,
      timestamp: new Date().toISOString(),
    });
    if (state.callId) {
      await this.persistMessage(state.callId, 'assistant', assistantMessage);
    }

    // 7. Clôture automatique si terminal
    if (decision.shouldClose) {
      await this.closeSession(sessionId);
    }

    const finalState = await this.stateService.getSession(sessionId);

    return {
      sessionId,
      assistantMessage,
      updatedState: finalState,
      extractedData: decision.extractedData,
      decision,
    };
  }

  // ─── Get State ────────────────────────────────────────────────────────────

  async getState(sessionId: string): Promise<CallState> {
    return this.stateService.getSession(sessionId);
  }

  // ─── Close ────────────────────────────────────────────────────────────────

  async closeSession(sessionId: string): Promise<SessionSummary> {
    const state = await this.stateService.getSession(sessionId);

    // Idempotent — si déjà closed, on retourne quand même le summary
    if (state.status !== 'closed') {
      await this.stateService.closeSession(sessionId);
    }

    const closed = await this.stateService.getSession(sessionId);

    const durationSeconds = Math.floor(
      (Date.now() - new Date(state.createdAt).getTime()) / 1000,
    );

    if (state.callId) {
      const urgencyPrisma = this.toUrgencyLevel(
        closed.collectedData.urgencyLevel,
      );
      const shortSummary = this.responseBuilder.buildSummary(
        closed.collectedData,
      );

      // Mise à jour CallSession
      await this.prisma.callSession.update({
        where: { id: state.callId },
        data: {
          status: 'completed',
          endedAt: new Date(),
          durationSeconds,
          urgencyLevel: urgencyPrisma,
        },
      });

      // Création ou mise à jour CallSummary
      await this.prisma.callSummary.upsert({
        where: { callSessionId: state.callId },
        create: {
          callSessionId: state.callId,
          shortSummary,
          structuredSummary: closed.collectedData as object,
          outcome: 'message_taken',
        },
        update: {
          shortSummary,
          structuredSummary: closed.collectedData as object,
        },
      });
    }

    return {
      sessionId,
      businessId: state.businessId,
      callId: state.callId,
      collectedData: closed.collectedData,
      turnCount: closed.history.length,
      durationSeconds,
      urgent:
        closed.collectedData.urgencyLevel === 'high' ||
        !!closed.collectedData.urgencyDetected,
      closedAt: closed.closedAt ?? new Date().toISOString(),
      finalState: closed,
    };
  }

  // ─── Helpers privés ───────────────────────────────────────────────────────

  private mapLocalResult(
    step: string,
    result: { value?: string | boolean },
  ): ExtractionResult {
    if (step === 'collect_name') return { fullName: result.value as string };
    if (step === 'collect_address') return { address: result.value as string };
    if (step === 'detect_urgency') {
      const isHigh = result.value === 'high';
      const isLow = result.value === 'low';
      return {
        urgencyLevel: isHigh ? 'high' : isLow ? 'low' : 'medium',
        urgencyDetected: isHigh,
      };
    }
    return {};
  }

  private toUrgencyLevel(
    level?: 'low' | 'medium' | 'high',
  ): UrgencyLevel {
    const map: Record<string, UrgencyLevel> = {
      low: 'low',
      medium: 'medium',
      high: 'high',
    };
    return map[level ?? ''] ?? 'none';
  }

  /**
   * Persiste un message dans call_messages.
   * speaker: enum Speaker = 'assistant' | 'caller'
   * text: contenu textuel
   */
  private async persistMessage(
    callSessionId: string,
    role: 'caller' | 'assistant',
    content: string,
  ): Promise<void> {
    try {
      const speaker: Speaker = role === 'caller' ? 'caller' : 'assistant';
      await this.prisma.callMessage.create({
        data: {
          callSessionId,
          speaker,
          text: content,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to persist message for callSession ${callSessionId}: ${err}`,
      );
    }
  }

  /**
   * Upsert CallExtractedData — 1 seule ligne par callSession (relation @unique).
   * On mappe CollectedData vers les vraies colonnes Prisma.
   */
  private async persistExtractedData(
    callSessionId: string,
    data: {
      issueDescription?: string;
      fullName?: string;
      address?: string;
      urgencyLevel?: 'low' | 'medium' | 'high';
      urgencyDetected?: boolean;
      callerPhone?: string;
    },
  ): Promise<void> {
    try {
      // Décompose fullName en prénom / nom
      const nameParts = data.fullName?.trim().split(/\s+/) ?? [];
      const callerFirstName =
        nameParts.length >= 1 ? nameParts[0] : undefined;
      const callerLastName =
        nameParts.length >= 2 ? nameParts.slice(1).join(' ') : undefined;

      const urgencyPrisma = this.toUrgencyLevel(data.urgencyLevel);

      await this.prisma.callExtractedData.upsert({
        where: { callSessionId },
        create: {
          callSessionId,
          callerFirstName,
          callerLastName,
          callerPhone: data.callerPhone,
          callerAddress: data.address,
          problemDescription: data.issueDescription,
          urgencyLevel: urgencyPrisma,
        },
        update: {
          ...(callerFirstName && { callerFirstName }),
          ...(callerLastName && { callerLastName }),
          ...(data.callerPhone && { callerPhone: data.callerPhone }),
          ...(data.address && { callerAddress: data.address }),
          ...(data.issueDescription && {
            problemDescription: data.issueDescription,
          }),
          urgencyLevel: urgencyPrisma,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to persist extracted data for callSession ${callSessionId}: ${err}`,
      );
    }
  }
}