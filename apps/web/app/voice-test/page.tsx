// apps/web/app/voice-test/page.tsx

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TranscriptLine {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

type SessionState = 'idle' | 'connecting' | 'ready' | 'error';

// ─── Constantes ───────────────────────────────────────────────────────────────

const API_URL: string =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const SAMPLE_RATE = 24000;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VoiceTestPage() {
  // Socket & état session
  const socketRef = useRef<Socket | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>('idle');

  // Audio — enregistrement
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);

  // Audio — lecture (UN SEUL AudioContext pour toute la session)
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef<boolean>(false);
  const nextPlayTimeRef = useRef<number>(0);

  // Transcription & indicateurs
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [userSpeaking, setUserSpeaking] = useState<boolean>(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // ─── Scroll auto transcript ─────────────────────────────────────────────────

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // ─── AudioContext unique ────────────────────────────────────────────────────

  const ensureAudioContext = useCallback((): AudioContext => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
      nextPlayTimeRef.current = 0;
    }
    if (audioContextRef.current.state === 'suspended') {
      void audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // ─── Scheduling audio (sans recréer l'AudioContext) ────────────────────────

  const scheduleAudioChunk = useCallback(
    (audioContext: AudioContext, pcm16Buffer: ArrayBuffer): void => {
      const int16Array = new Int16Array(pcm16Buffer);
      const float32Array = new Float32Array(int16Array.length);

      for (let i = 0; i < int16Array.length; i++) {
        const sample = int16Array[i];
        float32Array[i] = sample < 0 ? sample / 32768.0 : sample / 32767.0;
      }

      const audioBuffer = audioContext.createBuffer(
        1,
        float32Array.length,
        SAMPLE_RATE,
      );
      audioBuffer.copyToChannel(float32Array, 0);

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      const currentTime: number = audioContext.currentTime;
      const startTime: number = Math.max(currentTime, nextPlayTimeRef.current);
      source.start(startTime);
      nextPlayTimeRef.current = startTime + audioBuffer.duration;

      setIsSpeaking(true);
      source.onended = () => {
        if (nextPlayTimeRef.current <= audioContext.currentTime + 0.05) {
          setIsSpeaking(false);
        }
      };
    },
    [],
  );

  const processAudioQueue = useCallback((): void => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    isPlayingRef.current = true;

    const audioContext = ensureAudioContext();

    while (audioQueueRef.current.length > 0) {
      const chunk = audioQueueRef.current.shift();
      if (chunk) {
        scheduleAudioChunk(audioContext, chunk);
      }
    }

    isPlayingRef.current = false;
  }, [ensureAudioContext, scheduleAudioChunk]);

  // ─── Connexion Socket.io ────────────────────────────────────────────────────

  const connectSocket = useCallback((): void => {
    if (socketRef.current?.connected) return;

    setSessionState('connecting');

    const socket: Socket = io(`${API_URL}/voice`, {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      socket.emit('start_session');
    });

    socket.on('session_ready', () => {
      setSessionState('ready');
    });

    socket.on('session_error', (data: { message: string }) => {
      console.error('Session error:', data.message);
      setSessionState('error');
    });

    socket.on('session_ended', () => {
      setSessionState('idle');
    });

    socket.on('audio_chunk', (data: { audio: string }) => {
      const binaryString: string = atob(data.audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      audioQueueRef.current.push(bytes.buffer);
      processAudioQueue();
    });

    socket.on('audio_done', () => {
      // queue se vide naturellement
    });

    socket.on('speech_started', () => {
      setUserSpeaking(true);
      // Interrompre Lisa proprement
      if (audioContextRef.current) {
        audioQueueRef.current = [];
        nextPlayTimeRef.current = audioContextRef.current.currentTime;
      }
    });

    socket.on('speech_stopped', () => {
      setUserSpeaking(false);
    });

    socket.on('user_transcript', (data: { text: string }) => {
      setTranscript((prev) => [
        ...prev,
        { role: 'user', text: data.text, timestamp: new Date() },
      ]);
    });

    socket.on('assistant_transcript', (data: { text: string }) => {
      setTranscript((prev) => [
        ...prev,
        { role: 'assistant', text: data.text, timestamp: new Date() },
      ]);
    });

    socket.on('disconnect', () => {
      setSessionState('idle');
      setIsRecording(false);
      setIsSpeaking(false);
    });

    socketRef.current = socket;
  }, [processAudioQueue]);

  // ─── Microphone ─────────────────────────────────────────────────────────────

  const startRecording = useCallback(async (): Promise<void> => {
    ensureAudioContext(); // débloquer l'AudioContext de lecture via geste utilisateur

    try {
      const stream: MediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      // AudioContext dédié à la CAPTURE (séparé de celui de la lecture)
      const captureCtx = new AudioContext({ sampleRate: 16000 });
      const source = captureCtx.createMediaStreamSource(stream);
      const processor = captureCtx.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        const inputData: Float32Array = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 32768 : s * 32767;
        }
        let binary = '';
        const bytes = new Uint8Array(pcm16.buffer);
        bytes.forEach((b) => { binary += String.fromCharCode(b); });
        const base64: string = btoa(binary);
        socketRef.current?.emit('audio_chunk', { audio: base64 });
      };

      source.connect(processor);
      processor.connect(captureCtx.destination);

      // Stocker le captureCtx pour le fermer proprement au stopRecording
      (stream as MediaStream & { _captureCtx?: AudioContext })._captureCtx = captureCtx;

      setIsRecording(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Erreur d'accès au microphone:", message);
    }
  }, [ensureAudioContext]);

  const stopRecording = useCallback((): void => {
    if (mediaStreamRef.current) {
      const stream = mediaStreamRef.current as MediaStream & {
        _captureCtx?: AudioContext;
      };
      stream.getTracks().forEach((track) => track.stop());
      void stream._captureCtx?.close();
      mediaStreamRef.current = null;
    }
    setIsRecording(false);
  }, []);

  // ─── Déconnexion ────────────────────────────────────────────────────────────

  const disconnect = useCallback((): void => {
    stopRecording();
    socketRef.current?.emit('stop_session');
    socketRef.current?.disconnect();
    socketRef.current = null;

    void audioContextRef.current?.close();
    audioContextRef.current = null;
    audioQueueRef.current = [];
    nextPlayTimeRef.current = 0;

    setSessionState('idle');
    setIsSpeaking(false);
    setUserSpeaking(false);
  }, [stopRecording]);

  // ─── Cleanup au démontage ───────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // ─── Rendu ──────────────────────────────────────────────────────────────────

  const stateLabels: Record<SessionState, string> = {
    idle: 'Déconnecté',
    connecting: 'Connexion...',
    ready: 'Prêt',
    error: 'Erreur',
  };

  const stateColors: Record<SessionState, string> = {
    idle: 'bg-gray-400',
    connecting: 'bg-yellow-400 animate-pulse',
    ready: 'bg-green-500',
    error: 'bg-red-500',
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start p-6">
      <div className="w-full max-w-2xl space-y-6">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800">🔧 Lisa — Assistante vocale</h1>
          <p className="text-gray-500 mt-1">Secrétaire de Jean Dupont, plombier à Lyon</p>
        </div>

        {/* Statut */}
        <div className="bg-white rounded-2xl shadow p-4 flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${stateColors[sessionState]}`} />
          <span className="text-sm font-medium text-gray-700">
            {stateLabels[sessionState]}
          </span>
          {isSpeaking && (
            <span className="ml-auto text-sm text-blue-500 animate-pulse">
              🔊 Lisa parle...
            </span>
          )}
          {userSpeaking && !isSpeaking && (
            <span className="ml-auto text-sm text-green-500 animate-pulse">
              🎤 Vous parlez...
            </span>
          )}
        </div>

        {/* Contrôles */}
        <div className="flex gap-3 justify-center flex-wrap">
          {(sessionState === 'idle' || sessionState === 'error') && (
            <button
              onClick={connectSocket}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
            >
              📞 Démarrer la session
            </button>
          )}
          {sessionState === 'ready' && (
            <>
              {!isRecording ? (
                <button
                  onClick={() => { void startRecording(); }}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors"
                >
                  🎤 Parler à Lisa
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors"
                >
                  ⏹ Arrêter le micro
                </button>
              )}
              <button
                onClick={disconnect}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
              >
                📴 Terminer
              </button>
            </>
          )}
        </div>

        {/* Transcript */}
        <div className="bg-white rounded-2xl shadow p-4 h-96 overflow-y-auto flex flex-col gap-3">
          {transcript.length === 0 ? (
            <p className="text-gray-400 text-sm text-center my-auto">
              Le transcript de la conversation apparaîtra ici...
            </p>
          ) : (
            transcript.map((line, i) => (
              <div
                key={i}
                className={`flex ${line.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
                    line.role === 'user'
                      ? 'bg-blue-100 text-blue-900 rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  <p className="font-medium text-xs mb-1 opacity-60">
                    {line.role === 'user' ? 'Vous' : 'Lisa'}
                  </p>
                  {line.text}
                </div>
              </div>
            ))
          )}
          <div ref={transcriptEndRef} />
        </div>

        {/* Note technique */}
        <p className="text-center text-xs text-gray-400">
          Voix : shimmer · VAD server_vad · PCM16 24kHz · OpenAI Realtime API
        </p>
      </div>
    </div>
  );
}