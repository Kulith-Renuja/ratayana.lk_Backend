import { Router } from 'express';
import { register, login, requestOtp, verifyOtp } from '../controllers/authController';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtp);

export default router;
