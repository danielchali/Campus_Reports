import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!mongoUri) {
    throw new Error('Missing MongoDB URI. Set MONGO_URI or MONGODB_URI in your environment.');
}

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.on('connected', () => {
    console.log('MongoDB connected successfully!');
});

export default mongoose;
