import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import * as WebSocket from 'ws';

const OPENAI_REALTIME_URL =
  'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview';

const SYSTEM_PROMPT = `Tu es l'assistante téléphonique de Jean Dupont, plombier à Lyon.
Tu t'appelles Lisa.

# RÈGLE FONDAMENTALE
Tu adaptes toujours ta réponse à ce que vient de dire l'appelant.
Tu ne suis jamais une séquence fixe — tu réfléchis à chaque tour.
Tu ne poses jamais deux questions en même temps.
Tes phrases sont courtes, naturelles, professionnelles.

# DÉMARRAGE
Tu décroches avec : "Allo, bonjour, cabinet Jean Dupont, que puis-je faire pour vous ?"

# CE QUE TU DOIS COLLECTER (dans n'importe quel ordre naturel)
- La nature du problème ou du besoin
- Si c'est une urgence, un devis, ou un rendez-vous
- Le nom de l'appelant
- Son adresse

# COMMENT TU COLLECTES
Tu écoutes ce que dit l'appelant et tu en tires le maximum.
Si l'appelant dit "mon chauffage est tombé en panne", tu as déjà le problème.
Tu réponds alors : "D'accord, c'est noté. Est-ce que c'est urgent ou vous souhaitez prendre rendez-vous ?"
Tu ne redemandes jamais une info déjà donnée.
Tu poses la question la plus logique selon ce qui manque encore.

# URGENCE
Si l'appelant signale un danger immédiat (fuite active, pas de chauffage en hiver, panne électrique totale) :
→ "Je préviens Jean Dupont immédiatement, il vous rappelle dans quelques minutes."
→ Termine la conversation.

# RENDEZ-VOUS OU DEVIS
Tu proposes un créneau disponible lundi au vendredi 8h-18h.
→ "Je vous propose lundi à 10h, ça vous convient ?"
Si oui : "Parfait, c'est noté. À lundi 10h, bonne journée."
Si non : propose le créneau suivant.

# FIN DE CONVERSATION
Tu termines toujours par une confirmation claire et courte.
Tu ne dis jamais "n'hésitez pas à rappeler".

# ZONE ET SPÉCIALITÉ
Plomberie uniquement. Zone : Lyon et 30 km alentour.
Si hors zone ou hors spécialité : "Je suis désolée, Jean Dupont n'intervient pas sur ce type de demande."`;

interface SessionData {
  openAiWs: any;
  transcript: string[];
}

@WebSocketGateway({
  cors: {
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      // En développement ou si pas d'origine (ex: Postman), on autorise
      if (!origin) return callback(null, true);
      const allowed = process.env.FRONTEND_URL ?? 'http://localhost:3000';
      if (origin === allowed || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
  },
  namespace: 'voice',
})
export class VoiceTestGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(VoiceTestGateway.name);
  private readonly sessions = new Map<string, SessionData>();
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.getOrThrow<string>('OPENAI_API_KEY');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.closeSession(client.id);
  }

  @SubscribeMessage('start')
  async handleStart(@ConnectedSocket() client: Socket) {
    this.logger.log(`Starting voice session for: ${client.id}`);

    const openAiWs = new (WebSocket as any)(OPENAI_REALTIME_URL, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    });

    const session: SessionData = { openAiWs, transcript: [] };
    this.sessions.set(client.id, session);

    openAiWs.on('open', () => {
      this.logger.log(`OpenAI WS open for client: ${client.id}`);

      openAiWs.send(JSON.stringify({
        type: 'session.update',
        session: {
          turn_detection: { type: 'server_vad' },
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          voice: 'alloy',
          instructions: SYSTEM_PROMPT,
          modalities: ['text', 'audio'],
          temperature: 0.7,
          input_audio_transcription: { model: 'whisper-1' },
        },
      }));

      openAiWs.send(JSON.stringify({
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

      openAiWs.send(JSON.stringify({ type: 'response.create' }));

      client.emit('ready', { message: 'Session démarrée' });
    });

    openAiWs.on('message', (data: any) => {
      this.handleOpenAiMessage(client, session, data);
    });

    openAiWs.on('error', (err: Error) => {
      this.logger.error(`OpenAI WS error: ${err.message}`);
      client.emit('error', { message: err.message });
    });

    openAiWs.on('close', () => {
      this.logger.log(`OpenAI WS closed for: ${client.id}`);
      client.emit('session_ended', {});
    });
  }

  @SubscribeMessage('audio')
  handleAudio(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { audio: string },
  ) {
    const session = this.sessions.get(client.id);
    if (!session || session.openAiWs.readyState !== 1) return;

    session.openAiWs.send(JSON.stringify({
      type: 'input_audio_buffer.append',
      audio: data.audio,
    }));
  }

  @SubscribeMessage('stop')
  handleStop(@ConnectedSocket() client: Socket) {
    const session = this.sessions.get(client.id);
    if (!session) return;

    session.openAiWs.send(JSON.stringify({
      type: 'input_audio_buffer.commit',
    }));
  }

  @SubscribeMessage('end')
  handleEnd(@ConnectedSocket() client: Socket) {
    this.closeSession(client.id);
  }

  private handleOpenAiMessage(
    client: Socket,
    session: SessionData,
    data: any,
  ) {
    let message: any;
    try {
      message = JSON.parse(data.toString());
    } catch {
      return;
    }

    switch (message.type) {
      case 'response.audio.delta':
        if (message.delta) {
          client.emit('audio', { audio: message.delta });
        }
        break;

      case 'response.audio_transcript.delta':
        if (message.delta) {
          client.emit('transcript_delta', {
            role: 'assistant',
            text: message.delta,
          });
        }
        break;

      case 'response.audio_transcript.done':
        if (message.transcript) {
          session.transcript.push(`Assistant: ${message.transcript}`);
          client.emit('transcript_done', {
            role: 'assistant',
            text: message.transcript,
          });
        }
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (message.transcript) {
          session.transcript.push(`Vous: ${message.transcript}`);
          client.emit('transcript_done', {
            role: 'user',
            text: message.transcript,
          });
        }
        break;

      case 'error':
        this.logger.error(`OpenAI error: ${JSON.stringify(message.error)}`);
        client.emit('error', message.error);
        break;
    }
  }

  private closeSession(clientId: string) {
    const session = this.sessions.get(clientId);
    if (!session) return;
    if (session.openAiWs.readyState === 1) {
      session.openAiWs.close();
    }
    this.sessions.delete(clientId);
  }
}