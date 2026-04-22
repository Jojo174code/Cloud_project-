import { PrismaClient, RequestStatus, UserRole } from '@prisma/client';
import { AuthRequest } from '../middleware/auth'; // only for typing, not used directly

const prisma = new PrismaClient();

interface CreateInput {
  tenantId: string;
  title: string;
  description: string;
  category?: string;
  user_reported_urgency?: number;
  image_url?: string;
}

import { triageMaintenance } from '../services/ai/maintenanceTriage';

export const createMaintenance = async (data: CreateInput) => {
  // First create the basic request record
  const request = await prisma.maintenanceRequest.create({
    data: {
      tenant_id: data.tenantId,
      title: data.title,
      description: data.description,
      category: data.category,
      user_reported_urgency: data.user_reported_urgency,
      image_url: data.image_url,
      // status defaults to OPEN via schema default
    },
  });

  // Run AI triage and persist the AI‑generated fields
  try {
    const triage = await triageMaintenance(data.title, data.description, data.image_url);
    await prisma.maintenanceRequest.update({
      where: { id: request.id },
      data: {
        ai_category: triage.category,
        ai_priority: triage.priority === 'emergency' ? 4 : triage.priority === 'high' ? 3 : triage.priority === 'medium' ? 2 : 1,
        ai_summary: triage.summary,
        ai_recommended_action: triage.recommended_action,
        ai_response_draft: triage.response_draft,
        ai_escalated: triage.escalated,
        ai_confidence_score: triage.confidence,
      },
    });
  } catch (e) {
    // If AI fails, we simply keep the request without AI fields.
    console.error('AI triage failed:', e);
  }

  // Return the request (note: AI fields are not included here – callers can fetch again if needed)
  return request;
};

/** List requests based on role */
export const listMaintenance = async (user: { id: string; role: string }) => {
  if (user.role === UserRole.MANAGER) {
    // Manager sees all requests, include tenant name for UI
    return prisma.maintenanceRequest.findMany({
      include: { tenant: true },
      orderBy: { created_at: 'desc' },
    });
  }
  // tenant – only own requests (no need for tenant relation)
  return prisma.maintenanceRequest.findMany({
    where: { tenant_id: user.id },
    orderBy: { created_at: 'desc' },
  });
};

export const getMaintenanceById = async (id: string, user: { id: string; role: string }) => {
  const request = await prisma.maintenanceRequest.findUnique({ where: { id } });
  if (!request) return null;
  if (user.role === UserRole.MANAGER || request.tenant_id === user.id) {
    return request;
  }
  return null; // not authorized
};

export const updateMaintenance = async (
  id: string,
  updates: any,
  user: { id: string; role: string }
) => {
  const existing = await prisma.maintenanceRequest.findUnique({ where: { id } });
  if (!existing) return null;

  // Authorization rules
  if (user.role === UserRole.TENANT) {
    // Tenants can only modify their own request while status is OPEN and cannot touch AI fields or status
    if (existing.tenant_id !== user.id) return null;
    if (existing.status !== RequestStatus.OPEN) return null;
    const allowedFields = ['title', 'description', 'category', 'user_reported_urgency', 'image_url'];
    const data: any = {};
    for (const key of allowedFields) {
      if (key in updates) data[key] = updates[key];
    }
    if (Object.keys(data).length === 0) return existing; // nothing to change
    return prisma.maintenanceRequest.update({ where: { id }, data });
  }

  // Manager can update any field
  return prisma.maintenanceRequest.update({ where: { id }, data: updates });
};

export const deleteMaintenance = async (id: string, user: { id: string; role: string }) => {
  const existing = await prisma.maintenanceRequest.findUnique({ where: { id } });
  if (!existing) return false;
  // Only tenant can delete their own request and only if still OPEN
  if (user.role === UserRole.TENANT) {
    if (existing.tenant_id !== user.id) return false;
    if (existing.status !== RequestStatus.OPEN) return false;
  }
  // Manager can delete any (optional) – here we allow
  await prisma.maintenanceRequest.delete({ where: { id } });
  return true;
};
