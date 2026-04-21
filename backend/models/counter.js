import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: Number, required: true, default: 0 }
});

const CounterModel = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

export default CounterModel;
