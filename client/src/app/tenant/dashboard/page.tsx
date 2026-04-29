"use client";
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Card from '@/components/Card';
import OverviewCard from '@/components/OverviewCard';
import Table from '@/components/Table';
import Button from '@/components/Button';
import LoadingSpinner from '@/components/LoadingSpinner';
import Link from 'next/link';
import AiAssistant from '@/components/AiAssistant';
import Badge from '@/components/Badge';
import { api } from '@/lib/api';

type Request = {
  id: string;
  title: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  created_at: string;
  user_reported_urgency?: number | null;
  ai_priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY' | null;
  ai_escalated?: boolean;
};

type RentStatus = 'PENDING' | 'PAID' | 'LATE' | 'PARTIAL';

type TenantFinanceSummary = {
  tenantRentStatus: {
    propertyName: string;
    propertyAddress: string;
    rentAmount: number;
    dueDay: number;
    currentDueDate: string;
    status: RentStatus;
    amountPaid: number;
    outstandingAmount: number;
  } | null;
};

const currency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const badgeVariantFromPriority = (priority?: string | null) => {
  switch (priority) {
    case 'EMERGENCY':
      return 'emergency' as const;
    case 'HIGH':
      return 'high' as const;
    case 'MEDIUM':
      return 'medium' as const;
    case 'LOW':
      return 'low' as const;
    default:
      return 'default' as const;
  }
};

const badgeVariantFromStatus = (status: Request['status']) => {
  switch (status) {
    case 'RESOLVED':
      return 'success' as const;
    case 'IN_PROGRESS':
      return 'info' as const;
    case 'CLOSED':
      return 'default' as const;
    default:
      return 'medium' as const;
  }
};

const badgeVariantFromRentStatus = (status: RentStatus) => {
  switch (status) {
    case 'PAID':
      return 'success' as const;
    case 'PARTIAL':
      return 'medium' as const;
    case 'LATE':
      return 'emergency' as const;
    default:
      return 'default' as const;
  }
};

const urgencyLabel = (urgency?: number | null) => {
  switch (urgency) {
    case 4:
      return 'Emergency';
    case 3:
      return 'High';
    case 2:
      return 'Medium';
    case 1:
      return 'Low';
    default:
      return 'Not set';
  }
};

export default function TenantDashboard() {
  const { token, logout } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [rentStatus, setRentStatus] = useState<TenantFinanceSummary['tenantRentStatus']>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const fetch = async () => {
      try {
        const [requestData, financeData] = await Promise.all([
          api<Request[]>('/api/maintenance', { token }),
          api<TenantFinanceSummary>('/api/finance/summary', { token }),
        ]);
        setRequests(requestData);
        setRentStatus(financeData.tenantRentStatus);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [token]);

  const columns = [
    {
      header: 'Request',
      render: (r: Request) => (
        <div>
          <p className="font-medium text-white">{r.title}</p>
          <p className="text-xs text-gray-400">#{r.id.slice(0, 8)}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      render: (r: Request) => <Badge label={r.status.replace('_', ' ')} variant={badgeVariantFromStatus(r.status)} />,
    },
    {
      header: 'Urgency',
      render: (r: Request) => (
        <Badge
          label={urgencyLabel(r.user_reported_urgency)}
          variant={badgeVariantFromPriority(
            r.user_reported_urgency === 4
              ? 'EMERGENCY'
              : r.user_reported_urgency === 3
              ? 'HIGH'
              : r.user_reported_urgency === 2
              ? 'MEDIUM'
              : r.user_reported_urgency === 1
              ? 'LOW'
              : undefined
          )}
        />
      ),
    },
    {
      header: 'AI Triage',
      render: (r: Request) => (
        <div className="space-y-1">
          <Badge label={r.ai_priority ?? 'Pending'} variant={badgeVariantFromPriority(r.ai_priority)} />
          {r.ai_escalated ? (
            <div>
              <Badge label="Escalated" variant="emergency" />
            </div>
          ) : null}
        </div>
      ),
    },
    { header: 'Created', render: (r: Request) => new Date(r.created_at).toLocaleDateString() },
    {
      header: 'Actions',
      render: (r: Request) => (
        <Link href={`/requests/view?id=${r.id}`}>
          <Button size="sm">View / Chat</Button>
        </Link>
      ),
      className: 'min-w-[140px]',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Tenant Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Track rent, manage maintenance, and get quick answers from LeasePilot AI.
          </p>
        </div>
        <Button variant="secondary" onClick={logout}>Logout</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <OverviewCard title="Open Requests" value={requests.filter(r => r.status === 'OPEN').length} />
        <OverviewCard title="In Progress" value={requests.filter(r => r.status === 'IN_PROGRESS').length} />
        <OverviewCard title="Resolved" value={requests.filter(r => r.status === 'RESOLVED').length} />
        <OverviewCard title="Escalated" value={requests.filter(r => r.ai_escalated).length} />
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Rent Status</h2>
              <p className="text-sm text-gray-400">Manual/mock tracking only for now. No real payment processor is connected.</p>
            </div>
            {rentStatus ? <Badge label={rentStatus.status} variant={badgeVariantFromRentStatus(rentStatus.status)} /> : null}
          </div>

          {loading ? (
            <div className="mt-4"><LoadingSpinner /></div>
          ) : rentStatus ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-gray-400">Property</p>
                <p className="mt-2 font-medium text-white">{rentStatus.propertyName}</p>
                <p className="text-sm text-gray-400">{rentStatus.propertyAddress}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-gray-400">Rent Amount</p>
                <p className="mt-2 font-medium text-white">{currency(rentStatus.rentAmount)}</p>
                <p className="text-sm text-gray-400">Due day {rentStatus.dueDay}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-gray-400">Current Due Date</p>
                <p className="mt-2 font-medium text-white">{new Date(rentStatus.currentDueDate).toLocaleDateString()}</p>
                <p className="text-sm text-gray-400">Paid so far {currency(rentStatus.amountPaid)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-gray-400">Outstanding</p>
                <p className="mt-2 font-medium text-white">{currency(rentStatus.outstandingAmount)}</p>
                <div className="mt-4">
                  <Button variant="secondary" disabled>
                    Payment Placeholder
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-400">
              No active lease or rent record is available yet.
            </div>
          )}
        </Card>

        <div className="rounded-[28px] border border-cyan-400/15 bg-gradient-to-br from-cyan-500/10 via-slate-950/40 to-indigo-500/10 p-6 shadow-[0_18px_50px_rgba(8,47,73,0.28)]">
          <div className="max-w-md">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200/80">LeasePilot AI</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Fast help without digging through the portal</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Ask about rent timing, maintenance steps, emergencies, or the best way to reach management. The assistant is tuned to stay helpful without making unsupported claims.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Rent guidance</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Maintenance help</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Emergency triage</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Manager contact</span>
            </div>
          </div>
        </div>
      </section>

      <AiAssistant />

      <div className="flex justify-end">
        <Link href="/requests/new" passHref>
          <Button>Submit New Request</Button>
        </Link>
      </div>

      <Card className="overflow-x-auto p-6">
        <h2 className="mb-2 text-xl font-semibold text-white">Your Requests</h2>
        {loading ? (
          <LoadingSpinner />
        ) : (
          <Table data={requests} columns={columns} emptyMessage="You have not submitted any maintenance requests yet." />
        )}
      </Card>
    </div>
  );
}
