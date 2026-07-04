import { Router } from 'express';
import { getSubscriptions, createSubscription, updateSubscription, deleteSubscription, exportSubscriptions } from '../controllers/subscriptionsController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/export', exportSubscriptions);
router.get('/', getSubscriptions);
router.post('/', createSubscription);
router.put('/:id', updateSubscription);
router.delete('/:id', deleteSubscription);

export default router;
