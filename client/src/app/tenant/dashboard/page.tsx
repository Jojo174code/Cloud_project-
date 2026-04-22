"use client";
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Card from '@/components/Card';
import OverviewCard from '@/components/OverviewCard';
import Table from '@/components/Table';
import Button from '@/components/Button';
import LoadingSpinner from '@/components/LoadingSpinner';
import Link from 'next/link';

type Request = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  ai_priority?: string;
  ai_escalated?: boolean;
};

export default function TenantDashboard() {
  const { token, logout } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const fetch = async () => {
      try {
        const data = await (await import('@/lib/api')).api('/api/maintenance', { token });
        setRequests(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [token]);

  const columns = [
    { header: 'ID', render: (r: Request) => r.id.slice(0, 8) },
    { header: 'Title', render: (r: Request) => r.title },
    { header: 'Status', render: (r: Request) => r.status },
    { header: 'Created', render: (r: Request) => new Date(r.created_at).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Tenant Dashboard</h1>
        <Button variant="secondary" onClick={logout}>Logout</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <OverviewCard title="Open Requests" value={requests.filter(r => r.status === 'OPEN').length} />
        <OverviewCard title="In Progress" value={requests.filter(r => r.status === 'IN_PROGRESS').length} />
        <OverviewCard title="Resolved" value={requests.filter(r => r.status === 'RESOLVED').length} />
      </div>
      <div className="flex justify-end">
        <Link href="/requests/new" passHref>
          <Button>Submit New Request</Button>
        </Link>
      </div>
      <Card className="overflow-x-auto">
        <h2 className="text-xl font-semibold mb-2 text-white">Your Requests</h2>
        {loading ? (
          <LoadingSpinner />
        ) : (
          <Table data={requests} columns={columns} />
        )}
      </Card>
    </div>
  );
}
