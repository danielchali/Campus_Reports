import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { getMySusSurvey, getSusSurveySummary, submitSusSurvey } from '../controllers/susSurveysController.js';

const router = express.Router();

router.use(authenticate);

router.get('/mine', getMySusSurvey);
router.post('/', submitSusSurvey);
router.get('/summary', authorize(['admin']), getSusSurveySummary);

export default router;
