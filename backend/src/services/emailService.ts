const TENANT_ID = process.env.AZURE_TENANT_ID ?? '';
const CLIENT_ID = process.env.AZURE_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET ?? '';
const SENDER = process.env.MAIL_FROM ?? 'connect@nationalgroupindia.com';

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
  });

  const resp = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    { method: 'POST', body: params }
  );

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Token fetch failed: ${err}`);
  }

  const data = await resp.json() as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

export interface Recipient { address: string; name?: string }

export async function sendMail(opts: {
  to: Recipient[];
  cc?: Recipient[];
  subject: string;
  html: string;
}): Promise<void> {
  if (!CLIENT_SECRET) {
    console.warn('[email] AZURE_CLIENT_SECRET not set — skipping email send');
    return;
  }

  const token = await getAccessToken();

  const message = {
    subject: opts.subject,
    body: { contentType: 'HTML', content: opts.html },
    toRecipients: opts.to.map(r => ({ emailAddress: { address: r.address, name: r.name ?? r.address } })),
    ccRecipients: (opts.cc ?? []).map(r => ({ emailAddress: { address: r.address, name: r.name ?? r.address } })),
  };

  const resp = await fetch(
    `https://graph.microsoft.com/v1.0/users/${SENDER}/sendMail`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, saveToSentItems: true }),
    }
  );

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`sendMail failed (${resp.status}): ${err}`);
  }
}

// ── HTML email templates ─────────────────────────────────────────────────────

const BASE_URL = process.env.APP_BASE_URL ?? 'https://itasset.nationalgroupindia.com';

function baseLayout(title: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body { font-family: Segoe UI, Arial, sans-serif; background:#f5f5f5; margin:0; padding:20px; }
  .card { background:#fff; border-radius:8px; max-width:720px; margin:0 auto; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,.1); }
  .header { background:#0078d4; color:#fff; padding:20px 24px; }
  .header h1 { margin:0; font-size:18px; font-weight:600; }
  .header p { margin:4px 0 0; font-size:13px; opacity:.85; }
  .body { padding:24px; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  th { background:#f0f4f8; text-align:left; padding:8px 10px; color:#444; font-weight:600; border-bottom:2px solid #dde3ec; }
  td { padding:8px 10px; border-bottom:1px solid #eef0f3; color:#333; vertical-align:top; }
  tr:last-child td { border-bottom:none; }
  .badge { display:inline-block; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:600; }
  .red { background:#fde8e8; color:#c0392b; }
  .orange { background:#fef3e2; color:#b7570a; }
  .blue { background:#e8f4fd; color:#0063b1; }
  .gray { background:#f0f0f0; color:#555; }
  .btn { display:inline-block; margin-top:16px; padding:10px 20px; background:#0078d4; color:#fff; text-decoration:none; border-radius:6px; font-size:13px; font-weight:600; }
  .footer { text-align:center; font-size:11px; color:#999; padding:16px; border-top:1px solid #eee; }
  .total-row td { font-weight:700; background:#f7faff; }
  .month-header td { background:#e8f0fe; font-weight:700; color:#1a56db; font-size:13px; padding:10px; }
</style>
</head><body><div class="card">
<div class="header"><h1>🏢 National Group India — IT Asset Tracker</h1><p>${title}</p></div>
<div class="body">${body}</div>
<div class="footer">This is an automated alert from the IT Asset Tracker · <a href="${BASE_URL}">${BASE_URL}</a></div>
</div></body></html>`;
}

function critBadge(c: string | null): string {
  const cls = c === 'Critical' || c === 'High' ? 'red' : c === 'Medium' ? 'orange' : 'gray';
  return `<span class="badge ${cls}">${c ?? 'N/A'}</span>`;
}

function daysBadge(days: number): string {
  const cls = days <= 7 ? 'red' : days <= 15 ? 'orange' : 'blue';
  return `<span class="badge ${cls}">${days}d</span>`;
}

function formatCurrency(n: number | null): string {
  if (!n) return '—';
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(d: Date | null | string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

type SubItem = {
  name: string; type: string; criticality: string | null;
  expiryDate: Date | null; owner: string | null;
  annualCost: number | null; paymentMethod: string | null;
  autoRenewal: boolean;
};

export function buildExpiryEmail(days: number, items: SubItem[]): string {
  const urgency = days <= 7 ? '🔴 URGENT' : days <= 15 ? '🟠 Warning' : '🟡 Reminder';
  const rows = items.map(s => `<tr>
    <td>${s.name}</td>
    <td><span class="badge blue">${s.type}</span></td>
    <td>${critBadge(s.criticality)}</td>
    <td>${formatDate(s.expiryDate)}</td>
    <td>${daysBadge(days)}</td>
    <td>${s.owner ?? '—'}</td>
    <td>${formatCurrency(s.annualCost)}</td>
    <td>${s.autoRenewal ? '✅ Yes' : '❌ No'}</td>
  </tr>`).join('');

  const body = `
    <p><strong>${urgency}</strong> — ${items.length} subscription${items.length > 1 ? 's' : ''} expiring in <strong>${days} days</strong>.</p>
    <table>
      <tr><th>Name</th><th>Type</th><th>Criticality</th><th>Expiry</th><th>Days Left</th><th>Owner</th><th>Annual Cost</th><th>Auto-Renew</th></tr>
      ${rows}
    </table>
    <a href="${BASE_URL}/dashboard" class="btn">Review in IT Tracker →</a>`;

  return baseLayout(`Subscription Expiry Alert — ${days} Days`, body);
}

export function buildExpiredEmail(items: SubItem[]): string {
  const rows = items.map(s => `<tr>
    <td>${s.name}</td><td><span class="badge blue">${s.type}</span></td>
    <td>${critBadge(s.criticality)}</td><td>${formatDate(s.expiryDate)}</td>
    <td>${s.owner ?? '—'}</td><td>${formatCurrency(s.annualCost)}</td>
  </tr>`).join('');

  const body = `
    <p>🔴 <strong>Action Required</strong> — ${items.length} subscription${items.length > 1 ? 's have' : ' has'} <strong>expired yesterday</strong>.</p>
    <table>
      <tr><th>Name</th><th>Type</th><th>Criticality</th><th>Expired On</th><th>Owner</th><th>Annual Cost</th></tr>
      ${rows}
    </table>
    <a href="${BASE_URL}/dashboard" class="btn">Take Action →</a>`;

  return baseLayout('Subscription Expired — Immediate Action Required', body);
}

export function buildOverdueTasksEmail(items: { taskName: string; projectName: string | null; assignedTo: string | null; endDate: Date; daysOverdue: number; priority: string }[]): string {
  const rows = items.map(t => `<tr>
    <td>${t.taskName}</td><td>${t.projectName ?? '—'}</td>
    <td>${t.assignedTo ?? '—'}</td><td>${formatDate(t.endDate)}</td>
    <td><span class="badge red">${t.daysOverdue}d overdue</span></td>
    <td>${t.priority}</td>
  </tr>`).join('');

  const body = `
    <p>⚠️ <strong>${items.length} task${items.length > 1 ? 's are' : ' is'} overdue</strong> and require attention.</p>
    <table>
      <tr><th>Task</th><th>Project</th><th>Assigned To</th><th>Due Date</th><th>Overdue By</th><th>Priority</th></tr>
      ${rows}
    </table>
    <a href="${BASE_URL}/dashboard" class="btn">View Tasks →</a>`;

  return baseLayout('Overdue Tasks Alert', body);
}

export function buildUnallocatedEmail(items: { serviceName: string; category: string | null; assetTag: string | null; location: string | null; createdAt: Date }[]): string {
  const rows = items.map(a => `<tr>
    <td>${a.serviceName}</td><td>${a.category ?? '—'}</td>
    <td>${a.assetTag ?? '—'}</td><td>${a.location ?? '—'}</td>
    <td>${formatDate(a.createdAt)}</td>
  </tr>`).join('');

  const body = `
    <p>📦 <strong>${items.length} hardware asset${items.length > 1 ? 's have' : ' has'} been unallocated for more than 30 days.</strong></p>
    <table>
      <tr><th>Asset Name</th><th>Category</th><th>Asset Tag</th><th>Location</th><th>Since</th></tr>
      ${rows}
    </table>
    <a href="${BASE_URL}/dashboard" class="btn">Manage Assets →</a>`;

  return baseLayout('Unallocated Hardware Assets', body);
}

export function buildPendingUsersEmail(items: { displayName: string | null; email: string | null; createdAt: Date }[]): string {
  const rows = items.map(u => `<tr>
    <td>${u.displayName ?? '—'}</td><td>${u.email ?? '—'}</td><td>${formatDate(u.createdAt)}</td>
  </tr>`).join('');

  const body = `
    <p>👤 <strong>${items.length} new Microsoft SSO user${items.length > 1 ? 's' : ''} pending your approval.</strong></p>
    <table>
      <tr><th>Name</th><th>Email</th><th>Requested</th></tr>
      ${rows}
    </table>
    <a href="${BASE_URL}/dashboard" class="btn">Approve Users →</a>`;

  return baseLayout('New User Approval Required', body);
}

type AccrualItem = {
  srNo: number | null; name: string; type: string;
  expiryDate: Date | null; annualCost: number | null;
  paymentMethod: string | null; autoRenewal: boolean;
  owner: string | null; daysLeft: number | null;
};

export function buildAccrualsEmail(
  byMonth: Record<string, { label: string; items: AccrualItem[]; total: number }>,
  grandTotal: number,
  weekOf: string
): string {
  let tableRows = '';
  let srNo = 1;

  for (const [, group] of Object.entries(byMonth)) {
    tableRows += `<tr class="month-header"><td colspan="8">📅 ${group.label} — ${formatCurrency(group.total)}</td></tr>`;
    tableRows += group.items.map(s => `<tr>
      <td>${srNo++}</td>
      <td>${s.name}</td>
      <td><span class="badge blue">${s.type}</span></td>
      <td>${formatDate(s.expiryDate)}</td>
      <td>${s.daysLeft !== null ? daysBadge(s.daysLeft) : '—'}</td>
      <td><strong>${formatCurrency(s.annualCost)}</strong></td>
      <td>${s.paymentMethod ?? '—'}</td>
      <td>${s.autoRenewal ? '✅' : '❌'}</td>
    </tr>`).join('');
  }

  tableRows += `<tr class="total-row">
    <td colspan="5">Grand Total (next 90 days)</td>
    <td>${formatCurrency(grandTotal)}</td><td colspan="2"></td>
  </tr>`;

  const body = `
    <p>Weekly accruals report for the week of <strong>${weekOf}</strong>.</p>
    <p>Total renewals due in the next 90 days: <strong>${formatCurrency(grandTotal)}</strong></p>
    <table>
      <tr><th>#</th><th>Name</th><th>Type</th><th>Expiry</th><th>Days Left</th><th>Annual Cost</th><th>Payment</th><th>Auto-Renew</th></tr>
      ${tableRows}
    </table>
    <a href="${BASE_URL}/dashboard" class="btn">View in IT Tracker →</a>`;

  return baseLayout(`Weekly Subscription Accruals — ${weekOf}`, body);
}
