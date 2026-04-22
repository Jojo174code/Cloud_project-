"use client";
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Card from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function RegisterPage() {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'TENANT' | 'MANAGER'>('TENANT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await register({ full_name: fullName, email, password, role });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md p-6">
        <h2 className="text-2xl font-semibold text-center mb-4 text-white">Create Account</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Full name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
          />
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <div className="flex items-center space-x-4">
            <label className="text-gray-300">
              <input
                type="radio"
                name="role"
                value="TENANT"
                checked={role === 'TENANT'}
                onChange={() => setRole('TENANT')}
                className="mr-1"
              />
              Tenant
            </label>
            <label className="text-gray-300">
              <input
                type="radio"
                name="role"
                value="MANAGER"
                checked={role === 'MANAGER'}
                onChange={() => setRole('MANAGER')}
                className="mr-1"
              />
              Manager
            </label>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <LoadingSpinner /> : 'Register'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
