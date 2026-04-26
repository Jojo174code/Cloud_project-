import { PrismaClient, RentStatus, RequestStatus, UserRole } from '@prisma/client';
import { generateFinanceAiSummary } from './ai/financeSummary';

const prisma = new PrismaClient();

interface AuthUser {
  id: string;
  role: string;
}

interface CreatePaymentInput {
  lease_id: string;
  amount: number;
  due_date: string;
  status?: RentStatus;
  method?: string;
  note?: string;
  paid_date?: string | null;
}

interface UpdatePaymentInput {
  amount?: number;
  due_date?: string;
  status?: RentStatus;
  method?: string | null;
  note?: string | null;
  paid_date?: string | null;
}

const paymentInclude = {
  lease: {
    include: {
      tenant: {
        select: {
          id: true,
          full_name: true,
          email: true,
        },
      },
      property: true,
    },
  },
};

const leaseInclude = {
  tenant: {
    select: {
      id: true,
      full_name: true,
      email: true,
    },
  },
  property: true,
  rentPayments: {
    orderBy: {
      due_date: 'desc' as const,
    },
  },
};

const toUtcDate = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0));

const startOfCurrentMonth = (reference = new Date()) =>
  new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1, 0, 0, 0));

const endOfCurrentMonth = (reference = new Date()) =>
  new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 0, 23, 59, 59, 999));

const buildDueDateForMonth = (reference: Date, dueDay: number) => {
  const safeDueDay = Math.min(Math.max(dueDay, 1), 28);
  return new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), safeDueDay, 12, 0, 0));
};

const isSameUtcMonth = (left: Date, right: Date) => {
  return left.getUTCFullYear() === right.getUTCFullYear() && left.getUTCMonth() === right.getUTCMonth();
};

const parseDate = (value: string | null | undefined, label: string) => {
  if (!value) {
    throw new Error(`${label} is required`);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} is invalid`);
  }

  return parsed;
};

const getAppliedAmount = (rentAmount: number, status: RentStatus, amount: number) => {
  if (status === RentStatus.PAID || status === RentStatus.PARTIAL) {
    return Math.min(amount, rentAmount);
  }

  return 0;
};

const getOutstandingAmount = (rentAmount: number, status: RentStatus, amount: number) => {
  return Math.max(rentAmount - getAppliedAmount(rentAmount, status, amount), 0);
};

const assertManager = (user: AuthUser) => {
  if (user.role !== UserRole.MANAGER) {
    throw new Error('Forbidden');
  }
};

const getLeaseFilter = (user: AuthUser) => {
  return user.role === UserRole.MANAGER ? {} : { tenant_id: user.id };
};

const getPaymentFilter = (user: AuthUser) => {
  return user.role === UserRole.MANAGER ? {} : { lease: { tenant_id: user.id } };
};

const getFinanceData = async (user: AuthUser) => {
  const [leases, payments, maintenanceRequests, properties] = await Promise.all([
    prisma.lease.findMany({
      where: getLeaseFilter(user),
      include: leaseInclude,
      orderBy: [{ active: 'desc' }, { created_at: 'desc' }],
    }),
    prisma.rentPayment.findMany({
      where: getPaymentFilter(user),
      include: paymentInclude,
      orderBy: [{ due_date: 'desc' }, { created_at: 'desc' }],
    }),
    prisma.maintenanceRequest.findMany({
      where: user.role === UserRole.MANAGER ? {} : { tenant_id: user.id },
      select: { id: true, status: true },
    }),
    prisma.property.count(),
  ]);

  return { leases, payments, maintenanceRequests, properties };
};

export const getFinanceSummary = async (user: AuthUser) => {
  const now = new Date();
  const monthStart = startOfCurrentMonth(now);
  const monthEnd = endOfCurrentMonth(now);
  const monthLabel = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(now);

  const { leases, payments, maintenanceRequests, properties } = await getFinanceData(user);
  const activeLeases = leases.filter((lease) => lease.active);

  const currentMonthSnapshots = activeLeases.map((lease) => {
    const currentDueDate = buildDueDateForMonth(now, lease.due_day);
    const currentPayment = lease.rentPayments.find((payment) => isSameUtcMonth(payment.due_date, currentDueDate));
    const status = currentPayment?.status ?? (currentDueDate < now ? RentStatus.LATE : RentStatus.PENDING);
    const amountPaid = currentPayment
      ? getAppliedAmount(lease.rent_amount, currentPayment.status, currentPayment.amount)
      : 0;
    const outstandingAmount = currentPayment
      ? getOutstandingAmount(lease.rent_amount, currentPayment.status, currentPayment.amount)
      : lease.rent_amount;

    return {
      leaseId: lease.id,
      tenantName: lease.tenant.full_name,
      propertyName: lease.property.name,
      propertyAddress: lease.property.address,
      rentAmount: lease.rent_amount,
      dueDay: lease.due_day,
      currentDueDate,
      currentStatus: status,
      amountPaid,
      outstandingAmount,
    };
  });

  const expectedRent = currentMonthSnapshots.reduce((sum, item) => sum + item.rentAmount, 0);
  const collectedRent = currentMonthSnapshots.reduce((sum, item) => sum + item.amountPaid, 0);
  const outstandingRent = currentMonthSnapshots.reduce((sum, item) => sum + item.outstandingAmount, 0);

  const overdueMap = new Map<
    string,
    {
      leaseId: string;
      tenantName: string;
      propertyName: string;
      amountDue: number;
      daysLate: number;
      dueDate: Date;
      status: RentStatus;
    }
  >();

  for (const payment of payments) {
    if (payment.due_date >= toUtcDate(now)) continue;

    const amountDue = getOutstandingAmount(payment.lease.rent_amount, payment.status, payment.amount);
    if (amountDue <= 0) continue;

    const key = payment.lease.id;
    const daysLate = Math.max(
      1,
      Math.ceil((toUtcDate(now).getTime() - toUtcDate(payment.due_date).getTime()) / (1000 * 60 * 60 * 24))
    );
    const existing = overdueMap.get(key);

    overdueMap.set(key, {
      leaseId: payment.lease.id,
      tenantName: payment.lease.tenant.full_name,
      propertyName: payment.lease.property.name,
      amountDue: (existing?.amountDue ?? 0) + amountDue,
      daysLate: Math.max(existing?.daysLate ?? 0, daysLate),
      dueDate: existing?.dueDate ?? payment.due_date,
      status: payment.status,
    });
  }

  for (const snapshot of currentMonthSnapshots) {
    const hasCurrentMonthPayment = payments.some(
      (payment) => payment.lease.id === snapshot.leaseId && isSameUtcMonth(payment.due_date, snapshot.currentDueDate)
    );

    if (!hasCurrentMonthPayment && snapshot.currentDueDate < now && snapshot.outstandingAmount > 0) {
      overdueMap.set(snapshot.leaseId, {
        leaseId: snapshot.leaseId,
        tenantName: snapshot.tenantName,
        propertyName: snapshot.propertyName,
        amountDue: (overdueMap.get(snapshot.leaseId)?.amountDue ?? 0) + snapshot.outstandingAmount,
        daysLate: Math.max(
          overdueMap.get(snapshot.leaseId)?.daysLate ?? 0,
          Math.ceil((toUtcDate(now).getTime() - toUtcDate(snapshot.currentDueDate).getTime()) / (1000 * 60 * 60 * 24))
        ),
        dueDate: snapshot.currentDueDate,
        status: snapshot.currentStatus,
      });
    }
  }

  const overdueTenants = Array.from(overdueMap.values()).sort((a, b) => b.amountDue - a.amountDue);
  const overdueRent = overdueTenants.reduce((sum, item) => sum + item.amountDue, 0);

  const openMaintenanceCount = maintenanceRequests.filter(
    (request) => request.status === RequestStatus.OPEN || request.status === RequestStatus.IN_PROGRESS
  ).length;
  const maintenanceCostPlaceholder = maintenanceRequests.reduce((sum, request) => {
    if (request.status === RequestStatus.IN_PROGRESS) return sum + 225;
    if (request.status === RequestStatus.OPEN) return sum + 125;
    return sum;
  }, 0);

  const collectionRate = expectedRent > 0 ? (collectedRent / expectedRent) * 100 : 100;
  const netCashFlowEstimate = collectedRent - maintenanceCostPlaceholder;

  const tenantLease = currentMonthSnapshots[0] ?? null;

  return {
    role: user.role,
    period: {
      monthLabel,
      start: monthStart.toISOString(),
      end: monthEnd.toISOString(),
    },
    summary: {
      propertyCount: user.role === UserRole.MANAGER ? properties : activeLeases.length,
      activeLeaseCount: activeLeases.length,
      expectedRent,
      collectedRent,
      outstandingRent,
      overdueRent,
      collectionRate,
      maintenanceCount: openMaintenanceCount,
      maintenanceCostPlaceholder,
      netCashFlowEstimate,
    },
    overdueTenants,
    tenantRentStatus:
      user.role === UserRole.TENANT && tenantLease
        ? {
            leaseId: tenantLease.leaseId,
            propertyName: tenantLease.propertyName,
            propertyAddress: tenantLease.propertyAddress,
            rentAmount: tenantLease.rentAmount,
            dueDay: tenantLease.dueDay,
            currentDueDate: tenantLease.currentDueDate.toISOString(),
            status: tenantLease.currentStatus,
            amountPaid: tenantLease.amountPaid,
            outstandingAmount: tenantLease.outstandingAmount,
          }
        : null,
  };
};

export const listFinancePayments = async (user: AuthUser) => {
  const payments = await prisma.rentPayment.findMany({
    where: getPaymentFilter(user),
    include: paymentInclude,
    orderBy: [{ due_date: 'desc' }, { created_at: 'desc' }],
  });

  const leases = await prisma.lease.findMany({
    where: getLeaseFilter(user),
    include: {
      tenant: {
        select: {
          id: true,
          full_name: true,
          email: true,
        },
      },
      property: true,
    },
    orderBy: [{ active: 'desc' }, { created_at: 'desc' }],
  });

  return {
    role: user.role,
    payments,
    leases,
  };
};

export const getFinancePaymentById = async (id: string, user: AuthUser) => {
  return prisma.rentPayment.findFirst({
    where: {
      id,
      ...(user.role === UserRole.MANAGER ? {} : { lease: { tenant_id: user.id } }),
    },
    include: paymentInclude,
  });
};

export const createFinancePayment = async (input: CreatePaymentInput, user: AuthUser) => {
  assertManager(user);

  if (!input.lease_id) throw new Error('lease_id is required');
  if (!Number.isFinite(input.amount) || input.amount < 0) throw new Error('amount must be a valid number');

  const lease = await prisma.lease.findUnique({
    where: { id: input.lease_id },
    include: {
      tenant: {
        select: {
          id: true,
          full_name: true,
          email: true,
        },
      },
      property: true,
    },
  });

  if (!lease) throw new Error('Lease not found');

  const dueDate = parseDate(input.due_date, 'due_date');
  const status = input.status ?? RentStatus.PENDING;
  const paidDate =
    input.paid_date === null
      ? null
      : input.paid_date
      ? parseDate(input.paid_date, 'paid_date')
      : status === RentStatus.PAID || status === RentStatus.PARTIAL
      ? new Date()
      : null;

  return prisma.rentPayment.create({
    data: {
      lease_id: input.lease_id,
      amount: input.amount,
      due_date: dueDate,
      paid_date: paidDate,
      status,
      method: input.method?.trim() || null,
      note: input.note?.trim() || null,
    },
    include: paymentInclude,
  });
};

export const updateFinancePayment = async (id: string, input: UpdatePaymentInput, user: AuthUser) => {
  assertManager(user);

  const existing = await prisma.rentPayment.findUnique({ where: { id }, include: paymentInclude });
  if (!existing) return null;

  const data: {
    amount?: number;
    due_date?: Date;
    status?: RentStatus;
    method?: string | null;
    note?: string | null;
    paid_date?: Date | null;
  } = {};

  if (typeof input.amount === 'number') {
    if (!Number.isFinite(input.amount) || input.amount < 0) {
      throw new Error('amount must be a valid number');
    }
    data.amount = input.amount;
  }

  if (typeof input.due_date === 'string') {
    data.due_date = parseDate(input.due_date, 'due_date');
  }

  if (typeof input.status === 'string') {
    data.status = input.status;
    if (input.paid_date === undefined) {
      if (input.status === RentStatus.PAID || input.status === RentStatus.PARTIAL) {
        data.paid_date = existing.paid_date ?? new Date();
      } else {
        data.paid_date = null;
      }
    }
  }

  if (input.method !== undefined) {
    data.method = input.method?.trim() || null;
  }

  if (input.note !== undefined) {
    data.note = input.note?.trim() || null;
  }

  if (input.paid_date !== undefined) {
    data.paid_date = input.paid_date ? parseDate(input.paid_date, 'paid_date') : null;
  }

  return prisma.rentPayment.update({
    where: { id },
    data,
    include: paymentInclude,
  });
};

export const getFinanceAiSummary = async (user: AuthUser) => {
  assertManager(user);

  const financeSummary = await getFinanceSummary(user);
  return generateFinanceAiSummary({
    monthLabel: financeSummary.period.monthLabel,
    expectedRent: financeSummary.summary.expectedRent,
    collectedRent: financeSummary.summary.collectedRent,
    outstandingRent: financeSummary.summary.outstandingRent,
    overdueRent: financeSummary.summary.overdueRent,
    collectionRate: financeSummary.summary.collectionRate,
    maintenanceCount: financeSummary.summary.maintenanceCount,
    maintenanceCostPlaceholder: financeSummary.summary.maintenanceCostPlaceholder,
    netCashFlowEstimate: financeSummary.summary.netCashFlowEstimate,
    overdueTenants: financeSummary.overdueTenants.map((tenant) => ({
      tenantName: tenant.tenantName,
      propertyName: tenant.propertyName,
      amountDue: tenant.amountDue,
      daysLate: tenant.daysLate,
    })),
  });
};
