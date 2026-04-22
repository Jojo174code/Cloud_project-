import { Request, Response } from 'express';
import {
  createMaintenance,
  listMaintenance,
  getMaintenanceById,
  updateMaintenance,
  deleteMaintenance,
} from '../services/maintenanceService';
import { AuthRequest } from '../middleware/auth';

// Tenant creates a new request
export const createRequest = async (req: AuthRequest, res: Response) => {
  const { title, description, category, user_reported_urgency, image_url } = req.body;
  if (!title || !description) {
    return res.status(400).json({ message: 'title and description required' });
  }
  try {
    const request = await createMaintenance({
      tenantId: req.user!.id,
      title,
      description,
      category,
      user_reported_urgency,
      image_url,
    });
    res.status(201).json(request);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to create request' });
  }
};

// List requests – role based in service
export const getRequests = async (req: AuthRequest, res: Response) => {
  try {
    const requests = await listMaintenance(req.user!);
    res.json(requests);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch requests' });
  }
};

export const getRequestById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const request = await getMaintenanceById(id, req.user!);
    if (!request) return res.status(404).json({ message: 'Not found' });
    res.json(request);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error fetching request' });
  }
};

export const updateRequest = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    const updated = await updateMaintenance(id, updates, req.user!);
    if (!updated) return res.status(404).json({ message: 'Not found or not authorized' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Update failed' });
  }
};

export const deleteRequest = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const success = await deleteMaintenance(id, req.user!);
    if (!success) return res.status(404).json({ message: 'Not found or cannot delete' });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Delete failed' });
  }
};
