"use client";
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Card from '@/components/Card';
import Input from '@/components/Input';
import TextArea from '@/components/TextArea';
import Button from '@/components/Button';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useRouter } from 'next/navigation';

export default function NewRequest() {
  const { token } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await (await import('@/lib/api')).api('/api/maintenance', {
        method: 'POST',
        body: { title, description, category },
        token,
      });
      router.push('/tenant/dashboard');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-lg p-6">
        <h2 className="text-2xl font-semibold text-center mb-4 text-white">Submit Maintenance Request</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Title" value={title} onChange={e => setTitle(e.target.value)} required />
          <TextArea label="Description" value={description} onChange={e => setDescription(e.target.value)} rows={4} required />
          <Input label="Category (optional)" value={category} onChange={e => setCategory(e.target.value)} />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <LoadingSpinner /> : 'Submit'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
