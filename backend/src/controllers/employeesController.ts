import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { triggerN8n } from '../lib/webhook';

const prisma = new PrismaClient();

async function nextEmpId(): Promise<string> {
  const last = await prisma.employee.findFirst({ orderBy: { id: 'desc' } });
  const num = last ? parseInt(last.empId.replace(/\D/g, '')) + 1 : 1;
  return `EMP${String(num).padStart(4, '0')}`;
}

export async function getEmployees(req: AuthRequest, res: Response): Promise<void> {
  const { search, status, department } = req.query;
  const where: Record<string, unknown> = {};

  if (search && typeof search === 'string') {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { empId: { contains: search, mode: 'insensitive' } },
      { department: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (status && typeof status === 'string' && status !== 'All') where.status = status;
  if (department && typeof department === 'string' && department !== 'All') where.department = department;

  const employees = await prisma.employee.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      allocations: {
        where: { status: 'Active' },
        include: { asset: { select: { id: true, serviceName: true, category: true, assetTag: true } } },
      },
    },
  });
  res.json(employees);
}

export async function createEmployee(req: AuthRequest, res: Response): Promise<void> {
  const { empId, name, email, department, designation, phone, manager, status, joiningDate } = req.body;
  if (!name || !email || !department) {
    res.status(400).json({ error: 'name, email and department are required' });
    return;
  }

  const autoId = empId ? String(empId).trim() : await nextEmpId();

  const employee = await prisma.employee.create({
    data: {
      empId: autoId,
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      department: String(department).trim(),
      designation: designation ? String(designation).trim() : null,
      phone: phone ? String(phone).trim() : null,
      manager: manager ? String(manager).trim() : null,
      status: status || 'Active',
      joiningDate: joiningDate ? new Date(String(joiningDate)) : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'CREATED',
      entityType: 'Employee',
      entityId: employee.id,
      entityName: employee.name,
      details: `${employee.name} (${employee.empId}) joined ${employee.department}`,
    },
  });

  await triggerN8n('employee.created', employee);
  res.status(201).json(employee);
}

export async function updateEmployee(req: AuthRequest, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) { res.status(404).json({ error: 'Employee not found' }); return; }

  const { name, email, department, designation, phone, manager, status, joiningDate, exitDate } = req.body;
  const wasActive = existing.status === 'Active';
  const nowResigned = status === 'Resigned';

  const employee = await prisma.employee.update({
    where: { id },
    data: {
      name: name ? String(name).trim() : existing.name,
      email: email ? String(email).trim().toLowerCase() : existing.email,
      department: department ? String(department).trim() : existing.department,
      designation: designation !== undefined ? (designation ? String(designation).trim() : null) : existing.designation,
      phone: phone !== undefined ? (phone ? String(phone).trim() : null) : existing.phone,
      manager: manager !== undefined ? (manager ? String(manager).trim() : null) : existing.manager,
      status: status || existing.status,
      joiningDate: joiningDate ? new Date(String(joiningDate)) : existing.joiningDate,
      exitDate: exitDate ? new Date(String(exitDate)) : (exitDate === '' ? null : existing.exitDate),
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'UPDATED',
      entityType: 'Employee',
      entityId: employee.id,
      entityName: employee.name,
      details: `Status: ${employee.status}${nowResigned && wasActive ? ' (resigned)' : ''}`,
    },
  });

  if (wasActive && nowResigned) {
    await triggerN8n('employee.resigned', employee);
  }

  res.json(employee);
}

export async function deleteEmployee(req: AuthRequest, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) { res.status(404).json({ error: 'Employee not found' }); return; }

  const active = await prisma.allocation.count({ where: { employeeId: id, status: 'Active' } });
  if (active > 0) {
    res.status(400).json({ error: 'Cannot delete employee with active asset allocations. Return assets first.' });
    return;
  }

  // Remove historical allocations before deleting to avoid FK constraint
  await prisma.allocation.deleteMany({ where: { employeeId: id } });
  await prisma.employee.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      action: 'DELETED',
      entityType: 'Employee',
      entityId: id,
      entityName: existing.name,
      details: `${existing.name} (${existing.empId}) removed`,
    },
  });

  res.json({ message: 'Deleted successfully' });
}

export async function syncMicrosoftDirectory(req: AuthRequest, res: Response): Promise<void> {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    res.status(503).json({ error: 'Azure credentials not configured' });
    return;
  }

  // Get access token
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
      }),
    }
  );

  if (!tokenRes.ok) {
    res.status(502).json({ error: 'Failed to get Microsoft access token' });
    return;
  }

  const { access_token } = await tokenRes.json() as { access_token: string };
  const graphHeaders = { Authorization: `Bearer ${access_token}`, 'ConsistencyLevel': 'eventual' };

  // Build SKU ID → friendly name map from subscribedSkus
  const SKU_FRIENDLY: Record<string, string> = {
    'SPB': 'Microsoft 365 Business Premium',
    'O365_BUSINESS_ESSENTIALS': 'Microsoft 365 Business Basic',
    'SMB_BUSINESS': 'Microsoft 365 Business Basic',
    'O365_BUSINESS_PREMIUM': 'Microsoft 365 Business Standard',
    'SMB_BUSINESS_PREMIUM': 'Microsoft 365 Business Standard',
    'ENTERPRISEPACK': 'Office 365 E3',
    'ENTERPRISEPREMIUM': 'Office 365 E5',
    'FLOW_FREE': 'Power Automate Free',
    'POWER_BI_STANDARD': 'Power BI Free',
    'Microsoft_Teams_Exploratory': 'Microsoft Teams Exploratory',
    'MICROSOFT_BUSINESS_CENTER': 'Microsoft Business Center',
    'TEAMS_FREE': 'Microsoft Teams Free',
    'DEVELOPERPACK_E5': 'Microsoft 365 E5 Developer',
    'SMB_APPS': 'Microsoft 365 Apps for Business',
    'OFFICESUBSCRIPTION': 'Microsoft 365 Apps for Enterprise',
  };
  const skuMap: Record<string, string> = {};
  try {
    const skuRes = await fetch('https://graph.microsoft.com/v1.0/subscribedSkus', { headers: graphHeaders });
    if (skuRes.ok) {
      const skuData = await skuRes.json() as { value: Array<{ skuId: string; skuPartNumber: string; }> };
      for (const sku of skuData.value) {
        skuMap[sku.skuId] = SKU_FRIENDLY[sku.skuPartNumber] ?? sku.skuPartNumber;
      }
    }
  } catch { /* use fallback */ }

  // Fetch all users from Graph API (paginate)
  let added = 0, updated = 0, skipped = 0;
  let nextUrl: string | null =
    'https://graph.microsoft.com/v1.0/users?$filter=accountEnabled eq true and assignedLicenses/$count ne 0&$count=true&$select=id,displayName,mail,userPrincipalName,jobTitle,department,mobilePhone,officeLocation,assignedLicenses&$top=999';

  while (nextUrl) {
    const usersRes = await fetch(nextUrl, { headers: graphHeaders });

    if (!usersRes.ok) {
      res.status(502).json({ error: 'Failed to fetch users from Microsoft Graph' });
      return;
    }

    const data = await usersRes.json() as {
      value: Array<{
        id: string; displayName: string; mail?: string;
        userPrincipalName?: string; jobTitle?: string;
        department?: string; mobilePhone?: string; officeLocation?: string;
        assignedLicenses?: Array<{ skuId: string }>;
      }>;
      '@odata.nextLink'?: string;
    };

    for (const u of data.value) {
      const email = (u.mail ?? u.userPrincipalName ?? '').toLowerCase();
      if (!email || !u.displayName) { skipped++; continue; }

      // Skip service accounts / external guests
      if (email.includes('#EXT#') || email.endsWith('.onmicrosoft.com')) { skipped++; continue; }

      const licenseNames = (u.assignedLicenses ?? [])
        .map(l => skuMap[l.skuId] ?? l.skuId)
        .filter(n => !['Power Automate Free', 'Power BI Free', 'Microsoft Teams Free', 'Microsoft Fabric (Free)'].includes(n));
      const msLicenseName = licenseNames.length > 0 ? licenseNames.join(', ') : null;

      const existing = await prisma.employee.findUnique({ where: { email } });

      if (existing) {
        await prisma.employee.update({
          where: { email },
          data: {
            name: u.displayName,
            department: u.department || existing.department || 'General',
            designation: u.jobTitle || existing.designation,
            phone: u.mobilePhone || existing.phone,
            msLicensed: true,
            msLicenseName,
          },
        });
        updated++;
      } else {
        const empId = await nextEmpId();
        await prisma.employee.create({
          data: {
            empId,
            name: u.displayName,
            email,
            department: u.department || 'General',
            designation: u.jobTitle || null,
            phone: u.mobilePhone || null,
            status: 'Active',
            msLicensed: true,
            msLicenseName,
          },
        });
        added++;
      }
    }

    nextUrl = data['@odata.nextLink'] ?? null;
  }

  res.json({ added, updated, skipped, total: added + updated + skipped });
}
