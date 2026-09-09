import mongoose from 'mongoose';

const performanceMetricSchema = new mongoose.Schema(
  {
    path: { type: String, required: true, maxlength: 120 },
    navigationDuration: Number,
    domContentLoaded: Number,
    firstPaint: Number,
    firstContentfulPaint: Number,
    largestContentfulPaint: Number,
    cumulativeLayoutShift: Number,
    connectionType: String,
    deviceMemory: Number,
    receivedAt: { type: Date, default: Date.now, index: true, expires: 60 * 60 * 24 * 7 },
  },
  { versionKey: false },
);

export default mongoose.models.PerformanceMetric || mongoose.model('PerformanceMetric', performanceMetricSchema);
