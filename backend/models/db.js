import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import mysql from 'mysql2/promise';

const dbType = process.env.DB_TYPE || 'mongo';

let db = null;

if (dbType === 'mongo') {
    mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    mongoose.connection.on('connected', () => {
        console.log('MongoDB connected successfully!');
    });
    db = mongoose;
} else if (dbType === 'mysql') {
    db = await mysql.createPool({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASS,
        database: process.env.MYSQL_DB,
    });
}

export default db;