import { Router } from 'express';
import { listCredentials, createCredential, updateCredential, deleteCredential } from '../controllers/credentialsController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, listCredentials);
router.post('/', authenticate, requireAdmin, createCredential);
router.patch('/:id', authenticate, requireAdmin, updateCredential);
router.delete('/:id', authenticate, requireAdmin, deleteCredential);

export default router;
