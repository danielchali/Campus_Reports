import express from 'express';
import { googleLogin, googleRegister, login, register, registerGeneralUser, registerStudent, verifyTwoFactor } from '../controllers/authController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { loginRateLimit } from '../middleware/loginRateLimit.js';
import { requestRateLimit } from '../middleware/rateLimit.js';
import jwt from 'jsonwebtoken';
const router = express.Router();

const authRequestRateLimit = requestRateLimit({ prefix: 'auth' });

router.post('/login', authRequestRateLimit, loginRateLimit, login);
router.post('/google', authRequestRateLimit, googleLogin);
router.post('/google-register', authRequestRateLimit, googleRegister);
router.post('/verify-2fa', authRequestRateLimit, verifyTwoFactor);
router.post('/student-signup', authRequestRateLimit, registerStudent);
router.post('/general-signup', authRequestRateLimit, registerGeneralUser);
router.post('/register', authenticate, authorize(['admin']), register);
router.post('/refresh-token', (req, res) => {
    // For now, just return an error since we don't have refresh tokens implemented
    res.status(401).json({ error: 'Refresh token not implemented' });
});

import { forgotPassword, resetPassword } from '../controllers/authController.js';
router.post('/forgot-password', authRequestRateLimit, forgotPassword);
router.post('/reset-password', authRequestRateLimit, resetPassword);

export default router;
