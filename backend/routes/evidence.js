import express from 'express';
import { listEvidence, uploadEvidence, downloadEvidence, deleteEvidence } from '../controllers/evidenceController.js';
import { authenticate } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';

const router = express.Router();

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadPath = path.join(process.cwd(), 'backend', 'uploads', 'evidence');
        console.log('Multer destination:', uploadPath);
        cb(null, uploadPath);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = uniqueSuffix + '-' + file.originalname;
        console.log('Generated filename:', filename);
        cb(null, filename);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: function(req, file, cb) {
        console.log('Processing file:', file.originalname, 'Type:', file.mimetype);
        // Allow all file types for now, but you can add restrictions here
        cb(null, true);
    }
});

router.use(authenticate);
router.get('/', listEvidence);
router.post('/', upload.single('file'), uploadEvidence);
router.get('/:id/download', downloadEvidence);
router.delete('/:id', deleteEvidence);

export default router;