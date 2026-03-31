import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { ConversationStep, ExtractionResult } from '../types/orchestrator.types';

// ─── Zod schema ──────────────────────────────────────────────────────────────

const ExtractionSchema = z.object({
  issueDescription: z.string().optional(),
  fullName: z.string().optional(),
  address: z.string().optional(),
  urgencyLevel: z.enum(['low', 'medium', 'high']).optional(),
  urgencyDetected: z.boolean().optional(),
  unrecognizedIntent: z.boolean().optional(),
});

// ─── OpenAI response shape ────────────────────────────────────────────────────

interface OpenAIMessage {
  role: string;
  content: string;
}

interface OpenAIChoice {
  message: OpenAIMessage;
}

interface OpenAIResponse {
  choices: OpenAIChoice[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class LlmExtractorService {
  private readonly logger = new Logger(LlmExtractorService.name);
  private readonly apiKey: string;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.getOrThrow<string>('OPENAI_API_KEY');
    this.model = this.config.get<string>('OPENAI_MODEL', 'gpt-4o-mini');
  }

  async extract(
    userMessage: string,
    step: ConversationStep,
    context: {
      issueDescription?: string;
      fullName?: string;
      address?: string;
    },
  ): Promise<ExtractionResult> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(userMessage, step, context);

    let rawText: string;
    try {
      rawText = await this.callOpenAI(systemPrompt, userPrompt);
    } catch (err) {
      this.logger.error('OpenAI call failed', err);
      return { unrecognizedIntent: true };
    }

    return this.parseOutput(rawText);
  }

  // ─── Prompts ───────────────────────────────────────────────────────────────

  private buildSystemPrompt(): string {
    return `Tu es un extracteur de donnees structures pour un assistant telephonique destine aux artisans.
Tu recois un message d'un appelant francophone.
Tu reponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans explication, sans texte autour.
Ne devine jamais ce qui n'est pas clairement exprime.`.trim();
  }

  private buildUserPrompt(
    userMessage: string,
    step: ConversationStep,
    context: {
      issueDescription?: string;
      fullName?: string;
      address?: string;
    },
  ): string {
    return `Contexte de la conversation :
- Etape en cours : ${step}
- Probleme deja collecte : ${context.issueDescription ?? 'non encore collecte'}
- Nom deja collecte : ${context.fullName ?? 'non encore collecte'}
- Adresse deja collectee : ${context.address ?? 'non encore collectee'}

Message de l'appelant : "${userMessage}"

Reponds avec ce JSON et rien d'autre :
{
  "issueDescription": string | undefined,
  "fullName": string | undefined,
  "address": string | undefined,
  "urgencyLevel": "low" | "medium" | "high" | undefined,
  "urgencyDetected": boolean | undefined,
  "unrecognizedIntent": boolean | undefined
}

Regles :
- N'inclus pas un champ si l'information n'est pas presente dans le message.
- issueDescription : phrase courte et factuelle, max 150 caracteres.
- fullName : format "Prenom Nom" normalise.
- address : adresse complete telle qu'exprimee.
- urgencyLevel "high" si danger, panne totale, inondation, gaz, urgence explicite.
- urgencyLevel "medium" si probleme important mais pas immediat.
- urgencyLevel "low" si l'appelant dit explicitement que ce n'est pas urgent.`.trim();
  }

  // ─── OpenAI Chat Completions call ─────────────────────────────────────────

  private async callOpenAI(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 512,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${error}`);
    }

    const data = (await response.json()) as OpenAIResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from OpenAI');

    return content.trim();
  }

  // ─── Output validation ────────────────────────────────────────────────────

  private parseOutput(raw: string): ExtractionResult {
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      this.logger.warn(`OpenAI returned non-JSON: ${raw.slice(0, 200)}`);
      return { unrecognizedIntent: true };
    }

    const result = ExtractionSchema.safeParse(parsed);
    if (!result.success) {
      this.logger.warn(
        `OpenAI JSON failed Zod validation: ${JSON.stringify(result.error.flatten())}`,
      );
      return { unrecognizedIntent: true };
    }

    return result.data as ExtractionResult;
  }
}