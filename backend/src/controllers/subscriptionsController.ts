import { Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export async function getSubscriptions(req: AuthRequest, res: Response): Promise<void> {
  const { search, type, criticality } = req.query;

  const where: Prisma.SubscriptionWhereInput = {};

  if (search && typeof search === 'string') {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { billingCompany: { contains: search, mode: 'insensitive' } },
      { registrar: { contains: search, mode: 'insensitive' } },
      { owner: { contains: search, mode: 'insensitive' } },
      { remarks: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (type && typeof type === 'string' && type !== 'All') {
    where.type = type;
  }

  if (criticality && typeof criticality === 'string' && criticality !== 'All') {
    where.criticality = criticality;
  }

  const subscriptions = await prisma.subscription.findMany({
    where,
    orderBy: [{ srNo: 'asc' }, { createdAt: 'asc' }],
  });

  res.json(subscriptions);
}

export async function createSubscription(req: AuthRequest, res: Response): Promise<void> {
  const data = sanitize(req.body);
  if (!data.name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const sub = await prisma.subscription.create({ data });

  await prisma.auditLog.create({
    data: {
      action: 'CREATE',
      entityType: 'Subscription',
      entityId: sub.id,
      entityName: sub.name,
      userId: req.userId != null ? String(req.userId) : 'admin',
      details: `Created ${sub.type} subscription: ${sub.name}`,
    },
  });

  res.status(201).json(sub);
}

export async function updateSubscription(req: AuthRequest, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const exists = await prisma.subscription.findUnique({ where: { id } });
  if (!exists) { res.status(404).json({ error: 'Subscription not found' }); return; }

  const data = sanitize(req.body);
  const sub = await prisma.subscription.update({ where: { id }, data });

  await prisma.auditLog.create({
    data: {
      action: 'UPDATE',
      entityType: 'Subscription',
      entityId: sub.id,
      entityName: sub.name,
      userId: req.userId != null ? String(req.userId) : 'admin',
      details: `Updated ${sub.type} subscription: ${sub.name}`,
    },
  });

  res.json(sub);
}

export async function deleteSubscription(req: AuthRequest, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const exists = await prisma.subscription.findUnique({ where: { id } });
  if (!exists) { res.status(404).json({ error: 'Subscription not found' }); return; }

  await prisma.subscription.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      action: 'DELETE',
      entityType: 'Subscription',
      entityId: id,
      entityName: exists.name,
      userId: req.userId != null ? String(req.userId) : 'admin',
      details: `Deleted ${exists.type} subscription: ${exists.name}`,
    },
  });

  res.json({ message: 'Deleted successfully' });
}

export async function exportSubscriptions(_req: AuthRequest, res: Response): Promise<void> {
  const subscriptions = await prisma.subscription.findMany({
    orderBy: [{ srNo: 'asc' }, { createdAt: 'asc' }],
  });
  res.json(subscriptions);
}

function sanitize(body: Record<string, unknown>) {
  return {
    srNo: body.srNo ? Number(body.srNo) : null,
    name: String(body.name || '').trim(),
    type: body.type ? String(body.type).trim() : 'SAAS',
    billingCompany: body.billingCompany ? String(body.billingCompany).trim() : null,
    registrar: body.registrar ? String(body.registrar).trim() : null,
    expiryDate: body.expiryDate ? new Date(String(body.expiryDate)) : null,
    autoRenewal: Boolean(body.autoRenewal),
    owner: body.owner ? String(body.owner).trim() : null,
    criticality: body.criticality ? String(body.criticality).trim() : null,
    lastRenewalDate: body.lastRenewalDate ? new Date(String(body.lastRenewalDate)) : null,
    renewalPeriod: body.renewalPeriod ? Number(body.renewalPeriod) : null,
    annualCost: body.annualCost ? Number(body.annualCost) : null,
    paymentMethod: body.paymentMethod ? String(body.paymentMethod).trim() : null,
    invoiceRef: body.invoiceRef ? String(body.invoiceRef).trim() : null,
    financeEmail: body.financeEmail ? String(body.financeEmail).trim() : null,
    adminEmail: body.adminEmail ? String(body.adminEmail).trim() : null,
    vendorEmail: body.vendorEmail ? String(body.vendorEmail).trim() : null,
    remarks: body.remarks ? String(body.remarks).trim() : null,
  };
}
