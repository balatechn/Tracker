import { Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export async function getEntries(req: AuthRequest, res: Response): Promise<void> {
  const { search, category, criticality } = req.query;

  const where: Prisma.EntryWhereInput = {};

  if (search && typeof search === 'string') {
    where.OR = [
      { serviceName: { contains: search, mode: 'insensitive' } },
      { vendor: { contains: search, mode: 'insensitive' } },
      { owner: { contains: search, mode: 'insensitive' } },
      { billingCompany: { contains: search, mode: 'insensitive' } },
      { remarks: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (category && typeof category === 'string' && category !== 'All') {
    where.category = category;
  }

  if (criticality && typeof criticality === 'string' && criticality !== 'All') {
    where.criticality = criticality;
  }

  const entries = await prisma.entry.findMany({
    where,
    orderBy: [{ srNo: 'asc' }, { createdAt: 'asc' }],
  });

  res.json(entries);
}

export async function getEntry(req: AuthRequest, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid ID' });
    return;
  }

  const entry = await prisma.entry.findUnique({ where: { id } });
  if (!entry) {
    res.status(404).json({ error: 'Entry not found' });
    return;
  }

  res.json(entry);
}

export async function createEntry(req: AuthRequest, res: Response): Promise<void> {
  const data = sanitizeEntryData(req.body);
  const entry = await prisma.entry.create({ data });
  res.status(201).json(entry);
}

export async function updateEntry(req: AuthRequest, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid ID' });
    return;
  }

  const exists = await prisma.entry.findUnique({ where: { id } });
  if (!exists) {
    res.status(404).json({ error: 'Entry not found' });
    return;
  }

  const data = sanitizeEntryData(req.body);
  const entry = await prisma.entry.update({ where: { id }, data });
  res.json(entry);
}

export async function deleteEntry(req: AuthRequest, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid ID' });
    return;
  }

  const exists = await prisma.entry.findUnique({ where: { id } });
  if (!exists) {
    res.status(404).json({ error: 'Entry not found' });
    return;
  }

  await prisma.entry.delete({ where: { id } });
  res.json({ message: 'Deleted successfully' });
}

export async function exportEntries(_req: AuthRequest, res: Response): Promise<void> {
  const entries = await prisma.entry.findMany({
    orderBy: [{ srNo: 'asc' }, { createdAt: 'asc' }],
  });
  res.json(entries);
}

function sanitizeEntryData(body: Record<string, unknown>) {
  return {
    srNo: body.srNo ? Number(body.srNo) : null,
    serviceName: String(body.serviceName || '').trim(),
    category: body.category ? String(body.category).trim() : null,
    billingCompany: body.billingCompany ? String(body.billingCompany).trim() : null,
    vendor: body.vendor ? String(body.vendor).trim() : null,
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
