import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import mysql from 'mysql2/promise';

const dbType = process.env.DB_TYPE || 'mongo';

let db = null;

if (dbType === 'mongo') {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error('Missing MongoDB URI. Set MONGO_URI or MONGODB_URI in your environment.');
    }
    mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    mongoose.connection.on('connected', () => {
        console.log('MongoDB connected successfully!');
    });
    db = mongoose;
} else if (dbType === 'mysql') {
    db = await mysql.createPool({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASS || process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DB || process.env.MYSQL_DATABASE,
    });
}

export default db;