import express from 'express';
import db from '../models/db.js';
const router = express.Router();

// Health check endpoint for monitoring
router.get('/', async (req, res) => {
    try {
        const dbStatus = db.connection && db.connection.readyState === 1 ? 'connected' : 'disconnected';
        const uptime = process.uptime();
        const memoryUsage = process.memoryUsage();

        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'Campus Reports Backend',
            version: '1.0.0',
            uptime: `${Math.floor(uptime / 60)} minutes`,
            database: {
                type: 'mongo',
                status: dbStatus
            },
            system: {
                memory: {
                    rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
                    heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
                    heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`
                }
            }
        });
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

export default router;
