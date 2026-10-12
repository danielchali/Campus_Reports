import SusSurveyModel from '../models/susSurvey.js';
import { logAudit } from './auditController.js';

const SUS_ITEM_COUNT = 10;

function normaliseAnswers(answers) {
  if (!Array.isArray(answers) || answers.length !== SUS_ITEM_COUNT) {
    return null;
  }

  const normalised = answers.map((answer) => Number(answer));
  if (!normalised.every((answer) => Number.isInteger(answer) && answer >= 1 && answer <= 5)) {
    return null;
  }

  return normalised;
}

export function calculateSusScore(answers) {
  return answers.reduce((total, answer, index) => (
    total + (index % 2 === 0 ? answer - 1 : 5 - answer)
  ), 0) * 2.5;
}

function boundedText(value, field) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length > 2000) {
    const error = new Error(`${field} must be 2,000 characters or fewer.`);
    error.status = 400;
    throw error;
  }
  return text;
}

function responsePayload(response) {
  return {
    id: response._id.toString(),
    answers: response.answers,
    score: response.score,
    taskFeedback: response.taskFeedback || '',
    additionalFeedback: response.additionalFeedback || '',
    submittedAt: response.updatedAt || response.createdAt,
  };
}

function average(values) {
  if (!values.length) return null;
  return Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 10) / 10;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const result = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  return Math.round(result * 10) / 10;
}

export async function submitSusSurvey(req, res) {
  try {
    const answers = normaliseAnswers(req.body?.answers);
    if (!answers) {
      return res.status(400).json({ error: 'Provide all ten SUS responses as whole numbers from 1 to 5.' });
    }

    const taskFeedback = boundedText(req.body?.taskFeedback, 'Task feedback');
    const additionalFeedback = boundedText(req.body?.additionalFeedback, 'Additional feedback');
    const score = calculateSusScore(answers);
    const respondentId = String(req.user?.id || req.user?._id || req.user?.username || '').trim();

    if (!respondentId) {
      return res.status(401).json({ error: 'Unable to identify the survey respondent.' });
    }

    const response = await SusSurveyModel.findOneAndUpdate(
      { respondentId },
      {
        $set: {
          respondentRole: String(req.user?.role || 'unknown').trim(),
          answers,
          score,
          taskFeedback,
          additionalFeedback,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );

    await logAudit({
      action: 'sus_survey_submitted',
      entity: 'sus_survey',
      entityId: response._id,
      user: req.user?.username,
      details: { score, respondentRole: response.respondentRole },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.status(200).json(responsePayload(response));
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('SUS survey submission error:', error);
    return res.status(500).json({ error: 'Unable to save the SUS survey.' });
  }
}

export async function getMySusSurvey(req, res) {
  try {
    const respondentId = String(req.user?.id || req.user?._id || req.user?.username || '').trim();
    const response = await SusSurveyModel.findOne({ respondentId });
    return res.json({ response: response ? responsePayload(response) : null });
  } catch (error) {
    console.error('SUS survey lookup error:', error);
    return res.status(500).json({ error: 'Unable to load the SUS survey.' });
  }
}

export async function getSusSurveySummary(req, res) {
  try {
    const responses = await SusSurveyModel.find({})
      .select('answers score respondentRole taskFeedback additionalFeedback createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .lean();
    const scores = responses.map((response) => response.score);
    const roleCounts = responses.reduce((counts, response) => {
      const role = response.respondentRole || 'unknown';
      counts[role] = (counts[role] || 0) + 1;
      return counts;
    }, {});
    const itemAverages = Array.from({ length: SUS_ITEM_COUNT }, (_, index) => average(
      responses.map((response) => response.answers[index]),
    ));

    return res.json({
      totalResponses: responses.length,
      averageScore: average(scores),
      medianScore: median(scores),
      scoreDistribution: [
        { label: '0–50', count: scores.filter((score) => score < 50).length },
        { label: '50–68', count: scores.filter((score) => score >= 50 && score < 68).length },
        { label: '68–80', count: scores.filter((score) => score >= 68 && score < 80).length },
        { label: '80–100', count: scores.filter((score) => score >= 80).length },
      ],
      itemAverages,
      roleCounts: Object.entries(roleCounts)
        .map(([role, count]) => ({ role, count }))
        .sort((left, right) => right.count - left.count || left.role.localeCompare(right.role)),
      recentFeedback: responses
        .filter((response) => response.taskFeedback || response.additionalFeedback)
        .slice(0, 12)
        .map((response) => ({
          role: response.respondentRole,
          score: response.score,
          taskFeedback: response.taskFeedback || '',
          additionalFeedback: response.additionalFeedback || '',
          submittedAt: response.updatedAt || response.createdAt,
        })),
    });
  } catch (error) {
    console.error('SUS survey summary error:', error);
    return res.status(500).json({ error: 'Unable to load the SUS survey summary.' });
  }
}
