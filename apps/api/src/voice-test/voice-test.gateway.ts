// apps/api/src/voice-test/voice-test.gateway.ts

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import WebSocket = require('ws');
import { ConfigService } from '@nestjs/config';

// ─── Types internes ───────────────────────────────────────────────────────────

interface SessionState {
  openAiWs: WebSocket | null;
  isConnected: boolean;
  audioBuffer: Buffer[];
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es Lisa, la secrétaire téléphonique virtuelle de Jean Dupont, plombier à Lyon.
Tu réponds exclusivement en français, avec un ton chaleureux, professionnel et rassurant.
Tu parles de façon naturelle et fluide, comme une vraie secrétaire — pas comme un robot.

## Ton rôle
Accueillir les clients qui appellent, comprendre leur problème de plomberie, et collecter les informations nécessaires pour que Jean puisse les rappeler ou planifier une intervention :
1. La nature du problème (fuite, chauffe-eau, robinet, WC, chauffage, urgence...)
2. Le nom complet du client
3. Son adresse (rue, ville, code postal)
4. Le niveau d'urgence

## Ton caractère
- Chaleureuse et empathique : si quelqu'un a une urgence (inondation, fuite importante), tu exprimes de la compréhension et rassures immédiatement
- Naturelle : tu utilises des formulations du quotidien, pas du jargon administratif
- Concise : tes phrases sont courtes et claires au téléphone
- Patiente : si tu ne comprends pas, tu reformules gentiment sans jamais te montrer frustrée

## Exemples de dialogues naturels

### Exemple 1 — Appel standard
Client : "Bonjour, j'ai un robinet qui fuit depuis ce matin."
Lisa : "Bonjour ! Oh je comprends, c'est vite embêtant ça. Je vais noter ça pour Jean. C'est plutôt une petite fuite ou ça coule vraiment fort ?"
Client : "Ça coule assez fort, j'ai mis un seau."
Lisa : "D'accord, on va faire le nécessaire. Vous êtes disponible dans la journée ou plutôt en fin de journée ?"

### Exemple 2 — Urgence
Client : "Allo, j'ai une fuite au niveau de ma canalisation principale, il y a de l'eau partout !"
Lisa : "Oh là, je comprends, c'est vraiment urgent ! Coupez votre vanne d'arrêt d'eau principale si vous pouvez — c'est généralement sous l'évier ou au compteur. Je préviens Jean immédiatement. Vous pouvez me donner votre adresse rapidement ?"

### Exemple 3 — Client peu loquace
Client : "Chauffe-eau."
Lisa : "Bonjour ! Votre chauffe-eau vous pose problème ? C'est une panne totale ou il chauffe moins bien qu'avant ?"

### Exemple 4 — Mauvaise compréhension / bruit
Client : "[inaudible ou brouillé]"
Lisa : "Excusez-moi, je n'ai pas bien entendu — vous pouvez répéter ? Je veux être sûre de bien noter votre problème."

### Exemple 5 — Interruption en cours de phrase
Lisa : "Je note votre adresse, vous êtes au —"
Client : "— 12 rue des Lilas !"
Lisa : "Parfait, 12 rue des Lilas, et dans quelle ville ?"

## Gestion des situations délicates
- **Bruit / incompréhension** : "Désolée, j'ai du mal à vous entendre, vous pouvez répéter ?"
- **Client qui s'emporte** : "Je comprends votre frustration, on va s'en occuper le plus vite possible."
- **Question hors sujet** (tarifs, disponibilités précises) : "Pour les tarifs et disponibilités exactes, c'est Jean qui pourra vous répondre directement — je lui transmets votre demande."
- **Silence prolongé** : "Vous êtes toujours là ?"
- **Fin d'appel** : "Très bien, j'ai bien noté tout ça. Jean vous recontactera dès que possible. Bonne journée !"

## Contraintes importantes
- Tu ne donnes jamais de tarif, ni de créneau précis — seul Jean peut s'engager là-dessus
- Tu ne fais jamais semblant d'être humaine si on te demande directement si tu es un robot — tu réponds honnêtement que tu es un assistant vocal
- Tu restes toujours dans ton rôle de secrétaire de Jean Dupont, plombier à Lyon`;

// ─── Gateway ──────────────────────────────────────────────────────────────────

@WebSocketGateway({
  namespace: '/voice',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class VoiceTestGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(VoiceTestGateway.name);
  private readonly sessions = new Map<string, SessionState>();
  private readonly openAiApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.openAiApiKey = this.configService.getOrThrow<string>('OPENAI_API_KEY');
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  handleConnection(client: Socket) {
    this.logger.log(`Client connecté : ${client.id}`);
    this.sessions.set(client.id, {
      openAiWs: null,
      isConnected: false,
      audioBuffer: [],
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client déconnecté : ${client.id}`);
    this.closeOpenAiSession(client.id);
    this.sessions.delete(client.id);
  }

  // ─── Events client → gateway ───────────────────────────────────────────────

  @SubscribeMessage('start_session')
  async handleStartSession(@ConnectedSocket() client: Socket) {
    this.logger.log(`Démarrage session OpenAI pour client ${client.id}`);
    await this.createOpenAiSession(client);
  }

  @SubscribeMessage('audio_chunk')
  handleAudioChunk(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { audio: string },
  ) {
    const session = this.sessions.get(client.id);
    if (!session?.openAiWs || session.openAiWs.readyState !== WebSocket.OPEN) {
      return;
    }

    session.openAiWs.send(
      JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: data.audio,
      }),
    );
  }

  @SubscribeMessage('stop_session')
  handleStopSession(@ConnectedSocket() client: Socket) {
    this.logger.log(`Arrêt session pour client ${client.id}`);
    this.closeOpenAiSession(client.id);
  }

  // ─── OpenAI Realtime session ───────────────────────────────────────────────

  private async createOpenAiSession(client: Socket) {
    const session = this.sessions.get(client.id);
    if (!session) return;

    const ws = new WebSocket(
      'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview',
      {
        headers: {
          Authorization: `Bearer ${this.openAiApiKey}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      },
    );

    session.openAiWs = ws;

    ws.on('open', () => {
      this.logger.log(`OpenAI WS ouvert pour client ${client.id}`);
      session.isConnected = true;

      ws.send(
        JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: SYSTEM_PROMPT,
            voice: 'shimmer',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1',
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 400,
            },
            temperature: 0.6,
            max_response_output_tokens: 1024,
          },
        }),
      );

      client.emit('session_ready', { message: 'Session vocale prête' });
    });

    ws.on('message', (rawData: WebSocket.RawData) => {
      this.handleOpenAiMessage(client, rawData);
    });

    ws.on('error', (err: Error) => {
      this.logger.error(`OpenAI WS erreur pour ${client.id}:`, err.message);
      client.emit('session_error', { message: 'Erreur de connexion vocale' });
    });

    ws.on('close', (code: number, reason: Buffer) => {
      this.logger.log(
        `OpenAI WS fermé pour ${client.id} — code: ${code}, raison: ${reason?.toString()}`,
      );
      session.isConnected = false;
      client.emit('session_ended', { message: 'Session vocale terminée' });
    });
  }

  private handleOpenAiMessage(client: Socket, rawData: WebSocket.RawData) {
    let event: Record<string, unknown>;

    try {
      event = JSON.parse(rawData.toString()) as Record<string, unknown>;
    } catch {
      this.logger.warn('Message OpenAI non-JSON reçu');
      return;
    }

    const type = event.type as string;

    switch (type) {
      case 'response.audio.delta': {
        const delta = event.delta as string | undefined;
        if (delta) {
          client.emit('audio_chunk', { audio: delta });
        }
        break;
      }

      case 'response.audio.done': {
        client.emit('audio_done');
        break;
      }

      case 'conversation.item.input_audio_transcription.completed': {
        const transcript = event.transcript as string | undefined;
        if (transcript) {
          client.emit('user_transcript', { text: transcript });
        }
        break;
      }

      case 'response.audio_transcript.delta': {
        const delta = event.delta as string | undefined;
        if (delta) {
          client.emit('assistant_transcript_delta', { text: delta });
        }
        break;
      }

      case 'response.audio_transcript.done': {
        const transcript = event.transcript as string | undefined;
        if (transcript) {
          client.emit('assistant_transcript', { text: transcript });
        }
        break;
      }

      case 'input_audio_buffer.speech_started': {
        client.emit('speech_started');
        break;
      }

      case 'input_audio_buffer.speech_stopped': {
        client.emit('speech_stopped');
        break;
      }

      case 'error': {
        const error = event.error as { message?: string } | undefined;
        this.logger.error(`Erreur OpenAI Realtime: ${error?.message ?? 'inconnue'}`);
        client.emit('session_error', { message: error?.message ?? 'Erreur OpenAI' });
        break;
      }

      default:
        break;
    }
  }

  private closeOpenAiSession(clientId: string) {
    const session = this.sessions.get(clientId);
    if (session?.openAiWs) {
      if (session.openAiWs.readyState === WebSocket.OPEN) {
        session.openAiWs.close();
      }
      session.openAiWs = null;
      session.isConnected = false;
    }
  }
}