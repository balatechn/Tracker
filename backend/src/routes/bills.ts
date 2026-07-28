import { Router } from 'express';
import {
  getBills, getBill, createBill, updateBill, deleteBill,
  addBillAttachment, getBillAttachment,
} from '../controllers/billsController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/',                          getBills);
router.get('/:id',                       getBill);
router.post('/',                         createBill);
router.patch('/:id',                     updateBill);
router.delete('/:id',                    deleteBill);
router.post('/:id/attachments',          addBillAttachment);
router.get('/:id/attachments/:attachId', getBillAttachment);

export default router;
