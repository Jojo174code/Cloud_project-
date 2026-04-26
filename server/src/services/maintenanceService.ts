import { AiPriority, PrismaClient, RequestStatus, UserRole } from '@prisma/client';
import { triageMaintenance } from '../services/ai/maintenanceTriage';

const prisma = new PrismaClient();

interface CreateInput {
  tenantId: string;
  title: string;
  description: string;
  category?: string;
  user_reported_urgency?: number;
  image_url?: string;
}

interface AuthUser {
  id: string;
  role: string;
}

const mapPriorityToEnum = (priority: string): AiPriority => {
  switch (priority.toLowerCase()) {
    case 'emergency':
      return AiPriority.EMERGENCY;
    case 'high':
      return AiPriority.HIGH;
    case 'medium':
      return AiPriority.MEDIUM;
    default:
      return AiPriority.LOW;
  }
};

const requestDetailInclude = {
  tenant: {
    select: {
      id: true,
      full_name: true,
      email: true,
      role: true,
    },
  },
};

const messageInclude = {
  sender: {
    select: {
      id: true,
      full_name: true,
      role: true,
    },
  },
};

const getAuthorizedRequest = async (id: string, user: AuthUser) => {
  const request = await prisma.maintenanceRequest.findUnique({
    where: { id },
    include: requestDetailInclude,
  });

  if (!request) return null;
  if (user.role === UserRole.MANAGER || request.tenant_id === user.id) {
    return request;
  }

  return null;
};

export const createMaintenance = async (data: CreateInput) => {
  const request = await prisma.maintenanceRequest.create({
    data: {
      tenant_id: data.tenantId,
      title: data.title,
      description: data.description,
      category: data.category,
      user_reported_urgency: data.user_reported_urgency,
      image_url: data.image_url,
    },
  });

  let triageData = {
    category: 'general',
    priority: 'low',
    summary: data.title,
    recommended_action: 'Inspect the issue and contact the tenant for more details.',
    response_draft: 'We have received your request and will review it shortly.',
    escalated: false,
    confidence: 0.0,
  };

  try {
    triageData = await triageMaintenance(data.title, data.description, data.image_url);
  } catch (e) {
    console.error('AI triage failed, using fallback fields:', e);
  }

  const updatedRequest = await prisma.maintenanceRequest.update({
    where: { id: request.id },
    data: {
      ai_category: triageData.category,
      ai_priority: mapPriorityToEnum(triageData.priority),
      ai_summary: triageData.summary,
      ai_recommended_action: triageData.recommended_action,
      ai_response_draft: triageData.response_draft,
      ai_escalated: triageData.escalated,
      ai_confidence_score: triageData.confidence,
    },
    include: requestDetailInclude,
  });

  return updatedRequest;
};

export const listMaintenance = async (user: AuthUser) => {
  if (user.role === UserRole.MANAGER) {
    return prisma.maintenanceRequest.findMany({
      include: requestDetailInclude,
      orderBy: { created_at: 'desc' },
    });
  }

  return prisma.maintenanceRequest.findMany({
    where: { tenant_id: user.id },
    include: requestDetailInclude,
    orderBy: { created_at: 'desc' },
  });
};

export const getMaintenanceById = async (id: string, user: AuthUser) => {
  return getAuthorizedRequest(id, user);
};

export const listMaintenanceMessages = async (id: string, user: AuthUser) => {
  const request = await getAuthorizedRequest(id, user);
  if (!request) return null;

  return prisma.message.findMany({
    where: { maintenance_request_id: id },
    include: messageInclude,
    orderBy: { created_at: 'asc' },
  });
};

export const createMaintenanceMessage = async (
  id: string,
  body: string,
  user: AuthUser
) => {
  const request = await getAuthorizedRequest(id, user);
  if (!request) return null;

  return prisma.message.create({
    data: {
      maintenance_request_id: id,
      sender_id: user.id,
      body,
    },
    include: messageInclude,
  });
};

export const updateMaintenance = async (id: string, updates: any, user: AuthUser) => {
  const existing = await prisma.maintenanceRequest.findUnique({ where: { id } });
  if (!existing) return null;

  if (user.role === UserRole.TENANT) {
    if (existing.tenant_id !== user.id) return null;
    if (existing.status !== RequestStatus.OPEN) return null;
    const allowedFields = ['title', 'description', 'category', 'user_reported_urgency', 'image_url'];
    const data: any = {};
    for (const key of allowedFields) {
      if (key in updates) data[key] = updates[key];
    }
    if (Object.keys(data).length === 0) {
      return prisma.maintenanceRequest.findUnique({
        where: { id },
        include: requestDetailInclude,
      });
    }
    return prisma.maintenanceRequest.update({ where: { id }, data, include: requestDetailInclude });
  }

  return prisma.maintenanceRequest.update({ where: { id }, data: updates, include: requestDetailInclude });
};

export const deleteMaintenance = async (id: string, user: AuthUser) => {
  const existing = await prisma.maintenanceRequest.findUnique({ where: { id } });
  if (!existing) return false;
  if (user.role === UserRole.TENANT) {
    if (existing.tenant_id !== user.id) return false;
    if (existing.status !== RequestStatus.OPEN) return false;
  }
  await prisma.maintenanceRequest.delete({ where: { id } });
  return true;
};
