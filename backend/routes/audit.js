import express from 'express';
import { listAuditLogs } from '../controllers/auditController.js';
import { authenticate, authorize } from '../middleware/auth.js';
const router = express.Router();

router.use(authenticate, authorize([
    'admin',
    'chief_security_officer',
    'dean_of_students',
    'assistant_dean',
    'secretary',
    'registrar',
    'security_officer',
    'maintenance'
]));
router.get('/', listAuditLogs);

export default router;