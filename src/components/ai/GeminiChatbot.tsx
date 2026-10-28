import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Search,
  Bot,
  User,
  ExternalLink,
  RefreshCw,
  X,
  ChevronDown,
  Layers,
  Zap,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  grounding?: {
    queries?: string[];
    sources?: { title: string; url: string }[];
  };
  modelUsed?: string;
}

interface GeminiChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenVoiceMode: () => void;
}

export const GeminiChatbot: React.FC<GeminiChatbotProps> = ({
  isOpen,
  onClose,
  onOpenVoiceMode,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      text: 'Greetings Flight Controller. I am your AeroSaga Copilot. I can assist with flight corridor optimization, weather risk assessment via Google Search grounding, and Temporal durable workflow state analysis. How can I help your mission operations today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [modelChoice, setModelChoice] = useState<'gemini-3.5-flash' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite'>('gemini-3.5-flash');
  const [useSearchGrounding, setUseSearchGrounding] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            text: m.text,
          })),
          modelChoice,
          useSearch: useSearchGrounding,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-reply`,
        role: 'assistant',
        text: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        grounding: data.grounding,
        modelUsed: data.model,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-err`,
          role: 'assistant',
          text: `⚠️ Error generating response: ${err.message || 'Please check your GEMINI_API_KEY.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    'Analyze flight safety for Warehouse B route',
    'How does Temporal workflow pause on offline signal?',
    'Current drone wind speed limits and airspace rules',
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-[#090f1f] border-l border-slate-800 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-[#070c18] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>AeroSaga AI Copilot</span>
              <span className="text-[10px] font-mono-numbers px-1.5 py-0.5 rounded bg-sky-950 border border-sky-800 text-sky-300">
                {modelChoice}
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">
              Autonomous Operations & Airspace Advisor
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenVoiceMode}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-sky-300 bg-sky-950/80 border border-sky-800/80 hover:bg-sky-900 rounded-lg transition-colors"
            title="Open Live Voice Audio Radio"
          >
            <span>Live Radio</span>
          </button>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Control Bar: Model Switcher & Search Grounding Toggle */}
      <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Model Switcher */}
        <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 font-mono-numbers text-[11px]">
          <button
            onClick={() => setModelChoice('gemini-3.5-flash')}
            className={`px-2 py-0.5 rounded transition-colors ${
              modelChoice === 'gemini-3.5-flash'
                ? 'bg-sky-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="General tasks with Google Search grounding"
          >
            3.5 Flash
          </button>
          <button
            onClick={() => setModelChoice('gemini-3.1-pro-preview')}
            className={`px-2 py-0.5 rounded transition-colors ${
              modelChoice === 'gemini-3.1-pro-preview'
                ? 'bg-purple-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Complex reasoning & route calculations"
          >
            3.1 Pro
          </button>
          <button
            onClick={() => setModelChoice('gemini-3.1-flash-lite')}
            className={`px-2 py-0.5 rounded transition-colors ${
              modelChoice === 'gemini-3.1-flash-lite'
                ? 'bg-cyan-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Fast telemetry Q&A"
          >
            Flash Lite
          </button>
        </div>

        {/* Google Search Grounding toggle */}
        <button
          onClick={() => setUseSearchGrounding(!useSearchGrounding)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
            useSearchGrounding
              ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
              : 'bg-slate-900 border-slate-800 text-slate-500'
          }`}
          title="Enable real-time Google Search grounding"
        >
          <Search className="w-3 h-3" />
          <span>Google Search {useSearchGrounding ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs ${
                  isUser
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800 border border-slate-700 text-sky-400'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[82%] rounded-xl p-3 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-sky-600 text-white rounded-tr-none'
                    : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>

                {/* Grounding Sources */}
                {m.grounding?.sources && m.grounding.sources.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800">
                    <span className="text-[10px] text-slate-400 font-semibold block mb-1 flex items-center gap-1">
                      <Search className="w-3 h-3 text-emerald-400" />
                      <span>Search Grounding Sources:</span>
                    </span>
                    <div className="space-y-1">
                      {m.grounding.sources.slice(0, 3).map((src, i) => (
                        <a
                          key={i}
                          href={src.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="flex items-center gap-1 text-[10px] text-sky-400 hover:underline truncate"
                        >
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{src.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  className={`mt-1.5 text-[9px] font-mono-numbers text-right ${
                    isUser ? 'text-sky-200' : 'text-slate-500'
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-sky-400 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 italic">
              Analyzing flight vectors with {modelChoice}...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Queries */}
      <div className="px-4 py-2 border-t border-slate-800/80 bg-[#070c18] overflow-x-auto flex gap-2">
        {quickPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => setInputText(prompt)}
            className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-[#080d1a] flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask copilot about routes, weather, or Temporal recovery..."
          className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !inputText.trim()}
          className="p-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-lg transition-colors flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
