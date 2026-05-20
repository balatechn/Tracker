import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { triggerN8n } from '../lib/webhook';

const prisma = new PrismaClient();

const ASSET_SEL = { select: { id: true, serviceName: true, category: true, assetTag: true, serialNumber: true, location: true } };
const EMP_SEL   = { select: { id: true, name: true, empId: true, department: true, email: true } };

export async function getAllocations(req: AuthRequest, res: Response): Promise<void> {
  const { status, employeeId, assetId } = req.query;
  const where: Record<string, unknown> = {};
  if (status && typeof status === 'string' && status !== 'All') where.status = status;
  if (employeeId) where.employeeId = parseInt(String(employeeId));
  if (assetId) where.assetId = parseInt(String(assetId));

  const allocations = await prisma.allocation.findMany({
    where,
    include: { asset: ASSET_SEL, employee: EMP_SEL },
    orderBy: { allocatedAt: 'desc' },
  });
  res.json(allocations);
}

export async function createAllocation(req: AuthRequest, res: Response): Promise<void> {
  const { assetId, employeeId, notes, allocatedAt } = req.body;
  if (!assetId || !employeeId) {
    res.status(400).json({ error: 'assetId and employeeId are required' });
    return;
  }

  const assetIdNum = parseInt(String(assetId));
  const empIdNum   = parseInt(String(employeeId));

  const [asset, employee] = await Promise.all([
    prisma.entry.findUnique({ where: { id: assetIdNum } }),
    prisma.employee.findUnique({ where: { id: empIdNum } }),
  ]);
  if (!asset)    { res.status(404).json({ error: 'Asset not found' }); return; }
  if (!employee) { res.status(404).json({ error: 'Employee not found' }); return; }

  const conflict = await prisma.allocation.findFirst({ where: { assetId: assetIdNum, status: 'Active' } });
  if (conflict) {
    res.status(400).json({ error: 'Asset is already allocated to another employee' });
    return;
  }

  const allocation = await prisma.allocation.create({
    data: {
      assetId:     assetIdNum,
      employeeId:  empIdNum,
      notes:       notes ? String(notes) : null,
      allocatedAt: allocatedAt ? new Date(String(allocatedAt)) : new Date(),
    },
    include: { asset: ASSET_SEL, employee: EMP_SEL },
  });

  await prisma.entry.update({ where: { id: assetIdNum }, data: { assetStatus: 'InUse' } });

  await prisma.auditLog.create({
    data: {
      action: 'ALLOCATED',
      entityType: 'Allocation',
      entityId: allocation.id,
      entityName: asset.serviceName,
      details: `${asset.serviceName} allocated to ${employee.name} (${employee.empId})`,
    },
  });

  await triggerN8n('allocation.created', { allocation, asset, employee });
  res.status(201).json(allocation);
}

export async function returnAsset(req: AuthRequest, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const allocation = await prisma.allocation.findUnique({
    where: { id },
    include: {
      asset:    { select: { id: true, serviceName: true } },
      employee: { select: { id: true, name: true, empId: true } },
    },
  });
  if (!allocation) { res.status(404).json({ error: 'Allocation not found' }); return; }
  if (allocation.status === 'Returned') { res.status(400).json({ error: 'Asset already returned' }); return; }

  const { returnNotes } = req.body;
  const combinedNotes = returnNotes
    ? (allocation.notes ? `${allocation.notes}\n[Return] ${returnNotes}` : `[Return] ${returnNotes}`)
    : allocation.notes;

  const updated = await prisma.allocation.update({
    where: { id },
    data: { status: 'Returned', returnedAt: new Date(), notes: combinedNotes },
    include: { asset: ASSET_SEL, employee: EMP_SEL },
  });

  await prisma.entry.update({ where: { id: allocation.assetId }, data: { assetStatus: 'Available' } });

  await prisma.auditLog.create({
    data: {
      action: 'RETURNED',
      entityType: 'Allocation',
      entityId: id,
      entityName: allocation.asset.serviceName,
      details: `${allocation.asset.serviceName} returned by ${allocation.employee.name} (${allocation.employee.empId})`,
    },
  });

  await triggerN8n('allocation.returned', updated);
  res.json(updated);
}

export async function updateAllocation(req: AuthRequest, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const allocation = await prisma.allocation.findUnique({ where: { id }, include: { asset: ASSET_SEL, employee: EMP_SEL } });
  if (!allocation) { res.status(404).json({ error: 'Allocation not found' }); return; }

  const { employeeId, allocatedAt, notes } = req.body;

  const updateData: Record<string, unknown> = {};
  if (notes !== undefined) updateData.notes = notes ? String(notes) : null;
  if (allocatedAt) updateData.allocatedAt = new Date(String(allocatedAt));
  if (employeeId) {
    const empIdNum = parseInt(String(employeeId));
    const employee = await prisma.employee.findUnique({ where: { id: empIdNum } });
    if (!employee) { res.status(404).json({ error: 'Employee not found' }); return; }
    updateData.employeeId = empIdNum;
  }

  const updated = await prisma.allocation.update({
    where: { id },
    data: updateData,
    include: { asset: ASSET_SEL, employee: EMP_SEL },
  });

  await prisma.auditLog.create({
    data: {
      action: 'UPDATED',
      entityType: 'Allocation',
      entityId: id,
      entityName: allocation.asset.serviceName,
      details: `Allocation #${id} updated`,
    },
  });

  res.json(updated);
}
