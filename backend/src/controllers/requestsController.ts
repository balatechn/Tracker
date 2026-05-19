import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { triggerN8n } from '../lib/webhook';

const prisma = new PrismaClient();

const APPROVAL_STAGES = ['Manager', 'IT', 'Finance', 'Done'];

export async function getRequests(req: AuthRequest, res: Response): Promise<void> {
  const { status, requestType } = req.query;
  const where: Record<string, unknown> = {};
  if (status && typeof status === 'string' && status !== 'All') where.status = status;
  if (requestType && typeof requestType === 'string' && requestType !== 'All') where.requestType = requestType;

  const requests = await prisma.assetRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  res.json(requests);
}

export async function createRequest(req: AuthRequest, res: Response): Promise<void> {
  const { requestType, requestedBy, assetId, description, priority } = req.body;
  if (!requestType || !requestedBy || !description) {
    res.status(400).json({ error: 'requestType, requestedBy and description are required' });
    return;
  }

  const request = await prisma.assetRequest.create({
    data: {
      requestType:  String(requestType),
      requestedBy:  String(requestedBy),
      assetId:      assetId ? parseInt(String(assetId)) : null,
      description:  String(description),
      priority:     priority || 'Medium',
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'CREATED',
      entityType: 'Request',
      entityId: request.id,
      entityName: `${request.requestType} — ${request.requestedBy}`,
      details: request.description,
    },
  });

  await triggerN8n('request.created', request);
  res.status(201).json(request);
}

export async function approveRequest(req: AuthRequest, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const existing = await prisma.assetRequest.findUnique({ where: { id } });
  if (!existing)                     { res.status(404).json({ error: 'Request not found' }); return; }
  if (existing.status !== 'Pending') { res.status(400).json({ error: 'Request is not pending' }); return; }

  const { approvedBy, comments } = req.body;
  const idx       = APPROVAL_STAGES.indexOf(existing.approvalStage);
  const nextStage = APPROVAL_STAGES[idx + 1] ?? 'Done';
  const fullyDone = nextStage === 'Done';

  const updated = await prisma.assetRequest.update({
    where: { id },
    data: {
      approvalStage: nextStage,
      approvedBy:    approvedBy ? String(approvedBy) : 'admin',
      comments:      comments ? String(comments) : existing.comments,
      status:        fullyDone ? 'Approved' : 'Pending',
    },
  });

  await prisma.auditLog.create({
    data: {
      action: fullyDone ? 'APPROVED' : 'STAGE_ADVANCED',
      entityType: 'Request',
      entityId: id,
      entityName: `${existing.requestType} — ${existing.requestedBy}`,
      details: fullyDone
        ? `Fully approved by ${updated.approvedBy}`
        : `Advanced to ${nextStage} by ${updated.approvedBy}`,
    },
  });

  if (fullyDone) await triggerN8n('request.approved', updated);
  res.json(updated);
}

export async function rejectRequest(req: AuthRequest, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const existing = await prisma.assetRequest.findUnique({ where: { id } });
  if (!existing) { res.status(404).json({ error: 'Request not found' }); return; }

  const { rejectedBy, comments } = req.body;
  const updated = await prisma.assetRequest.update({
    where: { id },
    data: {
      status:     'Rejected',
      rejectedBy: rejectedBy ? String(rejectedBy) : 'admin',
      comments:   comments ? String(comments) : existing.comments,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'REJECTED',
      entityType: 'Request',
      entityId: id,
      entityName: `${existing.requestType} — ${existing.requestedBy}`,
      details: `Rejected by ${updated.rejectedBy}${comments ? '. ' + comments : ''}`,
    },
  });

  await triggerN8n('request.rejected', updated);
  res.json(updated);
}

export async function deleteRequest(req: AuthRequest, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const existing = await prisma.assetRequest.findUnique({ where: { id } });
  if (!existing) { res.status(404).json({ error: 'Request not found' }); return; }

  await prisma.assetRequest.delete({ where: { id } });
  res.json({ message: 'Deleted successfully' });
}
