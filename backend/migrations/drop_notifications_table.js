import mongoose from 'mongoose';
import db from '../models/db.js';
const dbType = process.env.DB_TYPE || 'mongo';

export async function dropNotificationsTable() {
    try {
        if (dbType === 'mongo') {
            // Drop notifications collection from MongoDB
            await mongoose.connection.db.dropCollection('notifications');
            console.log('✅ Notifications collection dropped from MongoDB');
        } else if (dbType === 'mysql') {
            // Drop notifications table from MySQL
            await db.execute('DROP TABLE IF EXISTS notifications');
            console.log('✅ Notifications table dropped from MySQL');
        }
    } catch (err) {
        console.error('❌ Error dropping notifications table:', err);
    }
}

// Run the migration if this file is executed directly
if (
    import.meta.url === `file://${process.argv[1]}`) {
    dropNotificationsTable()
        .then(() => {
            console.log('✅ Notifications table migration completed');
            process.exit(0);
        })
        .catch((err) => {
            console.error('❌ Migration failed:', err);
            process.exit(1);
        });
}