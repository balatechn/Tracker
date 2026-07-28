import { Router } from 'express';
import { login, microsoftLogin, changePassword, listUsers, updateUser, deleteUser } from '../controllers/authController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/microsoft', microsoftLogin);
router.post('/change-password', authenticate, changePassword);

// User management — admin only
router.get('/users', authenticate, requireAdmin, listUsers);
router.patch('/users/:id', authenticate, requireAdmin, updateUser);
router.delete('/users/:id', authenticate, requireAdmin, deleteUser);

export default router;
