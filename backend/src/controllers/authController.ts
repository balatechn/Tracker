import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { alertNewPendingUser } from '../services/scheduler';

const prisma = new PrismaClient();

function signToken(userId: number, role: string): string {
  const secret = process.env.JWT_SECRET!;
  return jwt.sign({ userId, role }, secret, { expiresIn: '24h' });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.password) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  if (user.status !== 'active') {
    res.status(403).json({ error: 'Account is not active' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  const token = signToken(user.id, user.role);
  res.json({ token, username: user.username, role: user.role });
}

export async function microsoftLogin(req: Request, res: Response): Promise<void> {
  const { idToken } = req.body;
  if (!idToken) {
    res.status(400).json({ error: 'idToken required' });
    return;
  }

  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  if (!tenantId || !clientId) {
    res.status(503).json({ error: 'Microsoft SSO not configured on server' });
    return;
  }

  try {
    const JWKS = createRemoteJWKSet(
      new URL(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`)
    );
    const { payload } = await jwtVerify(idToken, JWKS, {
      audience: clientId,
      issuer: [
        `https://login.microsoftonline.com/${tenantId}/v2.0`,
        `https://sts.windows.net/${tenantId}/`,
      ],
    });

    const msOid = payload.oid as string;
    const email = (payload.preferred_username ?? payload.email ?? '') as string;
    const displayName = (payload.name ?? email) as string;
    const username = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');

    const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? 'bala@nationalgroupindia.com,balasubramanian.p@nationalgroupindia.com')
      .split(',').map(e => e.trim().toLowerCase());
    const isAdminEmail = ADMIN_EMAILS.includes(email.toLowerCase());

    let user = await prisma.user.findUnique({ where: { msOid } });

    // If admin email logs in but was previously created as pending/viewer, promote to admin
    if (isAdminEmail && user && (user.role !== 'admin' || user.status !== 'active')) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: 'admin', status: 'active' },
      });
    }
    // Also check by email in case msOid lookup missed it
    if (!user && isAdminEmail) {
      const byEmail = await prisma.user.findUnique({ where: { email } });
      if (byEmail) {
        user = await prisma.user.update({
          where: { id: byEmail.id },
          data: { msOid, role: 'admin', status: 'active' },
        });
      }
    }

    if (!user) {
      const isAdmin = isAdminEmail;
      user = await prisma.user.create({
        data: {
          username: username + '_ms',
          email,
          displayName,
          msOid,
          authProvider: 'microsoft',
          role: isAdmin ? 'admin' : 'viewer',
          status: isAdmin ? 'active' : 'pending',
        },
      });

      // Fire-and-forget immediate alert to admin for new pending users
      if (user.status === 'pending') {
        alertNewPendingUser({ displayName: user.displayName, email: user.email, createdAt: user.createdAt });
      }
    }

    if (user.status === 'pending') {
      res.status(202).json({ status: 'pending', message: 'Account pending admin approval' });
      return;
    }

    if (user.status === 'disabled') {
      res.status(403).json({ error: 'Account has been disabled' });
      return;
    }

    const token = signToken(user.id, user.role);
    res.json({ token, username: user.displayName ?? user.username, role: user.role });
  } catch (err) {
    console.error('Microsoft token verification failed:', err);
    res.status(401).json({ error: 'Invalid Microsoft token' });
  }
}

export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Current and new password required' });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: 'New password must be at least 8 characters' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user || !user.password) {
    res.status(404).json({ error: 'User not found or no password set' });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    res.status(401).json({ error: 'Current password is incorrect' });
    return;
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
  res.json({ message: 'Password changed successfully' });
}

export async function listUsers(_req: AuthRequest, res: Response): Promise<void> {
  const users = await prisma.user.findMany({
    select: {
      id: true, username: true, email: true, displayName: true,
      authProvider: true, role: true, status: true, createdAt: true,
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });
  res.json(users);
}

export async function updateUser(req: AuthRequest, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { role, status } = req.body;
  const data: { role?: string; status?: string } = {};

  const validRoles = ['admin', 'editor', 'viewer'];
  const validStatuses = ['active', 'pending', 'disabled'];

  if (role !== undefined) {
    if (!validRoles.includes(role)) { res.status(400).json({ error: 'Invalid role' }); return; }
    data.role = role;
  }
  if (status !== undefined) {
    if (!validStatuses.includes(status)) { res.status(400).json({ error: 'Invalid status' }); return; }
    data.status = status;
  }

  const user = await prisma.user.update({ where: { id }, data });
  res.json({ id: user.id, username: user.username, role: user.role, status: user.status });
}

export async function deleteUser(req: AuthRequest, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
  if (id === req.userId) { res.status(400).json({ error: 'Cannot delete your own account' }); return; }
  await prisma.user.delete({ where: { id } });
  res.json({ message: 'User deleted' });
}
