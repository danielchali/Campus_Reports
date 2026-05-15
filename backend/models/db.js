import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

if (mongoUri) {
    mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    mongoose.connection.on('connected', () => {
        console.log('MongoDB connected successfully!');
    });
    mongoose.connection.on('error', (error) => {
        console.error('MongoDB connection error:', error);
    });
} else {
    console.warn('MongoDB URI not configured. Database routes will be unavailable until MONGO_URI or MONGODB_URI is set.');
}

export default mongoose;
