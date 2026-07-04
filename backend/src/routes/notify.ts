import { Router } from 'express';
import {
  expiringSubscriptions, expiredSubscriptions,
  overdueTasks, unallocatedAssets, accruals, pendingUsers,
} from '../controllers/notifyController';
import { migrateSoftwareToSubscriptions } from '../controllers/migrateController';

const router = Router();

// Internal endpoints called by n8n — secured by a shared secret header
router.use((req, res, next) => {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (secret && req.headers['x-webhook-secret'] !== secret) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
});

router.get('/expiring', expiringSubscriptions);
router.get('/expired', expiredSubscriptions);
router.get('/overdue-tasks', overdueTasks);
router.get('/unallocated', unallocatedAssets);
router.get('/accruals', accruals);
router.get('/pending-users', pendingUsers);
router.post('/migrate-software', migrateSoftwareToSubscriptions);

export default router;
