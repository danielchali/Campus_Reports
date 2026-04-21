import AuditModel, { createAuditTable } from '../models/audit.js';
import db from '../models/db.js';
const dbType = process.env.DB_TYPE || 'mongo';

export async function listAuditLogs(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const action = req.query.action;
        const entity = req.query.entity;
        const user = req.query.user;
        const search = req.query.search;
        const dateFrom = req.query.dateFrom;
        const dateTo = req.query.dateTo;
        let logs, total, stats;

        if (dbType === 'mongo') {
            const query = {};
            if (action) query.action = action;
            if (entity) query.entity = entity;
            if (user) query.user = { $regex: user, $options: 'i' };
            if (search) {
                query.$or = [
                    { action: { $regex: search, $options: 'i' } },
                    { entity: { $regex: search, $options: 'i' } },
                    { entityId: { $regex: search, $options: 'i' } },
                    { user: { $regex: search, $options: 'i' } }
                ];
            }
            if (dateFrom || dateTo) {
                query.date = {};
                if (dateFrom) query.date.$gte = new Date(`${dateFrom}T00:00:00.000Z`);
                if (dateTo) query.date.$lte = new Date(`${dateTo}T23:59:59.999Z`);
            }

            total = await AuditModel.countDocuments(query);
            logs = await AuditModel.find(query)
                .sort({ date: -1 })
                .skip((page - 1) * limit)
                .limit(limit);

            // Get aggregated statistics for filtered logs
            stats = await AuditModel.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: '$action',
                        count: { $sum: 1 }
                    }
                }
            ]);
        } else if (dbType === 'mysql') {
            await createAuditTable(db);

            const whereClauses = [];
            const whereParams = [];

            if (action) {
                whereClauses.push('action = ?');
                whereParams.push(action);
            }
            if (entity) {
                whereClauses.push('entity = ?');
                whereParams.push(entity);
            }
            if (user) {
                whereClauses.push('user LIKE ?');
                whereParams.push(`%${user}%`);
            }
            if (search) {
                whereClauses.push('(action LIKE ? OR entity LIKE ? OR entityId LIKE ? OR user LIKE ?)');
                const like = `%${search}%`;
                whereParams.push(like, like, like, like);
            }
            if (dateFrom) {
                whereClauses.push('DATE(date) >= ?');
                whereParams.push(dateFrom);
            }
            if (dateTo) {
                whereClauses.push('DATE(date) <= ?');
                whereParams.push(dateTo);
            }

            const whereSql = whereClauses.length ? ` WHERE ${whereClauses.join(' AND ')}` : '';
            const [countRows] = await db.execute(`SELECT COUNT(*) as count FROM audit${whereSql}`, whereParams);
            total = countRows[0].count;
            const [rows] = await db.execute(`SELECT * FROM audit${whereSql} ORDER BY date DESC LIMIT ? OFFSET ?`, [...whereParams, limit, (page - 1) * limit]);
            logs = rows;

            // Get aggregated statistics for filtered logs
            const [statsRows] = await db.execute(`SELECT action, COUNT(*) as count FROM audit${whereSql} GROUP BY action`, whereParams);
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