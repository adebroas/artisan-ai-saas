'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface TranscriptLine {
  role: 'user' | 'assistant';
  text: string;
  id: string;
}

type SessionStatus = 'idle' | 'connecting' | 'ready' | 'recording' | 'ended';

export default function VoiceTestPage() {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [currentDelta, setCurrentDelta] = useState('');
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, currentDelta]);

  // Connexion WebSocket
  const connect = useCallback(() => {
    setStatus('connecting');
    setError(null);
    setTranscript([]);

    // ← CHANGEMENT : URL dynamique via variable d'environnement
    const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api').replace('/api', '');
    const socket = io(`${apiUrl}/voice`, {
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('start');
    });

    socket.on('ready', () => {
      setStatus('ready');
    });

    socket.on('audio', ({ audio }: { audio: string }) => {
      playAudio(audio);
    });

    socket.on('transcript_delta', ({ text }: { text: string }) => {
      setCurrentDelta(prev => prev + text);
    });

    socket.on('transcript_done', ({ role, text }: { role: 'user' | 'assistant'; text: string }) => {
      setCurrentDelta('');
      setTranscript(prev => [
        ...prev,
        { role, text, id: `${Date.now()}-${Math.random()}` },
      ]);
    });

    socket.on('error', ({ message }: { message: string }) => {
      setError(message);
    });

    socket.on('session_ended', () => {
      setStatus('ended');
      stopMic();
    });

    socket.on('disconnect', () => {
      setStatus('idle');
      stopMic();
    });
  }, []);

  // Démarrage du micro
  const startMic = useCallback(async () => {
    if (status !== 'ready') return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = float32ToPcm16(inputData);
        const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
        socketRef.current?.emit('audio', { audio: base64 });
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setStatus('recording');
    } catch (err) {
      setError("Impossible d'accéder au micro. Vérifiez les permissions.");
    }
  }, [status]);

  // Arrêt du micro
  const stopMic = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;

    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    audioContextRef.current?.close();
    audioContextRef.current = null;

    socketRef.current?.emit('stop');
    if (status === 'recording') setStatus('ready');
  }, [status]);

  // Lecture audio PCM16
  const playAudio = useCallback((base64: string) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768;
    }

    audioQueueRef.current.push(float32);
    if (!isPlayingRef.current) processAudioQueue();
  }, []);

  const processAudioQueue = useCallback(() => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const chunk = audioQueueRef.current.shift()!;

    const ctx = new AudioContext({ sampleRate: 24000 });
    const buffer = ctx.createBuffer(1, chunk.length, 24000);
    buffer.getChannelData(0).set(chunk);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = processAudioQueue;
    source.start();
  }, []);

  // Déconnexion
  const disconnect = useCallback(() => {
    stopMic();
    socketRef.current?.emit('end');
    socketRef.current?.disconnect();
    socketRef.current = null;
    setStatus('idle');
    setTranscript([]);
    setCurrentDelta('');
  }, [stopMic]);

  // Conversion Float32 → PCM16
  function float32ToPcm16(float32: Float32Array): Int16Array {
    const pcm16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm16;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl flex flex-col gap-6">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">Test vocal IA</h1>
          <p className="text-gray-400 text-sm mt-1">
            Parlez directement avec l&apos;assistant artisan
          </p>
        </div>

        {/* Status */}
        <div className="flex items-center justify-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            status === 'recording' ? 'bg-red-500 animate-pulse' :
            status === 'ready' ? 'bg-green-500' :
            status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            'bg-gray-500'
          }`} />
          <span className="text-sm text-gray-300">
            {status === 'idle' && 'Prêt à démarrer'}
            {status === 'connecting' && 'Connexion...'}
            {status === 'ready' && 'Connecté — cliquez sur le micro pour parler'}
            {status === 'recording' && "En cours d'enregistrement..."}
            {status === 'ended' && 'Session terminée'}
          </span>
        </div>

        {/* Transcript */}
        <div className="bg-gray-900 rounded-xl p-4 h-80 overflow-y-auto flex flex-col gap-3">
          {transcript.length === 0 && status === 'idle' && (
            <p className="text-gray-500 text-sm text-center mt-8">
              Démarrez une session pour commencer
            </p>
          )}

          {transcript.map((line) => (
            <div
              key={line.id}
              className={`flex ${line.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
                line.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-100'
              }`}>
                <p className="text-xs font-medium mb-1 opacity-70">
                  {line.role === 'user' ? 'Vous' : 'Assistant'}
                </p>
                {line.text}
              </div>
            </div>
          ))}

          {/* Delta en cours */}
          {currentDelta && (
            <div className="flex justify-start">
              <div className="max-w-xs px-4 py-2 rounded-2xl text-sm bg-gray-700 text-gray-100">
                <p className="text-xs font-medium mb-1 opacity-70">Assistant</p>
                {currentDelta}
                <span className="animate-pulse">▋</span>
              </div>
            </div>
          )}

          <div ref={transcriptEndRef} />
        </div>

        {/* Erreur */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Contrôles */}
        <div className="flex gap-3 justify-center">
          {status === 'idle' || status === 'ended' ? (
            <button
              onClick={connect}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium transition-colors"
            >
              Démarrer une session
            </button>
          ) : (
            <>
              {status === 'ready' && (
                <button
                  onClick={startMic}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-xl font-medium transition-colors flex items-center gap-2"
                >
                  🎤 Parler
                </button>
              )}

              {status === 'recording' && (
                <button
                  onClick={stopMic}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-xl font-medium transition-colors flex items-center gap-2 animate-pulse"
                >
                  ⏹ Stop
                </button>
              )}

              <button
                onClick={disconnect}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-medium transition-colors"
              >
                Terminer
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}