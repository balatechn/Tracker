import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.get('/', getAuditLogs);

export default router;
