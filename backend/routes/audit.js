import express from 'express';
import { listAuditLogs } from '../controllers/auditController.js';
import { authenticate, authorize } from '../middleware/auth.js';
const router = express.Router();

router.use(authenticate, authorize(['admin', 'academic_office']));
router.get('/', listAuditLogs);

export default router;