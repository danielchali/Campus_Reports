import express from 'express';
import {
    createStatementRequest,
    listStatementRequestsForStudent,
    listStatementRequestsForStaff,
    submitStatementRequest
} from '../controllers/statementRequestsController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/student', authorize(['student']), listStatementRequestsForStudent);
router.post('/:id/submit', authorize(['student']), submitStatementRequest);

router.get('/staff', authorize(['admin', 'academic_office', 'security_officer', 'chief_security_officer', 'dean_of_students', 'assistant_dean', 'secretary']), listStatementRequestsForStaff);
router.post('/', authorize(['admin', 'academic_office', 'security_officer', 'chief_security_officer', 'dean_of_students', 'assistant_dean', 'secretary']), createStatementRequest);

export default router;
