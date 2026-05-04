'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// ─── Config ──────────────────────────────────────────────────────────────────
const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:3001';

// ─── Types ───────────────────────────────────────────────────────────────────
interface TranscriptLine {
  role: 'user' | 'assistant';
  text: string;
  partial?: boolean;
}

type Status = 'idle' | 'connecting' | 'ready' | 'recording' | 'error';

// ─── Audio helpers ────────────────────────────────────────────────────────────

// Convertit un Float32Array (Web Audio) en PCM16 base64 pour OpenAI
function float32ToPcm16Base64(float32Array: Float32Array): string {
  const pcm16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(pcm16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Décode du PCM16 base64 en Float32Array pour la lecture audio
function pcm16Base64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const pcm16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i] / 0x8000;
  }
  return float32;
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function VoiceTestPage() {
  const [status, setStatus] = useState<Status>('idle');
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const socketRef = useRef<Socket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll du transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Lecture audio séquentielle (évite les chevauchements)
  const playNextChunk = useCallback(() => {
    if (!audioCtxRef.current || audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }
    isPlayingRef.current = true;
    const chunk = audioQueueRef.current.shift()!;
    const buffer = audioCtxRef.current.createBuffer(1, chunk.length, 24000);
    buffer.copyToChannel(chunk, 0);
    const source = audioCtxRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtxRef.current.destination);
    source.onended = playNextChunk;
    source.start();
  }, []);

  const enqueueAudio = useCallback((float32: Float32Array) => {
    audioQueueRef.current.push(float32);
    if (!isPlayingRef.current) playNextChunk();
  }, [playNextChunk]);

  // Démarrer la session
  const startSession = useCallback(async () => {
    setStatus('connecting');
    setErrorMsg('');
    setTranscript([]);

    // Contexte audio
    audioCtxRef.current = new AudioContext({ sampleRate: 24000 });

    // Connexion Socket.io au namespace /voice
    const socket = io(`${API_URL}/voice`, {
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
      const float32 = pcm16Base64ToFloat32(audio);
      enqueueAudio(float32);
    });

    socket.on('transcript_delta', ({ role, text }: { role: 'user' | 'assistant'; text: string }) => {
      setTranscript(prev => {
        const last = prev[prev.length - 1];
        if (last?.partial && last.role === role) {
          return [...prev.slice(0, -1), { role, text: last.text + text, partial: true }];
        }
        return [...prev, { role, text, partial: true }];
      });
    });

    socket.on('transcript_done', ({ role, text }: { role: 'user' | 'assistant'; text: string }) => {
      setTranscript(prev => {
        const last = prev[prev.length - 1];
        if (last?.partial && last.role === role) {
          return [...prev.slice(0, -1), { role, text }];
        }
        return [...prev, { role, text }];
      });
    });

    socket.on('session_ended', () => {
      setStatus('idle');
      stopMic();
    });

    socket.on('error', ({ message }: { message: string }) => {
      setErrorMsg(message ?? 'Erreur inconnue');
      setStatus('error');
    });

    socket.on('connect_error', (err) => {
      setErrorMsg(`Connexion impossible : ${err.message}`);
      setStatus('error');
    });
  }, [enqueueAudio]);

  // Activer le micro
  const startMic = useCallback(async () => {
    if (!audioCtxRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const source = audioCtxRef.current.createMediaStreamSource(stream);
      // ScriptProcessor déprécié mais universellement supporté
      const processor = audioCtxRef.current.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!socketRef.current?.connected) return;
        const float32 = e.inputBuffer.getChannelData(0);
        const base64 = float32ToPcm16Base64(float32);
        socketRef.current.emit('audio', { audio: base64 });
      };

      source.connect(processor);
      processor.connect(audioCtxRef.current.destination);
      setStatus('recording');
    } catch {
      setErrorMsg("Impossible d'accéder au microphone.");
      setStatus('error');
    }
  }, []);

  // Arrêter le micro
  const stopMic = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    mediaStreamRef.current = null;
    socketRef.current?.emit('stop');
    if (status === 'recording') setStatus('ready');
  }, [status]);

  // Terminer la session
  const endSession = useCallback(() => {
    stopMic();
    socketRef.current?.emit('end');
    socketRef.current?.disconnect();
    socketRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setStatus('idle');
  }, [stopMic]);

  // Cleanup au démontage
  useEffect(() => {
    return () => { endSession(); };
  }, []);

  // ─── UI ───────────────────────────────────────────────────────────────────
  const statusLabel: Record<Status, string> = {
    idle: 'Prêt',
    connecting: 'Connexion...',
    ready: 'Connecté — appuyez sur Micro pour parler',
    recording: '🔴 Enregistrement...',
    error: 'Erreur',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f0f0f',
      color: '#f0f0f0',
      fontFamily: 'system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px',
      gap: '24px',
    }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 600, margin: 0 }}>
        🎙️ Test Assistant Vocal — Lisa
      </h1>

      {/* Statut */}
      <div style={{
        fontSize: '0.9rem',
        color: status === 'error' ? '#ff6b6b' : status === 'recording' ? '#69db7c' : '#aaa',
      }}>
        {statusLabel[status]}
      </div>

      {/* Message d'erreur */}
      {errorMsg && (
        <div style={{
          background: '#2a1111',
          border: '1px solid #ff6b6b',
          borderRadius: '8px',
          padding: '10px 16px',
          fontSize: '0.85rem',
          color: '#ff6b6b',
          maxWidth: '480px',
          textAlign: 'center',
        }}>
          {errorMsg}
        </div>
      )}

      {/* Boutons */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {status === 'idle' && (
          <button onClick={startSession} style={btnStyle('#1971c2')}>
            Démarrer la session
          </button>
        )}
        {status === 'ready' && (
          <>
            <button onClick={startMic} style={btnStyle('#2f9e44')}>
              🎙️ Activer le micro
            </button>
            <button onClick={endSession} style={btnStyle('#868e96')}>
              Terminer
            </button>
          </>
        )}
        {status === 'recording' && (
          <>
            <button onClick={stopMic} style={btnStyle('#e67700')}>
              ⏹ Arrêter le micro
            </button>
            <button onClick={endSession} style={btnStyle('#868e96')}>
              Terminer
            </button>
          </>
        )}
        {status === 'error' && (
          <button onClick={() => { setStatus('idle'); setErrorMsg(''); }} style={btnStyle('#1971c2')}>
            Réessayer
          </button>
        )}
      </div>

      {/* Transcript */}
      {transcript.length > 0 && (
        <div style={{
          width: '100%',
          maxWidth: '560px',
          background: '#1a1a1a',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxHeight: '420px',
          overflowY: 'auto',
        }}>
          {transcript.map((line, i) => (
            <div key={i} style={{
              alignSelf: line.role === 'user' ? 'flex-end' : 'flex-start',
              background: line.role === 'user' ? '#1971c2' : '#2b2b2b',
              borderRadius: '10px',
              padding: '8px 12px',
              maxWidth: '80%',
              fontSize: '0.9rem',
              opacity: line.partial ? 0.6 : 1,
            }}>
              <span style={{ fontSize: '0.7rem', opacity: 0.6, display: 'block', marginBottom: '2px' }}>
                {line.role === 'user' ? 'Vous' : 'Lisa'}
              </span>
              {line.text}
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>
      )}
    </div>
  );
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg,
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '0.95rem',
    cursor: 'pointer',
    fontWeight: 500,
  };
}