import { Router } from 'express';
import { getAllocations, createAllocation, returnAsset, updateAllocation } from '../controllers/allocationsController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/',          getAllocations);
router.post('/',         createAllocation);
router.put('/:id/return', returnAsset);
router.patch('/:id',       updateAllocation);

export default router;
