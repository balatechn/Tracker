import { Router } from 'express';
import {
  getEntityManagers, createEntityManager, updateEntityManager, deleteEntityManager,
} from '../controllers/entityManagersController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/',       getEntityManagers);
router.post('/',      createEntityManager);
router.patch('/:id',  updateEntityManager);
router.delete('/:id', deleteEntityManager);

export default router;
