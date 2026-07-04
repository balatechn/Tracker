import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import {
  sendMail,
  buildExpiryEmail, buildExpiredEmail, buildOverdueTasksEmail,
  buildUnallocatedEmail, buildPendingUsersEmail, buildAccrualsEmail,
  buildAutoRenewalOffEmail, buildHighCriticalityEmail, buildDomainExpiryEmail,
  buildWeeklyRenewalEmail, buildMonthlyCostSummaryEmail,
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

    // Auto-renewal OFF + expiring ≤30 days
    const in30 = new Date(); in30.setDate(in30.getDate() + 30); in30.setHours(23, 59, 59, 999);
    const noAutoRenewal = await prisma.subscription.findMany({
      where: { autoRenewal: false, expiryDate: { gte: new Date(), lte: in30 } },
      orderBy: { expiryDate: 'asc' },
    });
    if (noAutoRenewal.length > 0) {
      await sendMail({
        to: [ADMIN],
        subject: `⚠️ [IT Tracker] ${noAutoRenewal.length} Subscription${noAutoRenewal.length > 1 ? 's' : ''} Expiring — Auto-Renewal OFF`,
        html: buildAutoRenewalOffEmail(noAutoRenewal),
      });
      console.log(`[scheduler] Sent auto-renewal-off alert (${noAutoRenewal.length} items)`);
    }

    // High/Critical criticality expiring ≤60 days
    const in60 = new Date(); in60.setDate(in60.getDate() + 60); in60.setHours(23, 59, 59, 999);
    const highCrit = await prisma.subscription.findMany({
      where: {
        criticality: { in: ['High', 'Critical'] },
        expiryDate: { gte: new Date(), lte: in60 },
      },
      orderBy: [{ criticality: 'asc' }, { expiryDate: 'asc' }],
    });
    if (highCrit.length > 0) {
      await sendMail({
        to: [ADMIN],
        subject: `🔴 [IT Tracker] ${highCrit.length} High/Critical Subscription${highCrit.length > 1 ? 's' : ''} Expiring in 60 Days`,
        html: buildHighCriticalityEmail(highCrit),
      });
      console.log(`[scheduler] Sent high-criticality alert (${highCrit.length} items)`);
    }

    // Domain-only expiry ≤30 days
    const domains = await prisma.subscription.findMany({
      where: { type: 'Domain', expiryDate: { gte: new Date(), lte: in30 } },
      orderBy: { expiryDate: 'asc' },
    });
    if (domains.length > 0) {
      await sendMail({
        to: [ADMIN],
        subject: `🌐 [IT Tracker] ${domains.length} Domain${domains.length > 1 ? 's' : ''} Expiring in 30 Days`,
        html: buildDomainExpiryEmail(domains),
      });
      console.log(`[scheduler] Sent domain expiry alert (${domains.length} domains)`);
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

// ── Every Monday 9am IST — renewal due this week (Finance + Admin) ──────────
cron.schedule('0 9 * * 1', async () => {
  console.log('[scheduler] Running weekly renewal checklist...');
  try {
    const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 6); weekEnd.setHours(23, 59, 59, 999);
    const weekEndStr = weekEnd.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const renewals = await prisma.subscription.findMany({
      where: { expiryDate: { gte: new Date(), lte: weekEnd } },
      orderBy: { expiryDate: 'asc' },
    });

    if (renewals.length > 0) {
      await sendMail({
        to: FINANCE,
        cc: [ADMIN],
        subject: `📅 [IT Tracker] ${renewals.length} Subscription${renewals.length > 1 ? 's' : ''} Due This Week`,
        html: buildWeeklyRenewalEmail(renewals, weekEndStr),
      });
      console.log(`[scheduler] Sent weekly renewal checklist (${renewals.length} items)`);
    }
  } catch (err) {
    console.error('[scheduler] Weekly renewal checklist error:', err);
  }
}, { timezone: 'Asia/Kolkata' });

// ── 1st of month 9am IST — monthly cost summary (Finance + Admin) ───────────
cron.schedule('0 9 1 * *', async () => {
  console.log('[scheduler] Running monthly cost summary...');
  try {
    const month = new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

    const allSubs = await prisma.subscription.findMany({
      where: { annualCost: { gt: 0 } },
    });

    if (allSubs.length === 0) return;

    const byType: Record<string, { count: number; total: number }> = {};
    for (const s of allSubs) {
      const t = s.type || 'Other';
      if (!byType[t]) byType[t] = { count: 0, total: 0 };
      byType[t].count++;
      byType[t].total += s.annualCost ?? 0;
    }
    const grandTotal = allSubs.reduce((sum, s) => sum + (s.annualCost ?? 0), 0);

    await sendMail({
      to: FINANCE,
      cc: [ADMIN],
      subject: `📊 [IT Tracker] Monthly IT Subscription Cost Summary — ${month}`,
      html: buildMonthlyCostSummaryEmail(byType, grandTotal, month),
    });
    console.log(`[scheduler] Sent monthly cost summary (${allSubs.length} items, ₹${grandTotal.toLocaleString()})`);
  } catch (err) {
    console.error('[scheduler] Monthly cost summary error:', err);
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
