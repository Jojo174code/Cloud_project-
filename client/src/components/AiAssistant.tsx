"use client";
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import Card from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export default function AiAssistant() {
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!question.trim()) return;

    if (!token) {
      setError('You need to log in again before using the AI assistant.');
      return;
    }

    const userMsg: Message = { role: 'user', text: question.trim() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setQuestion('');
    try {
      const resp = await api<{ answer: string }>('/api/ai/faq', {
        method: 'POST',
        body: { question: userMsg.text },
        token,
      });
      const assistantMsg: Message = { role: 'assistant', text: resp.answer };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const message = err.message || 'Unable to send question right now.';
      setError(message);
      const errMsg: Message = { role: 'assistant', text: message };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-6 p-4">
      <h2 className="text-xl font-semibold mb-2 text-white">AI Assistant</h2>
      <div className="max-h-64 overflow-y-auto mb-4 space-y-2">
        {messages.map((m, i) => (
          <div key={i} className={`text-sm ${m.role === 'assistant' ? 'text-primary-300' : 'text-gray-200'}`}>
            <span className="font-medium">{m.role === 'assistant' ? 'Assistant' : 'You'}:</span> {m.text}
          </div>
        ))}
      </div>
      {!token && <p className="mb-3 text-sm text-yellow-300">Log in to use the AI assistant.</p>}
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
      <form onSubmit={handleSend} className="flex gap-2 items-center">
        <Input
          placeholder="Ask a question..."
          value={question}
          onChange={e => setQuestion(e.target.value)}
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !question.trim()} className="flex-shrink-0">
          {loading ? <LoadingSpinner /> : 'Send'}
        </Button>
      </form>
    </Card>
  );
}
