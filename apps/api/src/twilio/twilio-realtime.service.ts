import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as WebSocket from 'ws';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import { RealtimeSession } from './types/twilio.types';

const OPENAI_REALTIME_URL =
  'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview';

const SYSTEM_PROMPT = `Tu es un assistant telephonique IA pour un artisan.
Tu reponds en francais, avec un ton professionnel et concis.
Tu dois collecter : le motif de l'appel, le nom complet du client, son adresse d'intervention.
Tu poses une question a la fois. Tu es poli et efficace.`;

@Injectable()
export class TwilioRealtimeService {
  private readonly logger = new Logger(TwilioRealtimeService.name);
  private readonly apiKey: string;
  private readonly sessions = new Map<string, RealtimeSession>();
  private readonly pendingCalls = new Map<string, { callerNumber: string; businessId: string }>();

  constructor(
    private readonly config: ConfigService,
    private readonly orchestratorService: OrchestratorService,
  ) {
    this.apiKey = this.config.getOrThrow<string>('OPENAI_API_KEY');
  }

  registerPendingCall(callSid: string, callerNumber: string, businessId: string): void {
    this.pendingCalls.set(callSid, { callerNumber, businessId });
    this.logger.log(`Pending call registered: ${callSid}`);
  }

  async handleMediaStreamOpen(
    twilioWs: WebSocket,
    callSid: string,
    streamSid: string,
  ): Promise<void> {
    const pending = this.pendingCalls.get(callSid);
    const callerNumber = pending?.callerNumber ?? 'unknown';
    const businessId = pending?.businessId ?? 'biz-demo-001';
    this.pendingCalls.delete(callSid);

    this.logger.log(`Media stream opened — callSid: ${callSid}`);

    const { sessionId } = await this.orchestratorService.startSession(
      businessId,
      callerNumber,
    );

    const openAiWs = new (WebSocket as any)(OPENAI_REALTIME_URL, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    });

    const session: RealtimeSession = { callSid, streamSid, sessionId, openAiWs };
    this.sessions.set(callSid, session);

    openAiWs.on('open', () => {
      this.logger.log(`OpenAI WS open — callSid: ${callSid}`);
      this.initializeOpenAiSession(openAiWs);
    });

    openAiWs.on('message', async (data: WebSocket.RawData) => {
      await this.handleOpenAiMessage(callSid, twilioWs, data);
    });

    openAiWs.on('error', (err: Error) => {
      this.logger.error(`OpenAI WS error: ${err.message}`);
    });

    openAiWs.on('close', () => {
      this.logger.log(`OpenAI WS closed — callSid: ${callSid}`);
      this.sessions.delete(callSid);
    });
  }

  handleTwilioAudio(callSid: string, audioPayload: string): void {
    const session = this.sessions.get(callSid);
    if (!session || session.openAiWs.readyState !== WebSocket.OPEN) return;

    session.openAiWs.send(
      JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: audioPayload,
      }),
    );
  }

  async endSession(callSid: string): Promise<void> {
    const session = this.sessions.get(callSid);
    if (!session) return;

    try {
      await this.orchestratorService.closeSession(session.sessionId);
    } catch (err) {
      this.logger.warn(`Failed to close orchestrator session: ${err}`);
    }

    if (session.openAiWs.readyState === WebSocket.OPEN) {
      session.openAiWs.close();
    }

    this.sessions.delete(callSid);
    this.logger.log(`Session ended: ${callSid}`);
  }

  private initializeOpenAiSession(ws: any): void {
    ws.send(JSON.stringify({
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
    }));

    ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{
          type: 'input_text',
          text: 'Commence la conversation en te presentant et en demandant comment tu peux aider.',
        }],
      },
    }));

    ws.send(JSON.stringify({ type: 'response.create' }));
  }

  private async handleOpenAiMessage(
    callSid: string,
    twilioWs: WebSocket,
    data: WebSocket.RawData,
  ): Promise<void> {
    let message: any;
    try {
      message = JSON.parse(data.toString());
    } catch {
      return;
    }

    switch (message.type) {
      case 'response.audio.delta':
        if (message.delta) {
          const session = this.sessions.get(callSid);
          if (!session) break;
          if (twilioWs.readyState === WebSocket.OPEN) {
            twilioWs.send(JSON.stringify({
              event: 'media',
              streamSid: session.streamSid,
              media: { payload: message.delta },
            }));
          }
        }
        break;

      case 'response.audio_transcript.done':
        this.logger.debug(`Assistant: ${message.transcript}`);
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (message.transcript) {
          this.logger.debug(`Caller: ${message.transcript}`);
          const session = this.sessions.get(callSid);
          if (session) {
            try {
              await this.orchestratorService.handleMessage(
                session.sessionId,
                message.transcript,
              );
            } catch (err) {
              this.logger.warn(`Orchestrator error: ${err}`);
            }
          }
        }
        break;

      case 'error':
        this.logger.error(`OpenAI error: ${JSON.stringify(message.error)}`);
        break;
    }
  }

  getSession(callSid: string): RealtimeSession | undefined {
    return this.sessions.get(callSid);
  }
}