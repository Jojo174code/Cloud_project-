"use client";
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Card from '@/components/Card';
import OverviewCard from '@/components/OverviewCard';
import Table from '@/components/Table';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import LoadingSpinner from '@/components/LoadingSpinner';
import Link from 'next/link';

type Request = {
  id: string;
  tenant: { full_name: string };
  title: string;
  status: string;
  ai_priority?: string;
  ai_escalated?: boolean;
  created_at: string;
};

export default function ManagerDashboard() {
  const { token, logout } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      try {
        const data = await import('@/lib/api').then(m => m.api('/api/maintenance', { token }));
        setRequests(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const columns = [
    { header: 'ID', render: (r: Request) => r.id.slice(0, 8) },
    { header: 'Tenant', render: (r: Request) => r.tenant?.full_name ?? '—' },
    { header: 'Title', render: (r: Request) => r.title },
    {
      header: 'Priority',
      render: (r: Request) => (
        <Badge
          label={r.ai_priority ?? 'low'}
          variant={
            r.ai_priority === 'emergency'
              ? 'emergency'
              : r.ai_priority === 'high'
              ? 'high'
              : r.ai_priority === 'medium'
              ? 'medium'
              : 'low'
          }
        />
      ),
    },
    {
      header: 'Escalated',
      render: (r: Request) => (r.ai_escalated ? <span className="text-red-400 animate-pulse">🔥</span> : ''),
    },
    { header: 'Status', render: (r: Request) => r.status },
    { header: 'Created', render: (r: Request) => new Date(r.created_at).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Manager Dashboard</h1>
        <Button variant="secondary" onClick={logout}>Logout</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <OverviewCard title="Open" value={requests.filter(r => r.status === 'OPEN').length} />
        <OverviewCard title="In Progress" value={requests.filter(r => r.status === 'IN_PROGRESS').length} />
        <OverviewCard title="Resolved" value={requests.filter(r => r.status === 'RESOLVED').length} />
        <OverviewCard title="Escalated" value={requests.filter(r => r.ai_escalated).length} />
      </div>
      <Card className="overflow-x-auto">
        <h2 className="text-xl font-semibold mb-2 text-white">All Requests</h2>
        {loading ? <LoadingSpinner /> : <Table data={requests} columns={columns} />}
      </Card>
    </div>
  );
}
