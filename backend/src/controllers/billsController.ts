import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendMail } from '../services/emailService';

const prisma = new PrismaClient();

const SUBMITTER_CC = process.env.BILL_SUBMITTER_CC ?? 'bala@junobohotels.com';
const BASE_URL = process.env.APP_BASE_URL ?? 'https://itasset.junobohotels.com';

function billEmailHtml(bill: {
  vendorName: string; invoiceNumber: string | null; invoiceDate: Date | null;
  dueDate: Date | null; amount: number; entity: string; paymentMethod: string | null;
  submittedBy: string; remarks: string | null;
}): string {
  const fmt = (d: Date | null) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const fmtAmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2 });

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body{font-family:Segoe UI,Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px}
  .card{background:#fff;border-radius:8px;max-width:680px;margin:0 auto;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)}
  .hdr{background:#0078d4;color:#fff;padding:18px 24px}
  .hdr h1{margin:0;font-size:17px;font-weight:600}
  .hdr p{margin:4px 0 0;font-size:12px;opacity:.85}
  .body{padding:24px}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-top:12px}
  th{background:#f0f4f8;text-align:left;padding:8px 10px;color:#444;font-weight:600;border-bottom:2px solid #dde3ec}
  td{padding:8px 10px;border-bottom:1px solid #eef0f3;color:#333}
  .amt{font-size:22px;font-weight:700;color:#0078d4;margin:12px 0}
  .btn{display:inline-block;margin-top:16px;padding:10px 20px;background:#0078d4;color:#fff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600}
  .footer{text-align:center;font-size:11px;color:#999;padding:14px;border-top:1px solid #eee}
</style></head><body><div class="card">
<div class="hdr"><h1>💳 Bill Submitted for Payment</h1><p>A new bill has been submitted and requires payment processing.</p></div>
<div class="body">
  <div class="amt">${fmtAmt(bill.amount)}</div>
  <table>
    <tr><th>Vendor</th><td>${bill.vendorName}</td></tr>
    <tr><th>Invoice #</th><td>${bill.invoiceNumber ?? '—'}</td></tr>
    <tr><th>Invoice Date</th><td>${fmt(bill.invoiceDate)}</td></tr>
    <tr><th>Due Date</th><td>${bill.dueDate ? `<strong style="color:#c0392b">${fmt(bill.dueDate)}</strong>` : '—'}</td></tr>
    <tr><th>Entity / Company</th><td>${bill.entity}</td></tr>
    <tr><th>Payment Method</th><td>${bill.paymentMethod ?? '—'}</td></tr>
    <tr><th>Submitted By</th><td>${bill.submittedBy}</td></tr>
    <tr><th>Remarks</th><td>${bill.remarks ?? '—'}</td></tr>
  </table>
  <a href="${BASE_URL}" class="btn">View in IT Tracker →</a>
</div>
<div style="padding:14px 24px;border-top:1px solid #eee;font-size:12px;color:#444">Regards,<br><strong>IT Asset Tracker</strong></div>
<div class="footer">Junobo Hotels — IT Asset Tracker · <a href="${BASE_URL}">${BASE_URL}</a></div>
</div></body></html>`;
}

export async function getBills(req: Request, res: Response) {
  try {
    const bills = await prisma.bill.findMany({
      include: { attachments: { select: { id: true, filename: true, filesize: true, mimetype: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(bills);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
}

export async function getBill(req: Request, res: Response) {
  const id = Number(req.params.id);
  try {
    const bill = await prisma.bill.findUnique({
      where: { id },
      include: { attachments: { select: { id: true, filename: true, filesize: true, mimetype: true, createdAt: true } } },
    });
    if (!bill) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(bill);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch bill' });
  }
}

export async function createBill(req: Request, res: Response) {
  try {
    const {
      vendorName, invoiceNumber, invoiceDate, dueDate, amount, entity,
      paymentMethod, submittedBy, submitterEmail, remarks,
    } = req.body;

    if (!vendorName || !amount || !entity || !submittedBy || !submitterEmail) {
      res.status(400).json({ error: 'vendorName, amount, entity, submittedBy, submitterEmail are required' });
      return;
    }

    const bill = await prisma.bill.create({
      data: {
        vendorName,
        invoiceNumber: invoiceNumber || null,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        amount: Number(amount),
        entity,
        paymentMethod: paymentMethod || null,
        submittedBy,
        submitterEmail,
        remarks: remarks || null,
        status: 'Submitted',
      },
    });

    // Send email notification
    try {
      const manager = await prisma.entityManager.findUnique({ where: { entityName: entity } });
      const toList = manager
        ? [{ address: manager.managerEmail, name: manager.managerName }]
        : [{ address: SUBMITTER_CC }];

      const ccList: { address: string; name?: string }[] = [{ address: SUBMITTER_CC }];
      if (submitterEmail && submitterEmail !== SUBMITTER_CC) {
        ccList.push({ address: submitterEmail, name: submittedBy });
      }

      await sendMail({
        to: toList,
        cc: ccList,
        subject: `Bill Payment Request — ${vendorName} — ₹${Number(amount).toLocaleString('en-IN')}`,
        html: billEmailHtml({
          vendorName, invoiceNumber: invoiceNumber || null,
          invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
          dueDate: dueDate ? new Date(dueDate) : null,
          amount: Number(amount), entity, paymentMethod: paymentMethod || null,
          submittedBy, remarks: remarks || null,
        }),
      });
    } catch (mailErr) {
      console.error('[bills] email send failed:', mailErr);
      // Don't fail the request if email fails
    }

    res.status(201).json(bill);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create bill' });
  }
}

export async function updateBill(req: Request, res: Response) {
  const id = Number(req.params.id);
  try {
    const existing = await prisma.bill.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ error: 'Not found' }); return; }

    const {
      vendorName, invoiceNumber, invoiceDate, dueDate, amount, entity,
      paymentMethod, submittedBy, submitterEmail, remarks, status,
      rejectionReason, paidAt, paidBy, transactionRef,
    } = req.body;

    const bill = await prisma.bill.update({
      where: { id },
      data: {
        vendorName: vendorName ?? existing.vendorName,
        invoiceNumber: invoiceNumber !== undefined ? (invoiceNumber || null) : existing.invoiceNumber,
        invoiceDate: invoiceDate !== undefined ? (invoiceDate ? new Date(invoiceDate) : null) : existing.invoiceDate,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : existing.dueDate,
        amount: amount !== undefined ? Number(amount) : existing.amount,
        entity: entity ?? existing.entity,
        paymentMethod: paymentMethod !== undefined ? (paymentMethod || null) : existing.paymentMethod,
        submittedBy: submittedBy ?? existing.submittedBy,
        submitterEmail: submitterEmail ?? existing.submitterEmail,
        remarks: remarks !== undefined ? (remarks || null) : existing.remarks,
        status: status ?? existing.status,
        rejectionReason: rejectionReason !== undefined ? (rejectionReason || null) : existing.rejectionReason,
        paidAt: paidAt !== undefined ? (paidAt ? new Date(paidAt) : null) : existing.paidAt,
        paidBy: paidBy !== undefined ? (paidBy || null) : existing.paidBy,
        transactionRef: transactionRef !== undefined ? (transactionRef || null) : existing.transactionRef,
      },
    });
    res.json(bill);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update bill' });
  }
}

export async function deleteBill(req: Request, res: Response) {
  const id = Number(req.params.id);
  try {
    const existing = await prisma.bill.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ error: 'Not found' }); return; }
    await prisma.billAttachment.deleteMany({ where: { billId: id } });
    await prisma.bill.delete({ where: { id } });
    res.json({ message: 'Deleted' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete bill' });
  }
}

export async function addBillAttachment(req: Request, res: Response) {
  const billId = Number(req.params.id);
  try {
    const { filename, mimetype, data } = req.body;
    if (!filename || !data) { res.status(400).json({ error: 'filename and data required' }); return; }

    const buf = Buffer.from(data, 'base64');
    const att = await prisma.billAttachment.create({
      data: { billId, filename, mimetype: mimetype || null, filesize: buf.length, data: buf },
    });
    res.status(201).json({ id: att.id, filename: att.filename, filesize: att.filesize, mimetype: att.mimetype, createdAt: att.createdAt });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to upload attachment' });
  }
}

export async function getBillAttachment(req: Request, res: Response) {
  const id = Number(req.params.attachId);
  try {
    const att = await prisma.billAttachment.findUnique({ where: { id } });
    if (!att || !att.data) { res.status(404).json({ error: 'Not found' }); return; }
    res.setHeader('Content-Type', att.mimetype ?? 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${att.filename}"`);
    res.send(att.data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to download attachment' });
  }
}
