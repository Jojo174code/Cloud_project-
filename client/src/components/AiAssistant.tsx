"use client";

import { useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import Button from '@/components/Button';
import LeasePilotMark from '@/components/LeasePilotMark';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

const QUICK_PROMPTS = [
  'When is rent due?',
  'How do I submit maintenance?',
  'What counts as an emergency?',
  'How do I contact my manager?',
];

const ThinkingDots = () => (
  <div className="flex items-center gap-1 px-1 py-1">
    <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-200 [animation-delay:-0.25s]" />
    <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-200 [animation-delay:-0.125s]" />
    <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-200" />
  </div>
);

export default function AiAssistant() {
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Hi, I’m LeasePilot AI. Ask me about rent, maintenance requests, emergencies, or contacting your manager.',
    },
  ]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const canSend = useMemo(() => !!question.trim() && !loading, [question, loading]);

  const sendQuestion = async (rawQuestion: string) => {
    const trimmed = rawQuestion.trim();
    if (!trimmed) return;

    setError(null);

    if (!token) {
      setError('You need to log in again before using LeasePilot AI.');
      return;
    }

    const userMsg: Message = { role: 'user', text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setQuestion('');

    try {
      const resp = await api<{ answer: string }>('/api/ai/faq', {
        method: 'POST',
        body: { question: trimmed },
        token,
      });
      const assistantMsg: Message = { role: 'assistant', text: resp.answer };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const message = err.message || 'Unable to send question right now.';
      setError(message);
      const assistantMsg: Message = {
        role: 'assistant',
        text: 'I hit a problem while responding. Please try again in a moment, or submit a maintenance request if the issue is urgent.',
      };
      setMessages(prev => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendQuestion(question);
  };

  return (
    <section className="w-full max-w-none">
      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-950/90 via-slate-900/85 to-slate-950/90 shadow-[0_18px_60px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        <div className="border-b border-white/10 bg-white/5 px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <LeasePilotMark compact className="shrink-0" />
              <div>
                <h2 className="text-xl font-semibold text-white">LeasePilot AI</h2>
                <p className="text-sm text-slate-300">
                  Ask about rent, maintenance, emergencies, or contacting your manager
                </p>
              </div>
            </div>
            <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-100">
              Resident support assistant
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {QUICK_PROMPTS.map(prompt => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendQuestion(prompt)}
                disabled={loading || !token}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-4 sm:px-6">
          <div className="max-h-[28rem] space-y-4 overflow-y-auto rounded-[24px] border border-white/10 bg-black/20 p-4 sm:p-5">
            {messages.map((message, index) => {
              const isAssistant = message.role === 'assistant';
              return (
                <div key={`${message.role}-${index}`} className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[88%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-lg ring-1 ${
                      isAssistant
                        ? 'bg-white/10 text-slate-100 ring-white/10'
                        : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white ring-cyan-300/30'
                    }`}
                  >
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/65">
                      {isAssistant ? 'LeasePilot AI' : 'You'}
                    </div>
                    <p className="whitespace-pre-wrap">{message.text}</p>
                  </div>
                </div>
              );
            })}

            {loading ? (
              <div className="flex justify-start">
                <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50 shadow-lg">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100/70">
                    LeasePilot AI
                  </div>
                  <div className="flex items-center gap-3">
                    <ThinkingDots />
                    <span className="text-cyan-100/85">Thinking...</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {!token ? (
            <div className="mt-4 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-100">
              Log in to use LeasePilot AI.
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSend} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="leasepilot-ai-input" className="mb-2 block text-sm font-medium text-slate-300">
                Ask LeasePilot AI
              </label>
              <input
                id="leasepilot-ai-input"
                ref={inputRef}
                placeholder="Ask about rent, maintenance, emergencies, or management contact"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                disabled={loading}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
            <Button
              type="submit"
              disabled={!canSend}
              className="h-[50px] rounded-2xl px-6 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Sending...' : 'Send'}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
