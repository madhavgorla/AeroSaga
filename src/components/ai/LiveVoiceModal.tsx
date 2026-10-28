import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Mic, MicOff, Radio, Volume2, ShieldAlert, Sparkles, X } from 'lucide-react';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({ isOpen, onClose }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [modelTalking, setModelTalking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const startLiveSession = async () => {
    setErrorMsg(null);
    try {
      // 1. Setup AudioContext for input and output
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioCtx({ sampleRate: 16000 });
      const outputCtx = new AudioCtx({ sampleRate: 24000 });

      inputContextRef.current = inputCtx;
      audioContextRef.current = outputCtx;

      // 2. Request mic access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // 3. Connect WebSocket to server
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live-ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.error) {
            setErrorMsg(msg.error);
            return;
          }

          if (msg.interrupted) {
            setModelTalking(false);
            return;
          }

          if (msg.audio) {
            setModelTalking(true);
            playAudioChunk(outputCtx, msg.audio);
          }
        } catch (err) {
          console.error('Error handling WebSocket message:', err);
        }
      };

      ws.onerror = (e) => {
        console.error('Live WebSocket error:', e);
        setErrorMsg('Live audio connection failed.');
      };

      ws.onclose = () => {
        setIsConnected(false);
        setModelTalking(false);
      };

      // 4. Capture microphone and send PCM to server
      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(inputCtx.destination);

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const base64PCM = floatTo16BitPCMBase64(inputData);
          ws.send(JSON.stringify({ audio: base64PCM }));
          setIsTalking(true);
        }
      };
    } catch (err: any) {
      console.error('Live voice error:', err);
      setErrorMsg(err?.message || 'Could not access microphone or connect to Gemini Live.');
    }
  };

  const stopLiveSession = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsConnected(false);
    setIsTalking(false);
    setModelTalking(false);
  };

  useEffect(() => {
    return () => {
      stopLiveSession();
    };
  }, []);

  // Convert Float32 to 16-bit linear PCM base64
  const floatTo16BitPCMBase64 = (float32Array: Float32Array): string => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Play PCM audio chunk via Web Audio API
  const playAudioChunk = (ctx: AudioContext, base64Data: string) => {
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.start();

    source.onended = () => {
      setModelTalking(false);
    };
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        stopLiveSession();
        onClose();
      }}
      title="AeroSaga Voice Radio Channel"
      subtitle="Real-time two-way voice communications powered by Gemini 3.8 Live API"
    >
      <div className="space-y-6 text-center py-4">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-800 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Radio Airspace Visualizer */}
        <div className="relative w-40 h-40 mx-auto rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
          {isConnected && (
            <div
              className={`absolute inset-0 rounded-full border-2 transition-all ${
                modelTalking
                  ? 'border-sky-400 scale-110 animate-pulse'
                  : isTalking
                  ? 'border-emerald-400 scale-105'
                  : 'border-slate-700'
              }`}
            />
          )}

          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
              modelTalking
                ? 'bg-sky-500/20 text-sky-400 shadow-xl shadow-sky-950'
                : isTalking
                ? 'bg-emerald-500/20 text-emerald-400 shadow-xl shadow-emerald-950'
                : 'bg-slate-800 text-slate-500'
            }`}
          >
            {modelTalking ? (
              <Volume2 className="w-10 h-10 animate-bounce" />
            ) : isConnected ? (
              <Mic className="w-10 h-10" />
            ) : (
              <MicOff className="w-10 h-10" />
            )}
          </div>
        </div>

        {/* Status text */}
        <div>
          <div className="text-sm font-bold text-slate-200">
            {!isConnected
              ? 'Radio Channel Offline'
              : modelTalking
              ? 'AeroSaga Copilot Transmitting...'
              : 'Listening on Mission Frequency (124.85 MHz)'}
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {!isConnected
              ? 'Click Connect to open an instantaneous voice session with Gemini Live.'
              : 'Speak normally. Ask for waypoint recommendations, emergency abort procedures, or drone status.'}
          </p>
        </div>

        {/* Connect / Disconnect Buttons */}
        <div className="pt-2 flex justify-center gap-3">
          {!isConnected ? (
            <button
              onClick={startLiveSession}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 shadow-lg shadow-sky-950 transition-colors"
            >
              <Radio className="w-4 h-4" />
              <span>Connect Live Radio</span>
            </button>
          ) : (
            <button
              onClick={stopLiveSession}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-950 transition-colors"
            >
              <MicOff className="w-4 h-4" />
              <span>Disconnect Channel</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
