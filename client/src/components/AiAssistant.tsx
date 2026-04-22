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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !token) return;
    const userMsg: Message = { role: 'user', text: question.trim() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setQuestion('');
    try {
      const resp = await api('/api/ai/faq', {
        method: 'POST',
        body: { question: userMsg.text },
        token,
      });
      const assistantMsg: Message = { role: 'assistant', text: resp.answer };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errMsg: Message = { role: 'assistant', text: err.message || 'Error' };
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
