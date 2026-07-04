import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import {
  sendMail,
  buildExpiryEmail, buildExpiredEmail, buildOverdueTasksEmail,
  buildUnallocatedEmail, buildPendingUsersEmail, buildAccrualsEmail,
} from './emailService';

const prisma = new PrismaClient();

const ADMIN = { address: 'bala@nationalgroupindia.com', name: 'Bala — IT Admin' };
const FINANCE = [
  { address: 'atique@nationalgroupindia.com', name: 'Atique' },
  { address: 'prasanna.h@nationalgroupindia.com', name: 'Prasanna H' },
];

function daysFromNow(date: Date | null): number | null {
  if (!date) return null;
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// ── Helper: subscriptions expiring in exactly N days ────────────────────────
async function getExpiringIn(days: number) {
  const from = new Date(); from.setHours(0, 0, 0, 0); from.setDate(from.getDate() + days);
  const to   = new Date(from); to.setHours(23, 59, 59, 999);
  return prisma.subscription.findMany({ where: { expiryDate: { gte: from, lte: to } }, orderBy: { criticality: 'asc' } });
}

// ── Daily 9am IST (3:30 UTC) — expiry + expired + tasks + pending users ─────
cron.schedule('30 3 * * *', async () => {
  console.log('[scheduler] Running daily alerts...');
  try {
    // Expiry alerts: 30 / 15 / 7 days — separate emails per threshold
    for (const days of [30, 15, 7]) {
      const items = await getExpiringIn(days);
      if (items.length > 0) {
        const html = buildExpiryEmail(days, items);
        await sendMail({
          to: [ADMIN],
          subject: `⚠️ [IT Tracker] ${items.length} Subscription${items.length > 1 ? 's' : ''} Expiring in ${days} Days`,
          html,
        });
        console.log(`[scheduler] Sent ${days}-day expiry alert (${items.length} items)`);
      }
    }

    // Expired yesterday
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); yesterday.setHours(0, 0, 0, 0);
    const end = new Date(yesterday); end.setHours(23, 59, 59, 999);
    const expired = await prisma.subscription.findMany({ where: { expiryDate: { gte: yesterday, lte: end } } });
    if (expired.length > 0) {
      await sendMail({
        to: [ADMIN],
        subject: `🔴 [IT Tracker] ${expired.length} Subscription${expired.length > 1 ? 's' : ''} EXPIRED — Action Required`,
        html: buildExpiredEmail(expired),
      });
      console.log(`[scheduler] Sent expired alert (${expired.length} items)`);
    }

    // Overdue tasks
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tasks = await prisma.task.findMany({
      where: { endDate: { lt: today }, status: { notIn: ['Completed', 'Cancelled'] } },
      orderBy: { endDate: 'asc' },
    });
    if (tasks.length > 0) {
      const taskItems = tasks.map(t => ({
        ...t,
        daysOverdue: Math.ceil((Date.now() - t.endDate.getTime()) / (1000 * 60 * 60 * 24)),
      }));
      await sendMail({
        to: [ADMIN],
        subject: `⚠️ [IT Tracker] ${tasks.length} Overdue Task${tasks.length > 1 ? 's' : ''}`,
        html: buildOverdueTasksEmail(taskItems),
      });
      console.log(`[scheduler] Sent overdue tasks alert (${tasks.length} items)`);
    }

    // Pending SSO users
    const pendingUsers = await prisma.user.findMany({
      where: { status: 'pending' },
      select: { displayName: true, email: true, createdAt: true },
    });
    if (pendingUsers.length > 0) {
      await sendMail({
        to: [ADMIN],
        subject: `👤 [IT Tracker] ${pendingUsers.length} User${pendingUsers.length > 1 ? 's' : ''} Pending Approval`,
        html: buildPendingUsersEmail(pendingUsers),
      });
      console.log(`[scheduler] Sent pending users alert (${pendingUsers.length} users)`);
    }

  } catch (err) {
    console.error('[scheduler] Daily alerts error:', err);
  }
}, { timezone: 'Asia/Kolkata' });

// ── Every Monday 9am IST — unallocated hardware ─────────────────────────────
cron.schedule('0 9 * * 1', async () => {
  console.log('[scheduler] Running unallocated assets check...');
  try {
    const threshold = new Date(); threshold.setDate(threshold.getDate() - 30);
    const hardwareCats = ['Laptop','Desktop','Mobile','Tablet','Monitor','Printer','Server','Networking'];
    const assets = await prisma.entry.findMany({
      where: {
        category: { in: hardwareCats },
        assetStatus: { not: 'Disposed' },
        allocations: { none: { status: 'Active' } },
        createdAt: { lt: threshold },
      },
    });
    if (assets.length > 0) {
      await sendMail({
        to: [ADMIN],
        subject: `📦 [IT Tracker] ${assets.length} Unallocated Hardware Asset${assets.length > 1 ? 's' : ''} (>30 days)`,
        html: buildUnallocatedEmail(assets),
      });
      console.log(`[scheduler] Sent unallocated alert (${assets.length} assets)`);
    }
  } catch (err) {
    console.error('[scheduler] Unallocated assets error:', err);
  }
}, { timezone: 'Asia/Kolkata' });

// ── Every Monday 8am IST — Finance accruals report ──────────────────────────
cron.schedule('0 8 * * 1', async () => {
  console.log('[scheduler] Running weekly accruals report...');
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const in90  = new Date(today); in90.setDate(in90.getDate() + 90);

    const subs = await prisma.subscription.findMany({
      where: { expiryDate: { gte: today, lte: in90 } },
      orderBy: { expiryDate: 'asc' },
    });

    if (subs.length === 0) {
      console.log('[scheduler] No accruals this week');
      return;
    }

    // Group by month
    const byMonth: Record<string, { label: string; items: typeof subs; total: number }> = {};
    for (const s of subs) {
      if (!s.expiryDate) continue;
      const key = s.expiryDate.toISOString().slice(0, 7);
      const label = s.expiryDate.toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
      if (!byMonth[key]) byMonth[key] = { label, items: [], total: 0 };
      byMonth[key].items.push(s);
      byMonth[key].total += s.annualCost ?? 0;
    }

    const grandTotal = subs.reduce((sum, s) => sum + (s.annualCost ?? 0), 0);
    const itemsWithDays = subs.map(s => ({ ...s, daysLeft: daysFromNow(s.expiryDate) }));
    const weekOf = today.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    await sendMail({
      to: FINANCE,
      cc: [ADMIN],
      subject: `📊 [IT Tracker] Weekly Subscription Accruals — ${weekOf}`,
      html: buildAccrualsEmail(
        byMonth as Record<string, { label: string; items: typeof itemsWithDays; total: number }>,
        grandTotal,
        weekOf
      ),
    });
    console.log(`[scheduler] Sent accruals report (${subs.length} items, ₹${grandTotal.toLocaleString()})`);
  } catch (err) {
    console.error('[scheduler] Accruals report error:', err);
  }
}, { timezone: 'Asia/Kolkata' });

// ── Immediate alert: new pending SSO user ────────────────────────────────────
// Called from authController when a new user is created with status=pending
export async function alertNewPendingUser(user: { displayName: string | null; email: string | null; createdAt: Date }) {
  try {
    await sendMail({
      to: [ADMIN],
      subject: `👤 [IT Tracker] New User Requesting Access: ${user.displayName ?? user.email ?? 'Unknown'}`,
      html: buildPendingUsersEmail([user]),
    });
    console.log(`[scheduler] Sent new-user alert for ${user.email}`);
  } catch (err) {
    console.error('[scheduler] New user alert error:', err);
  }
}

console.log('[scheduler] All cron jobs registered (timezone: Asia/Kolkata)');
