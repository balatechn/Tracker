import { Allocation } from '@/types';

export function printHandover(allocation: Allocation): void {
  const handoverBy = (typeof window !== 'undefined' ? localStorage.getItem('username') : null) || 'IT Admin';
  const date = new Date(allocation.allocatedAt).toLocaleDateString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
  const now = new Date();
  const transferNo = `HO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(allocation.id).padStart(4, '0')}`;

  const serialRow = allocation.asset.serialNumber
    ? `<tr><td></td><td>${allocation.asset.serialNumber}</td><td></td><td></td><td>Serial No.</td></tr>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Asset Handover Report — ${allocation.employee.name}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:11px;color:#000;background:#fff;padding:24px;max-width:820px;margin:0 auto}
    .logo-bar{text-align:center;padding:18px 0 14px;margin-bottom:6px}
    .report-title{text-align:center;font-size:20px;font-weight:bold;padding:12px 0 10px;border-bottom:2px solid #000;margin-bottom:10px}
    .info-grid{width:100%;border-collapse:collapse;margin-bottom:12px}
    .info-grid td{border:1px solid #999;padding:6px 8px;vertical-align:middle}
    .info-grid .lbl{background:#e0e0e0;font-weight:bold;width:18%;white-space:nowrap}
    .intro{font-size:11px;margin:10px 0 8px;line-height:1.5}
    .asset-tbl{width:100%;border-collapse:collapse;margin-bottom:18px}
    .asset-tbl th{background:#0056b3;color:#fff;border:1px solid #004494;padding:7px 8px;text-align:center;font-size:11px}
    .asset-tbl td{border:1px solid #bbb;padding:6px 8px;height:28px}
    .asset-tbl td:first-child,.asset-tbl td:nth-child(4){text-align:center}
    .sig-section{margin:12px 0 6px}
    .ack-title{color:#c00;font-weight:bold;font-size:13px;margin:18px 0 8px}
    .declaration{line-height:1.8;margin-bottom:14px}
    .underline{display:inline-block;min-width:180px;border-bottom:1px solid #000;vertical-align:bottom}
    .emp-sig{font-weight:bold;margin-top:18px;font-size:12px}
    .footer{margin-top:18px;font-style:italic;font-size:10px;color:#555;border-top:1px solid #ccc;padding-top:8px}
    .print-btn{margin-top:16px;padding:9px 24px;background:#0056b3;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;font-weight:bold}
    .print-btn:hover{background:#004494}
    @media print{.print-btn{display:none}body{padding:12px}}
  </style>
</head>
<body>
  <div class="logo-bar">
    <img src="https://junobohotels.com/logo_full.webp" alt="Junobo Hotels" style="height:50px">
  </div>

  <div class="report-title">Asset Handover Report</div>

  <table class="info-grid">
    <tr>
      <td class="lbl">Employee Name:</td>
      <td><strong>${allocation.employee.name}</strong></td>
      <td class="lbl">Asset Transfer No:</td>
      <td><strong>${transferNo}</strong></td>
    </tr>
    <tr>
      <td class="lbl">Employee Code:</td>
      <td>${allocation.employee.empId}</td>
      <td class="lbl">Handover Date:</td>
      <td>${date}</td>
    </tr>
    <tr>
      <td class="lbl">Department:</td>
      <td>${allocation.employee.department}</td>
      <td class="lbl">Handover by:</td>
      <td>${handoverBy.toUpperCase()}</td>
    </tr>
  </table>

  <p class="intro">Please find the below assets handed over to you, to support you in carrying out your assignment in a most Proficient manner.</p>

  <table class="asset-tbl">
    <thead>
      <tr>
        <th style="width:8%">Sl.No.</th>
        <th style="width:35%">Particulars</th>
        <th style="width:25%">Asset Code</th>
        <th style="width:10%">Qty</th>
        <th style="width:22%">Remarks</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>${allocation.asset.serviceName}</td>
        <td>${allocation.asset.assetTag || ''}</td>
        <td>1</td>
        <td>${allocation.notes || ''}</td>
      </tr>
      ${serialRow}
      <tr><td></td><td></td><td></td><td></td><td></td></tr>
      <tr><td></td><td></td><td></td><td></td><td></td></tr>
      <tr><td></td><td></td><td></td><td></td><td></td></tr>
    </tbody>
  </table>

  <div class="sig-section">
    <p><strong>Authorized Signature</strong></p>
    <p style="margin-top:4px">MANAGER IT</p>
  </div>

  <p class="ack-title">Acknowledgement and Declaration by Employee</p>
  <p class="declaration">
    I, <span class="underline">${allocation.employee.name.toUpperCase()}</span>&nbsp;&nbsp;hereby acknowledge that I have received the above-mentioned assets. I understand that this asset belongs to the company and is <u>under</u> my possession for carrying out my office work. I hereby <u>assure</u> that I will take care of the assets of the company to the best possible extend.
  </p>

  <p class="emp-sig">Employee Signature:</p>

  <p class="footer">A copy of handover will be recorded in personal employee file by HR department.</p>

  <button class="print-btn" onclick="window.print()">&#128438; Print / Save as PDF</button>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=870,height=950,scrollbars=yes');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
