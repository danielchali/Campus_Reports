import express from 'express';
import { login, register } from '../controllers/authController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';
const router = express.Router();

router.post('/login', login);
router.post('/register', authenticate, authorize(['admin']), register);
router.post('/refresh-token', (req, res) => {
    // For now, just return an error since we don't have refresh tokens implemented
    res.status(401).json({ error: 'Refresh token not implemented' });
});

export default router;