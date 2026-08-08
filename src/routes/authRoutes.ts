import { Router } from 'express';
import { login, requestOtp, verifyOtp } from '../controllers/authController';

const router = Router();

router.post('/login', login);
router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtp);

export default router;