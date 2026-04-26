import { Router } from 'express';
import {
  createRequest,
  getRequests,
  getRequestById,
  getRequestMessages,
  postRequestMessage,
  updateRequest,
  deleteRequest,
} from '../controllers/maintenanceController';

const router = Router();

router.post('/', createRequest);
router.get('/', getRequests);
router.get('/:id', getRequestById);
router.get('/:id/messages', getRequestMessages);
router.post('/:id/messages', postRequestMessage);
router.put('/:id', updateRequest);
router.delete('/:id', deleteRequest);

export default router;
