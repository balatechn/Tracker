import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';


export async function getAuditLogs(req: AuthRequest, res: Response): Promise<void> {
  const { entityType, limit } = req.query;
  const where: Record<string, unknown> = {};
  if (entityType && typeof entityType === 'string' && entityType !== 'All') {
    where.entityType = entityType;
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit ? Math.min(parseInt(String(limit)), 500) : 200,
  });
  res.json(logs);
}
