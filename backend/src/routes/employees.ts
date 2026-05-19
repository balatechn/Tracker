import { Router } from 'express';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from '../controllers/employeesController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/',     getEmployees);
router.post('/',    createEmployee);
router.put('/:id',  updateEmployee);
router.delete('/:id', deleteEmployee);

export default router;
