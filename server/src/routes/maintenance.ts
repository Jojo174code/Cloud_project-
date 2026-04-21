import { Router } from 'express';
import {
  createRequest,
  getRequests,
  getRequestById,
  updateRequest,
  deleteRequest,
} from '../controllers/maintenanceController';

const router = Router();

// Create new maintenance request (tenant only)
router.post('/', createRequest);

// List requests – tenants get own, managers get all (handled in service)
router.get('/', getRequests);

// Get one request
router.get('/:id', getRequestById);

// Update request – partial update (PUT/PATCH). Managers can change status, AI fields; tenants can edit title/description before it's resolved.
router.put('/:id', updateRequest);

// Delete request – only tenant own and only if still OPEN
router.delete('/:id', deleteRequest);

export default router;
