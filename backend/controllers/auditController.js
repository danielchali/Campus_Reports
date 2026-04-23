import AuditModel from '../models/audit.js';

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

        const total = await AuditModel.countDocuments(query);
        const logs = await AuditModel.find(query)
            .sort({ date: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const stats = await AuditModel.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$action',
                    count: { $sum: 1 }
                }
            }
        ]);

        const statsMap = {};
        stats.forEach(stat => {
            statsMap[stat._id || stat.action] = stat.count;
        });

        res.json({ logs, total, stats: statsMap });
    } catch (err) {
        console.error('Error fetching audit logs:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

export async function logAudit({ action, entity, entityId, user, details, ipAddress, userAgent }) {
    try {
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
    } catch (err) {
        console.error('Error logging audit:', err);
    }
}
