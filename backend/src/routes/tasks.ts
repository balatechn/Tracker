import { Router } from 'express';
import {
  getTasks, getTask, createTask, updateTask, deleteTask,
  addComment, addAttachment, getAttachment, getTaskStats,
} from '../controllers/tasksController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/stats',                 getTaskStats);
router.get('/',                      getTasks);
router.get('/:id',                   getTask);
router.post('/',                     createTask);
router.patch('/:id',                 updateTask);
router.delete('/:id',                deleteTask);
router.post('/:id/comments',         addComment);
router.post('/:id/attachments',      addAttachment);
router.get('/:id/attachments/:attachId', getAttachment);

export default router;
