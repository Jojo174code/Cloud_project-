import { Response } from 'express';
import {
  createMaintenance,
  listMaintenance,
  getMaintenanceById,
  updateMaintenance,
  deleteMaintenance,
  listMaintenanceMessages,
  createMaintenanceMessage,
} from '../services/maintenanceService';
import { AuthRequest } from '../middleware/auth';

const getParamId = (id: string | string[] | undefined) => {
  return Array.isArray(id) ? id[0] : id;
};

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

export const getRequests = async (req: AuthRequest, res: Response) => {
  try {
    const requests = await listMaintenance(req.user!);
    res.json(requests);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch requests' });
  }
};

export const getRequestById = async (req: AuthRequest, res: Response) => {
  const id = getParamId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: 'Missing request id' });
  }

  try {
    const request = await getMaintenanceById(id, req.user!);
    if (!request) return res.status(404).json({ message: 'Not found' });
    res.json(request);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error fetching request' });
  }
};

export const getRequestMessages = async (req: AuthRequest, res: Response) => {
  const id = getParamId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: 'Missing request id' });
  }

  try {
    const messages = await listMaintenanceMessages(id, req.user!);
    if (!messages) {
      return res.status(404).json({ message: 'Not found' });
    }
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch messages' });
  }
};

export const postRequestMessage = async (req: AuthRequest, res: Response) => {
  const id = getParamId(req.params.id);
  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';

  if (!id) {
    return res.status(400).json({ message: 'Missing request id' });
  }

  if (!body) {
    return res.status(400).json({ message: 'Message body is required' });
  }

  if (body.length > 2000) {
    return res.status(400).json({ message: 'Message body must be 2000 characters or fewer' });
  }

  try {
    const message = await createMaintenanceMessage(id, body, req.user!);
    if (!message) {
      return res.status(404).json({ message: 'Not found' });
    }
    res.status(201).json(message);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to send message' });
  }
};

export const updateRequest = async (req: AuthRequest, res: Response) => {
  const id = getParamId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: 'Missing request id' });
  }

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
  const id = getParamId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: 'Missing request id' });
  }

  try {
    const success = await deleteMaintenance(id, req.user!);
    if (!success) return res.status(404).json({ message: 'Not found or cannot delete' });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Delete failed' });
  }
};
