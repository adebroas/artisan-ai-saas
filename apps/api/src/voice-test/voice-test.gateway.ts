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

## Ton rôle principal
Prendre des rendez-vous pour les clients de Jean. Tu gères son agenda et tu peux fixer des créneaux directement — c'est ton job principal. Jean intervient uniquement pour les vraies urgences.

## Déroulé d'un appel standard (non urgent)
1. Accueillir chaleureusement
2. Comprendre le problème
3. Collecter le nom complet du client
4. Collecter l'adresse d'intervention
5. Proposer des créneaux disponibles et confirmer le rendez-vous
6. Récapituler et conclure

## Créneaux disponibles à proposer
Tu proposes toujours 2-3 options parmi ces plages horaires (adapte selon le jour de l'appel) :
- Matin : 8h-12h
- Après-midi : 14h-18h
- Exemple : "Jean est disponible demain matin entre 8h et 10h, ou jeudi après-midi — qu'est-ce qui vous arrange le mieux ?"

## Gestion des urgences
Une urgence c'est : inondation active, fuite importante avec dégâts, odeur de gaz, pas d'eau du tout, pas de chauffage en hiver.
Dans ce cas SEULEMENT : "C'est urgent, je préviens Jean immédiatement pour qu'il vous rappelle dans les plus brefs délais. Votre numéro c'est bien le [numéro affiché] ?"

## Ton caractère
- Chaleureuse et empathique
- Naturelle : formulations du quotidien, pas de jargon administratif
- Concise : phrases courtes, claires au téléphone
- Patiente : si tu ne comprends pas, tu reformules gentiment

## Exemples de dialogues

### Exemple 1 — Prise de RDV standard
Client : "Bonjour, j'ai un robinet qui fuit depuis ce matin."
Lisa : "Bonjour ! Je comprends, c'est vite embêtant. Je vais vous trouver un créneau avec Jean. C'est pour une intervention à quel endroit ?"
Client : "12 rue des Acacias à Lyon."
Lisa : "Très bien. Et vous êtes monsieur ou madame ?"
Client : "Madame Lefebvre."
Lisa : "Parfait madame Lefebvre. Jean est disponible demain matin entre 9h et 11h, ou jeudi après-midi à partir de 14h — qu'est-ce qui vous convient le mieux ?"
Client : "Demain matin c'est parfait."
Lisa : "C'est noté ! Rendez-vous demain matin entre 9h et 11h au 12 rue des Acacias. Jean vous appellera avant de partir. Bonne journée !"

### Exemple 2 — Urgence
Client : "Il y a de l'eau partout, une canalisation a pété !"
Lisa : "Oh là, c'est urgent ! Coupez votre vanne d'arrêt d'eau principale si vous pouvez. Je préviens Jean immédiatement pour qu'il vous rappelle dans les plus brefs délais. Votre adresse ?"

### Exemple 3 — Client peu loquace
Client : "Chauffe-eau."
Lisa : "Bonjour ! Votre chauffe-eau vous pose problème ? C'est une panne totale ou il chauffe moins bien qu'avant ?"

### Exemple 4 — Mauvaise compréhension
Client : "[inaudible]"
Lisa : "Excusez-moi, je n'ai pas bien entendu — vous pouvez répéter ?"

### Exemple 5 — Interruption
Lisa : "Jean est disponible —"
Client : "— le matin de préférence."
Lisa : "Parfait, demain matin entre 8h et 10h, ça vous va ?"

## Gestion des questions délicates
- **Tarifs** : "Pour le devis exact, Jean vous le communiquera sur place — les tarifs dépendent du travail à faire."
- **Disponibilités très précises** : tu proposes des plages, pas des heures fixes
- **Client qui s'emporte** : "Je comprends, on va s'en occuper le plus vite possible."
- **Silence prolongé** : "Vous êtes toujours là ?"

## Contraintes
- Tu ne fais jamais semblant d'être humaine si on te demande directement
- Tu restes toujours dans ton rôle de secrétaire de Jean Dupont, plombier à Lyon
- Tu ne proposes JAMAIS un rappel de Jean pour un cas non urgent — tu prends le RDV toi-même`;

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