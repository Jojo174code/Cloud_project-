import { Router } from 'express';
import {
  createPayment,
  getAiSummary,
  getPayment,
  getPayments,
  getSummary,
  updatePayment,
} from '../controllers/financeController';

const router = Router();

router.get('/summary', getSummary);
router.get('/payments', getPayments);
router.get('/payments/:id', getPayment);
router.post('/payments', createPayment);
router.put('/payments/:id', updatePayment);
router.get('/ai-summary', getAiSummary);

export default router;
