import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import usersRouter from './routes/users.js';
import studentsRouter from './routes/students.js';
import casesRouter from './routes/cases.js';
import reportsRouter from './routes/reports.js';
import authRouter from './routes/auth.js';
import evidenceRouter from './routes/evidence.js';
import auditRouter from './routes/audit.js';

const app = express();

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? ['https://kmudd.onrender.com', 'http://localhost:3000'] : 'http://localhost:3000',
    credentials: true,
}));
app.use(express.json());

// Register API routes
app.use('/api/users', usersRouter);
app.use('/api/students', studentsRouter);
app.use('/api/cases', casesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api', authRouter);
app.use('/api/evidence', evidenceRouter);
app.use('/api/audit', auditRouter);

// Health check endpoint
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