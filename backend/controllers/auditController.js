import AuditModel, { createAuditTable } from '../models/audit.js';
import db from '../models/db.js';
const dbType = process.env.DB_TYPE || 'mongo';

export async function listAuditLogs(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        let logs, total, stats;

        if (dbType === 'mongo') {
            total = await AuditModel.countDocuments();
            logs = await AuditModel.find()
                .sort({ date: -1 })
                .skip((page - 1) * limit)
                .limit(limit);

            // Get aggregated statistics for all logs
            stats = await AuditModel.aggregate([{
                $group: {
                    _id: '$action',
                    count: { $sum: 1 }
                }
            }]);
        } else if (dbType === 'mysql') {
            await createAuditTable(db);
            const [
                [{ count }]
            ] = await db.execute('SELECT COUNT(*) as count FROM audit');
            total = count;
            const [rows] = await db.execute('SELECT * FROM audit ORDER BY date DESC LIMIT ? OFFSET ?', [limit, (page - 1) * limit]);
            logs = rows;

            // Get aggregated statistics for all logs
            const [statsRows] = await db.execute('SELECT action, COUNT(*) as count FROM audit GROUP BY action');
            stats = statsRows;
        }

        // Convert stats to a more usable format
        const statsMap = {};
        if (stats) {
            stats.forEach(stat => {
                statsMap[stat._id || stat.action] = stat.count;
            });
        }

        res.json({ logs, total, stats: statsMap });
    } catch (err) {
        console.error('Error fetching audit logs:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

export async function logAudit({ action, entity, entityId, user, details, ipAddress, userAgent }) {
    try {
        if (dbType === 'mongo') {
            await AuditModel.create({
                action,
                entity,
                entityId,
                user,
                details,
                ipAddress,
                userAgent,
                date: new Date(),
            });
        } else if (dbType === 'mysql') {
            await createAuditTable(db);
            await db.execute(
                'INSERT INTO audit (action, entity, entityId, user, details, ipAddress, userAgent, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
                    action,
                    entity || null,
                    entityId || null,
                    user,
                    details ? JSON.stringify(details) : null,
                    ipAddress || null,
                    userAgent || null,
                    new Date(),
                ]
            );
        }
    } catch (err) {
        console.error('Error logging audit:', err);
    }
}