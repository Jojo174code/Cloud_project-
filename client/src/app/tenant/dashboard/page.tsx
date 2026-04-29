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
import LeasePilotMark from '@/components/LeasePilotMark';
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

const MetricIcon = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" className="h-10 w-10 text-cyan-200" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
    <path d="M9 21v-6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6" />
  </svg>
);

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

  const openRequests = requests.filter(r => r.status === 'OPEN').length;
  const inProgressRequests = requests.filter(r => r.status === 'IN_PROGRESS').length;
  const resolvedRequests = requests.filter(r => r.status === 'RESOLVED').length;
  const escalatedRequests = requests.filter(r => r.ai_escalated).length;

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
    <div className="mx-auto w-full max-w-6xl space-y-6 lg:space-y-8">
      <header className="glass relative overflow-hidden rounded-[30px] p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.14),transparent_28%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">
                Tenant workspace
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                LeasePilot AI enabled
              </span>
            </div>
            <div className="flex items-start gap-4">
              <LeasePilotMark />
              <div>
                <h1 className="text-3xl font-bold text-white sm:text-4xl">Tenant Dashboard</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  Stay on top of rent, maintenance, and property updates in one polished workspace built for fast answers and clear next steps.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-start lg:justify-end">
            <Button variant="secondary" onClick={logout} className="rounded-xl px-5 py-3">
              Logout
            </Button>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewCard
          title="Open Requests"
          value={openRequests}
          subtitle="Awaiting action"
          icon={<MetricIcon><path d="M12 8v4l2.5 2.5" /><circle cx="12" cy="12" r="8" /></MetricIcon>}
        />
        <OverviewCard
          title="In Progress"
          value={inProgressRequests}
          subtitle="Work underway"
          icon={<MetricIcon><path d="M4 12h5l2 7 4-14 2 7h3" /></MetricIcon>}
        />
        <OverviewCard
          title="Resolved"
          value={resolvedRequests}
          subtitle="Closed successfully"
          icon={<MetricIcon><path d="m5 12 4 4L19 6" /></MetricIcon>}
        />
        <OverviewCard
          title="Escalated"
          value={escalatedRequests}
          subtitle="Priority attention"
          icon={<MetricIcon><path d="M12 3 4 17h16L12 3Z" /><path d="M12 9v4" /><path d="M12 16h.01" /></MetricIcon>}
        />
      </section>

      <Card className="overflow-hidden rounded-[30px] p-6 sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                Rent status
              </span>
              {rentStatus ? <Badge label={rentStatus.status} variant={badgeVariantFromRentStatus(rentStatus.status)} /> : null}
            </div>
            <h2 className="text-2xl font-semibold text-white">Lease and payment overview</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Review your assigned property, due dates, and current balance at a glance. Payment processing is still in placeholder mode for this demo environment.
            </p>
          </div>
          <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
            Finance summary sync is active
          </div>
        </div>

        {loading ? (
          <div className="mt-6 flex justify-center rounded-3xl border border-white/10 bg-black/20 p-10">
            <LoadingSpinner />
          </div>
        ) : rentStatus ? (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="glass-soft rounded-3xl p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Property</p>
              <p className="mt-4 text-lg font-semibold text-white">{rentStatus.propertyName}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">{rentStatus.propertyAddress}</p>
            </div>
            <div className="glass-soft rounded-3xl p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Rent amount</p>
              <p className="mt-4 text-3xl font-semibold text-white">{currency(rentStatus.rentAmount)}</p>
              <p className="mt-2 text-sm text-slate-400">Due day {rentStatus.dueDay}</p>
            </div>
            <div className="glass-soft rounded-3xl p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Current due date</p>
              <p className="mt-4 text-2xl font-semibold text-white">{new Date(rentStatus.currentDueDate).toLocaleDateString()}</p>
              <p className="mt-2 text-sm text-slate-400">Paid so far {currency(rentStatus.amountPaid)}</p>
            </div>
            <div className="glass-soft rounded-3xl p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Outstanding</p>
              <p className="mt-4 text-3xl font-semibold text-white">{currency(rentStatus.outstandingAmount)}</p>
              <div className="mt-5">
                <Button variant="secondary" disabled className="rounded-xl px-4 py-2.5">
                  Payment setup coming soon
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-[28px] border border-dashed border-white/10 bg-gradient-to-br from-white/5 to-cyan-500/5 p-8 sm:p-10">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-cyan-400/20 bg-cyan-400/10 shadow-[0_15px_30px_rgba(34,211,238,0.12)]">
                  <HomeIcon />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">No active lease or rent record yet</h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                    Once a manager assigns a lease, rent status and due dates will appear here.
                  </p>
                </div>
              </div>
              <Button variant="secondary" disabled className="rounded-xl px-4 py-2.5">
                Payment setup coming soon
              </Button>
            </div>
          </div>
        )}
      </Card>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.25fr]">
        <div className="rounded-[30px] border border-cyan-400/15 bg-gradient-to-br from-cyan-500/10 via-slate-950/50 to-indigo-500/10 p-6 shadow-[0_18px_50px_rgba(8,47,73,0.28)] sm:p-8">
          <div className="max-w-md">
            <div className="mb-4 flex items-center gap-3">
              <LeasePilotMark compact />
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                AI helper
              </span>
            </div>
            <h2 className="text-2xl font-semibold text-white">Fast help without digging through the portal</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Ask about rent timing, maintenance steps, emergencies, or the best way to reach management. LeasePilot AI keeps answers useful and grounded.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">Rent guidance</div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">Maintenance help</div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">Emergency triage</div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">Manager contact</div>
            </div>
          </div>
        </div>

        <AiAssistant />
      </section>

      <div className="flex justify-end">
        <Link href="/requests/new" passHref>
          <Button className="rounded-xl px-5 py-3">Submit New Request</Button>
        </Link>
      </div>

      <Card className="rounded-[30px] p-6 sm:p-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Your Requests</h2>
            <p className="mt-1 text-sm text-slate-400">Track submitted issues, review AI triage, and open request chat threads.</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
            {requests.length} total request{requests.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <Table data={requests} columns={columns} emptyMessage="You have not submitted any maintenance requests yet." />
          )}
        </div>
      </Card>
    </div>
  );
}
