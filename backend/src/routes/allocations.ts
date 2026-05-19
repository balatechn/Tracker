import { Router } from 'express';
import { getAllocations, createAllocation, returnAsset } from '../controllers/allocationsController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/',          getAllocations);
router.post('/',         createAllocation);
router.put('/:id/return', returnAsset);

export default router;
