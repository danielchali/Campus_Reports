import express from 'express';
import { login, register, registerGeneralUser, registerStudent } from '../controllers/authController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { loginRateLimit } from '../middleware/loginRateLimit.js';
import jwt from 'jsonwebtoken';
const router = express.Router();

router.post('/login', loginRateLimit, login);
router.post('/student-signup', registerStudent);
router.post('/general-signup', registerGeneralUser);
router.post('/register', authenticate, authorize(['admin']), register);
router.post('/refresh-token', (req, res) => {
    // For now, just return an error since we don't have refresh tokens implemented
    res.status(401).json({ error: 'Refresh token not implemented' });
});

import { forgotPassword, resetPassword } from '../controllers/authController.js';
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
