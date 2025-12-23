import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import usersRouter from './routes/users.js';
import studentsRouter from './routes/students.js';
import staffRouter from './routes/staff.js';
import casesRouter from './routes/cases.js';
import reportsRouter from './routes/reports.js';
import authRouter from './routes/auth.js';
import evidenceRouter from './routes/evidence.js';
import auditRouter from './routes/audit.js';
import healthRouter from './routes/health.js';

const app = express();

// CORS configuration - flexible for any deployment environment
const corsOrigin = process.env.CORS_ORIGIN || process.env.FRONTEND_URL ;
// Handle multiple origins if provided as comma-separated values
let origins;
if (Array.isArray(corsOrigin)) {
    origins = corsOrigin;
} else if (typeof corsOrigin === 'string') {
    // Split by comma for multiple origins, or use as single origin
    origins = corsOrigin.includes(',') ? corsOrigin.split(',').map(origin => origin.trim()) : corsOrigin;
} else {
    origins = 'http://localhost:3000';
}

app.use(cors({
    origin: origins,
    credentials: true,
}));
app.use(express.json());

// Register API routes
app.use('/api/users', usersRouter);
app.use('/api/students', studentsRouter);
app.use('/api/staff', staffRouter);
app.use('/api/cases', casesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api', authRouter);
app.use('/api/evidence', evidenceRouter);
app.use('/api/audit', auditRouter);
app.use('/api/health', healthRouter);

// Health check endpoint (legacy)
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'KMU Discipline Desk Backend API',
        status: 'running',
        timestamp: new Date().toISOString()
    });
});

// Catch-all for unhandled API routes
app.use('/api/*', (req, res) => {
    console.log('Unhandled API route:', req.method, req.originalUrl);
    res.status(404).json({ error: 'API endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({ error: 'Server error' });
});

export default app;