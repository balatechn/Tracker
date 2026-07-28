import { Router } from 'express';
import { login, microsoftLogin, changePassword, listUsers, updateUser, deleteUser } from '../controllers/authController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/microsoft', microsoftLogin);

// TEMP: one-time admin password reset — remove after use
router.post('/reset-admin', async (_req, res) => {
  const bcrypt = await import('bcryptjs');
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const hashed = await bcrypt.hash('Admin@2026', 12);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { password: hashed, role: 'admin', status: 'active' },
    create: { username: 'admin', password: hashed, role: 'admin', status: 'active' },
  });
  await prisma.$disconnect();
  res.json({ ok: true, message: 'Admin password reset to Admin@2026' });
});
router.post('/change-password', authenticate, changePassword);

// User management — admin only
router.get('/users', authenticate, requireAdmin, listUsers);
router.patch('/users/:id', authenticate, requireAdmin, updateUser);
router.delete('/users/:id', authenticate, requireAdmin, deleteUser);

export default router;
