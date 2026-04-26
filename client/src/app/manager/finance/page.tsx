"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import Card from '@/components/Card';
import OverviewCard from '@/components/OverviewCard';
import Table from '@/components/Table';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import LoadingSpinner from '@/components/LoadingSpinner';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

type RentStatus = 'PENDING' | 'PAID' | 'LATE' | 'PARTIAL';

type FinanceSummaryResponse = {
  summary: {
    propertyCount: number;
    activeLeaseCount: number;
    expectedRent: number;
    collectedRent: number;
    outstandingRent: number;
    overdueRent: number;
    collectionRate: number;
    maintenanceCount: number;
    maintenanceCostPlaceholder: number;
    netCashFlowEstimate: number;
  };
  period: {
    monthLabel: string;
  };
  overdueTenants: Array<{
    leaseId: string;
    tenantName: string;
    propertyName: string;
    amountDue: number;
    daysLate: number;
    dueDate: string;
    status: RentStatus;
  }>;
};

type LeaseOption = {
  id: string;
  rent_amount: number;
  due_day: number;
  tenant: {
    full_name: string;
    email: string;
  };
  property: {
    name: string;
    address: string;
  };
};

type PaymentRecord = {
  id: string;
  amount: number;
  due_date: string;
  paid_date?: string | null;
  status: RentStatus;
  method?: string | null;
  note?: string | null;
  lease: {
    id: string;
    rent_amount: number;
    due_day: number;
    tenant: {
      full_name: string;
      email: string;
    };
    property: {
      name: string;
      address: string;
    };
  };
};

type PaymentsResponse = {
  payments: PaymentRecord[];
  leases: LeaseOption[];
};

type AiSummary = {
  source: 'ai' | 'fallback';
  summary: string;
  collection_performance: string;
  overdue_risk: string;
  cash_flow_warning: string;
  recommended_actions: string[];
  rent_reminder_draft?: string;
};

const currency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const badgeVariantFromStatus = (status: RentStatus) => {
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

export default function ManagerFinancePage() {
  const { token, user } = useAuth();
  const [summary, setSummary] = useState<FinanceSummaryResponse | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [leases, setLeases] = useState<LeaseOption[]>([]);
  const [aiSummary, setAiSummary] = useState<AiSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPaymentId, setSavingPaymentId] = useState<string | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusEdits, setStatusEdits] = useState<Record<string, RentStatus>>({});
  const [newPayment, setNewPayment] = useState({
    lease_id: '',
    amount: '',
    due_date: '',
    status: 'PENDING' as RentStatus,
    method: '',
    note: '',
  });

  const loadFinance = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const [summaryData, paymentData] = await Promise.all([
        api<FinanceSummaryResponse>('/api/finance/summary', { token }),
        api<PaymentsResponse>('/api/finance/payments', { token }),
      ]);
      setSummary(summaryData);
      setPayments(paymentData.payments);
      setLeases(paymentData.leases);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load finance data.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (user?.role === 'MANAGER') {
      void loadFinance();
    }
  }, [loadFinance, user?.role]);

  const overdueTenants = useMemo(() => summary?.overdueTenants ?? [], [summary]);

  const handleCreatePayment = async () => {
    if (!token) return;

    setFormError(null);
    try {
      await api('/api/finance/payments', {
        method: 'POST',
        token,
        body: {
          lease_id: newPayment.lease_id,
          amount: Number(newPayment.amount),
          due_date: newPayment.due_date,
          status: newPayment.status,
          method: newPayment.method || undefined,
          note: newPayment.note || undefined,
        },
      });
      setNewPayment({
        lease_id: '',
        amount: '',
        due_date: '',
        status: 'PENDING',
        method: '',
        note: '',
      });
      await loadFinance();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create payment entry.');
    }
  };

  const handleSaveStatus = async (payment: PaymentRecord) => {
    if (!token) return;

    const nextStatus = statusEdits[payment.id] ?? payment.status;
    setSavingPaymentId(payment.id);

    try {
      await api(`/api/finance/payments/${payment.id}`, {
        method: 'PUT',
        token,
        body: {
          status: nextStatus,
        },
      });
      await loadFinance();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payment status.');
    } finally {
      setSavingPaymentId(null);
    }
  };

  const handleGenerateAi = async () => {
    if (!token) return;

    setGeneratingAi(true);
    try {
      const result = await api<AiSummary>('/api/finance/ai-summary', { token });
      setAiSummary(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate AI summary.');
    } finally {
      setGeneratingAi(false);
    }
  };

  const columns = [
    {
      header: 'Tenant / Property',
      render: (payment: PaymentRecord) => (
        <div>
          <p className="font-medium text-white">{payment.lease.tenant.full_name}</p>
          <p className="text-xs text-gray-400">{payment.lease.property.name}</p>
        </div>
      ),
    },
    {
      header: 'Due',
      render: (payment: PaymentRecord) => (
        <div>
          <p>{new Date(payment.due_date).toLocaleDateString()}</p>
          <p className="text-xs text-gray-400">Lease due day {payment.lease.due_day}</p>
        </div>
      ),
    },
    {
      header: 'Amount',
      render: (payment: PaymentRecord) => (
        <div>
          <p>{currency(payment.amount)}</p>
          <p className="text-xs text-gray-400">Rent target {currency(payment.lease.rent_amount)}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      render: (payment: PaymentRecord) => (
        <Badge label={payment.status} variant={badgeVariantFromStatus(payment.status)} />
      ),
    },
    {
      header: 'Method / Note',
      render: (payment: PaymentRecord) => (
        <div className="space-y-1">
          <p>{payment.method || 'Manual / not set'}</p>
          <p className="text-xs text-gray-400">{payment.note || 'No note'}</p>
        </div>
      ),
      className: 'min-w-[220px]',
    },
    {
      header: 'Update',
      render: (payment: PaymentRecord) => (
        <div className="flex min-w-[180px] items-center gap-2">
          <select
            value={statusEdits[payment.id] ?? payment.status}
            onChange={(event) =>
              setStatusEdits((current) => ({
                ...current,
                [payment.id]: event.target.value as RentStatus,
              }))
            }
            className="rounded-md border border-white/10 bg-gray-900 px-3 py-2 text-sm text-white"
          >
            <option value="PENDING">PENDING</option>
            <option value="PAID">PAID</option>
            <option value="LATE">LATE</option>
            <option value="PARTIAL">PARTIAL</option>
          </select>
          <Button size="sm" onClick={() => handleSaveStatus(payment)} disabled={savingPaymentId === payment.id}>
            {savingPaymentId === payment.id ? 'Saving...' : 'Save'}
          </Button>
        </div>
      ),
      className: 'min-w-[220px]',
    },
  ];

  if (user?.role && user.role !== 'MANAGER') {
    return (
      <Card className="mx-auto max-w-2xl p-6 text-center">
        <h1 className="text-2xl font-semibold text-white">Manager access required</h1>
        <p className="mt-2 text-gray-300">This finance center is only available to manager accounts.</p>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !summary) {
    return (
      <Card className="mx-auto max-w-3xl p-6 text-center">
        <h1 className="text-2xl font-semibold text-white">Finance center unavailable</h1>
        <p className="mt-2 text-gray-300">{error}</p>
        <div className="mt-4">
          <Button onClick={() => void loadFinance()}>Retry</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-300/70">Manager finance center</p>
          <h1 className="text-3xl font-bold text-white">Rent & Cash Flow Center</h1>
          <p className="mt-2 text-sm text-gray-400">
            Manual/mock rent tracking for {summary?.period.monthLabel}. No live payment processor is connected in this MVP.
          </p>
        </div>
        <Button variant="secondary" onClick={() => void loadFinance()}>Refresh Data</Button>
      </div>

      {error ? (
        <Card className="border border-red-400/20 bg-red-500/5 p-4 text-sm text-red-200">{error}</Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <OverviewCard title="Expected Rent" value={currency(summary?.summary.expectedRent ?? 0)} />
        <OverviewCard title="Collected Rent" value={currency(summary?.summary.collectedRent ?? 0)} />
        <OverviewCard title="Outstanding Rent" value={currency(summary?.summary.outstandingRent ?? 0)} />
        <OverviewCard title="Overdue Rent" value={currency(summary?.summary.overdueRent ?? 0)} />
        <OverviewCard title="Collection Rate" value={`${(summary?.summary.collectionRate ?? 0).toFixed(1)}%`} />
        <OverviewCard title="Net Cash Flow" value={currency(summary?.summary.netCashFlowEstimate ?? 0)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">Rent ledger</h2>
              <p className="text-sm text-gray-400">Track payment records, balances, and manual status changes.</p>
            </div>
            <Badge label={`${payments.length} entries`} variant="info" />
          </div>
          <Table data={payments} columns={columns} emptyMessage="No rent payments recorded yet." />
        </Card>

        <div className="space-y-6">
          <Card className="space-y-4 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">AI Cash Flow Advisor</h2>
                <p className="text-sm text-gray-400">Generate a concise collection and cash-flow readout.</p>
              </div>
              <Button onClick={handleGenerateAi} disabled={generatingAi}>
                {generatingAi ? 'Generating...' : 'Generate AI Summary'}
              </Button>
            </div>

            {aiSummary ? (
              <div className="space-y-4 rounded-2xl border border-cyan-400/15 bg-cyan-500/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Badge label={aiSummary.source === 'ai' ? 'AI Summary' : 'Fallback Summary'} variant="info" />
                </div>
                <p className="text-sm leading-6 text-gray-100">{aiSummary.summary}</p>
                <div className="space-y-2 text-sm text-gray-300">
                  <p><span className="font-semibold text-white">Collection:</span> {aiSummary.collection_performance}</p>
                  <p><span className="font-semibold text-white">Overdue risk:</span> {aiSummary.overdue_risk}</p>
                  <p><span className="font-semibold text-white">Cash flow:</span> {aiSummary.cash_flow_warning}</p>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-white">Recommended actions</p>
                  <ul className="space-y-2 text-sm text-gray-300">
                    {aiSummary.recommended_actions.map((action, index) => (
                      <li key={`${action}-${index}`} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
                {aiSummary.rent_reminder_draft ? (
                  <div className="rounded-xl border border-fuchsia-400/15 bg-fuchsia-500/5 p-4">
                    <p className="mb-2 text-sm font-semibold text-white">Rent reminder draft</p>
                    <p className="text-sm leading-6 text-gray-300">{aiSummary.rent_reminder_draft}</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-400">
                No finance summary generated yet. Use the button above to create an AI or fallback business summary.
              </div>
            )}
          </Card>

          <Card className="space-y-4 p-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Overdue tenants</h2>
              <p className="text-sm text-gray-400">Accounts that need manager follow-up.</p>
            </div>
            {overdueTenants.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-400">
                No overdue rent currently on record.
              </div>
            ) : (
              <div className="space-y-3">
                {overdueTenants.map((tenant) => (
                  <div key={tenant.leaseId} className="rounded-2xl border border-red-400/15 bg-red-500/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{tenant.tenantName}</p>
                        <p className="text-sm text-gray-400">{tenant.propertyName}</p>
                      </div>
                      <Badge label={`${tenant.daysLate} days late`} variant="emergency" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-300">
                      <span>Amount due: <span className="font-semibold text-white">{currency(tenant.amountDue)}</span></span>
                      <span>Due date: <span className="font-semibold text-white">{new Date(tenant.dueDate).toLocaleDateString()}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Card className="space-y-4 p-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Manual payment entry</h2>
          <p className="text-sm text-gray-400">Create a safe mock/manual payment record without processing a real transaction.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Lease</label>
            <select
              value={newPayment.lease_id}
              onChange={(event) => setNewPayment((current) => ({ ...current, lease_id: event.target.value }))}
              className="w-full rounded-md border border-white/10 bg-gray-900 px-3 py-2 text-white"
            >
              <option value="">Select lease</option>
              {leases.map((lease) => (
                <option key={lease.id} value={lease.id}>
                  {lease.property.name} · {lease.tenant.full_name} · {currency(lease.rent_amount)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={newPayment.amount}
              onChange={(event) => setNewPayment((current) => ({ ...current, amount: event.target.value }))}
              className="w-full rounded-md border border-white/10 bg-gray-900 px-3 py-2 text-white"
              placeholder="1750"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Due date</label>
            <input
              type="date"
              value={newPayment.due_date}
              onChange={(event) => setNewPayment((current) => ({ ...current, due_date: event.target.value }))}
              className="w-full rounded-md border border-white/10 bg-gray-900 px-3 py-2 text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Status</label>
            <select
              value={newPayment.status}
              onChange={(event) =>
                setNewPayment((current) => ({ ...current, status: event.target.value as RentStatus }))
              }
              className="w-full rounded-md border border-white/10 bg-gray-900 px-3 py-2 text-white"
            >
              <option value="PENDING">PENDING</option>
              <option value="PAID">PAID</option>
              <option value="LATE">LATE</option>
              <option value="PARTIAL">PARTIAL</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Method</label>
            <input
              type="text"
              value={newPayment.method}
              onChange={(event) => setNewPayment((current) => ({ ...current, method: event.target.value }))}
              className="w-full rounded-md border border-white/10 bg-gray-900 px-3 py-2 text-white"
              placeholder="ACH, Check, Cash"
            />
          </div>
          <div className="space-y-2 xl:col-span-2">
            <label className="text-sm text-gray-300">Note</label>
            <input
              type="text"
              value={newPayment.note}
              onChange={(event) => setNewPayment((current) => ({ ...current, note: event.target.value }))}
              className="w-full rounded-md border border-white/10 bg-gray-900 px-3 py-2 text-white"
              placeholder="Manual entry note"
            />
          </div>
        </div>
        {formError ? <p className="text-sm text-red-300">{formError}</p> : null}
        <div className="flex justify-end">
          <Button onClick={handleCreatePayment}>Create Payment Record</Button>
        </div>
      </Card>
    </div>
  );
}
