import mongoose from 'mongoose';

const susSurveySchema = new mongoose.Schema({
  respondentId: { type: String, required: true, unique: true, index: true },
  respondentRole: { type: String, required: true, trim: true },
  answers: {
    type: [Number],
    required: true,
    validate: {
      validator: (answers) => Array.isArray(answers)
        && answers.length === 10
        && answers.every((answer) => Number.isInteger(answer) && answer >= 1 && answer <= 5),
      message: 'All ten SUS responses must be whole numbers from 1 to 5.',
    },
  },
  score: { type: Number, required: true, min: 0, max: 100 },
  taskFeedback: { type: String, trim: true, maxlength: 2000, default: '' },
  additionalFeedback: { type: String, trim: true, maxlength: 2000, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

susSurveySchema.pre('save', function updateTimestamp(next) {
  this.updatedAt = new Date();
  next();
});

const SusSurveyModel = mongoose.models.SusSurvey || mongoose.model('SusSurvey', susSurveySchema);

export default SusSurveyModel;
