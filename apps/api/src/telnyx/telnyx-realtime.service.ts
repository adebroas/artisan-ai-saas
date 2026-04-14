import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as WebSocket from 'ws';
import { TelnyxService } from './telnyx.service';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import { RealtimeSession } from './types/telnyx.types';

const OPENAI_REALTIME_URL =
  'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview';

const SYSTEM_PROMPT = `Tu es un assistant telephonique IA pour un artisan.
Tu reponds en francais, avec un ton professionnel et concis.
Tu dois collecter : le motif de l'appel, le nom complet du client, son adresse d'intervention.
Tu poses une question a la fois. Tu es poli et efficace.`;

@Injectable()
export class TelnyxRealtimeService {
  private readonly logger = new Logger(TelnyxRealtimeService.name);
  private readonly apiKey: string;
  private readonly sessions = new Map<string, RealtimeSession>();
  private readonly pendingCalls = new Map<string, { callerNumber: string; businessId: string }>();

  constructor(
    private readonly config: ConfigService,
    private readonly telnyxService: TelnyxService,
    private readonly orchestratorService: OrchestratorService,
  ) {
    this.apiKey = this.config.getOrThrow<string>('OPENAI_API_KEY');
  }

  // ─── Répond immédiatement à l'appel entrant ───────────────────────────────

  async answerCall(
    callControlId: string,
    callerNumber: string,
    businessId: string,
  ): Promise<void> {
    this.pendingCalls.set(callControlId, { callerNumber, businessId });
    await this.telnyxService.answerCall(callControlId);
    this.logger.log(`Answering call: ${callControlId}`);
  }

  // ─── Lance la session OpenAI après que l'appel est décroché ──────────────

  async startRealtimeSession(
    callControlId: string,
    callerNumber: string,
    businessId: string,
  ): Promise<void> {
    const pending = this.pendingCalls.get(callControlId);
    const finalCallerNumber = pending?.callerNumber ?? callerNumber;
    const finalBusinessId = pending?.businessId ?? businessId;
    this.pendingCalls.delete(callControlId);

    this.logger.log(`Starting realtime session for call: ${callControlId}`);

    const { sessionId } = await this.orchestratorService.startSession(
      finalBusinessId,
      finalCallerNumber,
    );

    const openAiWs = new (WebSocket as any)(`${OPENAI_REALTIME_URL}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    });

    const session: RealtimeSession = {
      callControlId,
      sessionId,
      openAiWs,
    };

    this.sessions.set(callControlId, session);

    openAiWs.on('open', () => {
      this.logger.log(`OpenAI WS open for call: ${callControlId}`);
      this.initializeSession(openAiWs);
    });

    openAiWs.on('message', async (data: WebSocket.RawData) => {
      await this.handleOpenAiMessage(callControlId, data);
    });

    openAiWs.on('error', (err: Error) => {
      this.logger.error(`OpenAI WS error: ${err.message}`);
    });

    openAiWs.on('close', () => {
      this.logger.log(`OpenAI WS closed for call: ${callControlId}`);
      this.sessions.delete(callControlId);
    });
  }

  // ─── Configure la session OpenAI Realtime ────────────────────────────────

  private initializeSession(ws: any): void {
    ws.send(
      JSON.stringify({
        type: 'session.update',
        session: {
          turn_detection: { type: 'server_vad' },
          input_audio_format: 'g711_ulaw',
          output_audio_format: 'g711_ulaw',
          voice: 'alloy',
          instructions: SYSTEM_PROMPT,
          modalities: ['text', 'audio'],
          temperature: 0.7,
        },
      }),
    );

    ws.send(
      JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: 'Commence la conversation en te presentant et en demandant comment tu peux aider.',
            },
          ],
        },
      }),
    );

    ws.send(JSON.stringify({ type: 'response.create' }));
  }

  // ─── Reçoit l'audio du caller depuis Telnyx ───────────────────────────────

  async handleTelnyxAudio(
    callControlId: string,
    audioPayload: string,
  ): Promise<void> {
    const session = this.sessions.get(callControlId);
    if (!session) return;

    session.openAiWs.send(
      JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: audioPayload,
      }),
    );
  }

  // ─── Traite les messages OpenAI Realtime ──────────────────────────────────

  private async handleOpenAiMessage(
    callControlId: string,
    data: any,
  ): Promise<void> {
    const session = this.sessions.get(callControlId);
    if (!session) return;

    let message: any;
    try {
      message = JSON.parse(data.toString());
    } catch {
      return;
    }

    switch (message.type) {
      case 'response.audio.delta':
        if (message.delta) {
          await this.telnyxService.sendAudio(callControlId, message.delta);
        }
        break;

      case 'response.audio_transcript.done':
        this.logger.debug(`Assistant: ${message.transcript}`);
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (message.transcript) {
          this.logger.debug(`Caller: ${message.transcript}`);
          try {
            await this.orchestratorService.handleMessage(
              session.sessionId,
              message.transcript,
            );
          } catch (err) {
            this.logger.warn(`Orchestrator error: ${err}`);
          }
        }
        break;

      case 'error':
        this.logger.error(
          `OpenAI Realtime error: ${JSON.stringify(message.error)}`,
        );
        break;
    }
  }

  // ─── Clôture la session ───────────────────────────────────────────────────

  async endSession(callControlId: string): Promise<void> {
    const session = this.sessions.get(callControlId);
    if (!session) return;

    try {
      await this.orchestratorService.closeSession(session.sessionId);
    } catch (err) {
      this.logger.warn(`Failed to close orchestrator session: ${err}`);
    }

    if (session.openAiWs.readyState === 1) {
      session.openAiWs.close();
    }

    this.sessions.delete(callControlId);
    this.logger.log(`Session ended: ${callControlId}`);
  }

  getSession(callControlId: string): RealtimeSession | undefined {
    return this.sessions.get(callControlId);
  }
}