import { Response } from 'express';
import { RentStatus, UserRole } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import {
  createFinancePayment,
  getFinanceAiSummary,
  getFinancePaymentById,
  getFinanceSummary,
  listFinancePayments,
  updateFinancePayment,
} from '../services/financeService';

const getParamId = (id: string | string[] | undefined) => {
  return Array.isArray(id) ? id[0] : id;
};

const isValidRentStatus = (status: unknown): status is RentStatus => {
  return (
    status === RentStatus.PAID ||
    status === RentStatus.PENDING ||
    status === RentStatus.LATE ||
    status === RentStatus.PARTIAL
  );
};

const requireManager = (req: AuthRequest, res: Response) => {
  if (req.user?.role !== UserRole.MANAGER) {
    res.status(403).json({ message: 'Manager access required' });
    return false;
  }

  return true;
};

export const getSummary = async (req: AuthRequest, res: Response) => {
  try {
    const summary = await getFinanceSummary(req.user!);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to load finance summary' });
  }
};

export const getPayments = async (req: AuthRequest, res: Response) => {
  try {
    const payments = await listFinancePayments(req.user!);
    res.json(payments);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to load rent payments' });
  }
};

export const getPayment = async (req: AuthRequest, res: Response) => {
  const id = getParamId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: 'Missing payment id' });
  }

  try {
    const payment = await getFinancePaymentById(id, req.user!);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    res.json(payment);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to load payment' });
  }
};

export const createPayment = async (req: AuthRequest, res: Response) => {
  if (!requireManager(req, res)) return;

  const { lease_id, amount, due_date, status, method, note, paid_date } = req.body;
  if (!lease_id || amount === undefined || !due_date) {
    return res.status(400).json({ message: 'lease_id, amount, and due_date are required' });
  }

  if (status !== undefined && !isValidRentStatus(status)) {
    return res.status(400).json({ message: 'Invalid rent status' });
  }

  try {
    const payment = await createFinancePayment(
      {
        lease_id,
        amount: Number(amount),
        due_date,
        status,
        method,
        note,
        paid_date,
      },
      req.user!
    );
    res.status(201).json(payment);
  } catch (err: any) {
    const statusCode = err.message === 'Forbidden' ? 403 : 400;
    res.status(statusCode).json({ message: err.message || 'Failed to create payment' });
  }
};

export const updatePayment = async (req: AuthRequest, res: Response) => {
  if (!requireManager(req, res)) return;

  const id = getParamId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: 'Missing payment id' });
  }

  const { amount, due_date, status, method, note, paid_date } = req.body;
  if (status !== undefined && !isValidRentStatus(status)) {
    return res.status(400).json({ message: 'Invalid rent status' });
  }

  try {
    const payment = await updateFinancePayment(
      id,
      {
        amount: amount !== undefined ? Number(amount) : undefined,
        due_date,
        status,
        method,
        note,
        paid_date,
      },
      req.user!
    );

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    res.json(payment);
  } catch (err: any) {
    const statusCode = err.message === 'Forbidden' ? 403 : 400;
    res.status(statusCode).json({ message: err.message || 'Failed to update payment' });
  }
};

export const getAiSummary = async (req: AuthRequest, res: Response) => {
  if (!requireManager(req, res)) return;

  try {
    const summary = await getFinanceAiSummary(req.user!);
    res.json(summary);
  } catch (err: any) {
    const statusCode = err.message === 'Forbidden' ? 403 : 500;
    res.status(statusCode).json({ message: err.message || 'Failed to generate AI finance summary' });
  }
};
