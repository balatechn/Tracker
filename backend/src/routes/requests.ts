import { Router } from 'express';
import { getRequests, createRequest, approveRequest, rejectRequest, deleteRequest } from '../controllers/requestsController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/',           getRequests);
router.post('/',          createRequest);
router.put('/:id/approve', approveRequest);
router.put('/:id/reject',  rejectRequest);
router.delete('/:id',     deleteRequest);

export default router;
