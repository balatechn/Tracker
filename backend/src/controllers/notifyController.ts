import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function daysFromNow(date: Date | null): number | null {
  if (!date) return null;
  const ms = date.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

// GET /notify/expiring?days=30|15|7  — subscriptions expiring in exactly N days
export async function expiringSubscriptions(req: Request, res: Response): Promise<void> {
  const days = parseInt(req.query.days as string);
  if (![7, 15, 30].includes(days)) {
    res.status(400).json({ error: 'days must be 7, 15, or 30' });
    return;
  }

  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() + days);

  const to = new Date(from);
  to.setHours(23, 59, 59, 999);

  const subs = await prisma.subscription.findMany({
    where: { expiryDate: { gte: from, lte: to } },
    orderBy: { criticality: 'asc' },
  });

  res.json({ days, count: subs.length, items: subs });
}

// GET /notify/expired  — subscriptions that expired yesterday
export async function expiredSubscriptions(_req: Request, res: Response): Promise<void> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const end = new Date(yesterday);
  end.setHours(23, 59, 59, 999);

  const subs = await prisma.subscription.findMany({
    where: { expiryDate: { gte: yesterday, lte: end } },
    orderBy: { criticality: 'asc' },
  });

  res.json({ count: subs.length, items: subs });
}

// GET /notify/overdue-tasks  — tasks past end date and not completed
export async function overdueTasks(_req: Request, res: Response): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tasks = await prisma.task.findMany({
    where: {
      endDate: { lt: today },
      status: { notIn: ['Completed', 'Cancelled'] },
    },
    orderBy: { endDate: 'asc' },
  });

  const items = tasks.map(t => ({
    ...t,
    daysOverdue: Math.ceil((Date.now() - t.endDate.getTime()) / (1000 * 60 * 60 * 24)),
  }));

  res.json({ count: items.length, items });
}

// GET /notify/unallocated  — hardware assets unallocated for >30 days
export async function unallocatedAssets(_req: Request, res: Response): Promise<void> {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - 30);

  const hardwareCategories = ['Laptop', 'Desktop', 'Mobile', 'Tablet', 'Monitor', 'Printer', 'Server', 'Networking'];

  const assets = await prisma.entry.findMany({
    where: {
      category: { in: hardwareCategories },
      assetStatus: { not: 'Disposed' },
      allocations: { none: { status: 'Active' } },
      createdAt: { lt: threshold },
    },
  });

  res.json({ count: assets.length, items: assets });
}

// GET /notify/accruals  — subscriptions renewing in next 90 days for Finance report
export async function accruals(_req: Request, res: Response): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in90 = new Date(today);
  in90.setDate(in90.getDate() + 90);

  const subs = await prisma.subscription.findMany({
    where: { expiryDate: { gte: today, lte: in90 } },
    orderBy: { expiryDate: 'asc' },
  });

  // Group by month
  const byMonth: Record<string, { label: string; items: typeof subs; total: number }> = {};
  for (const s of subs) {
    if (!s.expiryDate) continue;
    const key = s.expiryDate.toISOString().slice(0, 7); // "2026-08"
    const label = s.expiryDate.toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
    if (!byMonth[key]) byMonth[key] = { label, items: [], total: 0 };
    byMonth[key].items.push(s);
    byMonth[key].total += s.annualCost ?? 0;
  }

  const grandTotal = subs.reduce((sum, s) => sum + (s.annualCost ?? 0), 0);
  const days = subs.map(s => ({ ...s, daysLeft: daysFromNow(s.expiryDate) }));

  res.json({ count: subs.length, grandTotal, byMonth, items: days });
}

// GET /notify/pending-users  — SSO users pending approval
export async function pendingUsers(_req: Request, res: Response): Promise<void> {
  const users = await prisma.user.findMany({
    where: { status: 'pending' },
    select: { id: true, displayName: true, email: true, authProvider: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ count: users.length, items: users });
}
