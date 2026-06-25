import { Router } from 'express';
import { checkStatus, toggleSubscription } from '../controllers/subscriptionController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.get('/status', protect, checkStatus);
router.post('/toggle', protect, toggleSubscription);

export default router;
