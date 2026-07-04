import { Router } from 'express';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, syncMicrosoftDirectory } from '../controllers/employeesController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/',     getEmployees);
router.post('/',    createEmployee);
router.put('/:id',  updateEmployee);
router.delete('/:id', deleteEmployee);
router.post('/sync-microsoft', requireAdmin, syncMicrosoftDirectory);

export default router;
