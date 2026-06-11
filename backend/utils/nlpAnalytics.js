const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const PRIORITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'];

function openRouterHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.OPENROUTER_SITE_URL || process.env.FRONTEND_URL || 'http://localhost:3000',
    'X-Title': process.env.OPENROUTER_SITE_NAME || 'Campus Reports',
  };
}

function parseJsonFromText(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : text.trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizePriority(value) {
  const normalized = String(value || '').trim();
  if (PRIORITY_LEVELS.includes(normalized)) return normalized;
  const lower = normalized.toLowerCase();
  if (lower === 'critical') return 'Critical';
  if (lower === 'high') return 'High';
  if (lower === 'medium') return 'Medium';
  return 'Low';
}

function normalizePriorityScore(value, priority) {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return Math.max(0, Math.min(100, Math.round(numeric)));
  }
  const fallback = { Low: 25, Medium: 50, High: 75, Critical: 95 };
  return fallback[priority] || 50;
}

export function isNlpEnabled() {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

/**
 * NLP analysis for a single report: summarization + prioritization.
 */
export async function analyzeReportNlp(report) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return {
      summary: String(report.description || '').slice(0, 180),
      priority: 'Medium',
      priorityScore: 50,
      keywords: [],
    };
  }

  const payload = {
    model: DEFAULT_MODEL,
    messages: [
      {
        role: 'system',
        content: [
          'You analyze campus incident and maintenance reports for university staff.',
          'Return ONLY valid JSON with keys: summary, priority, priorityScore, keywords.',
          'summary: one concise sentence (max 30 words).',
          'priority: one of Low, Medium, High, Critical.',
          'priorityScore: integer 0-100 reflecting urgency and risk.',
          'keywords: array of up to 5 short strings.',
        ].join(' '),
      },
      {
        role: 'user',
        content: JSON.stringify({
          title: report.title,
          description: report.description,
          category: report.category,
          location: report.location,
          status: report.status,
        }),
      },
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' },
  };

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: openRouterHeaders(apiKey),
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(body?.error?.message || 'OpenRouter NLP request failed');
    }

    const content = body?.choices?.[0]?.message?.content;
    const parsed = typeof content === 'string' ? parseJsonFromText(content) : content;
    const priority = normalizePriority(parsed?.priority);
    return {
      summary: String(parsed?.summary || report.description || '').slice(0, 280),
      priority,
      priorityScore: normalizePriorityScore(parsed?.priorityScore, priority),
      keywords: Array.isArray(parsed?.keywords)
        ? parsed.keywords.map((item) => String(item).slice(0, 40)).slice(0, 5)
        : [],
    };
  } catch (error) {
    console.error('NLP analysis failed:', error);
    return {
      summary: String(report.description || '').slice(0, 180),
      priority: 'Medium',
      priorityScore: 50,
      keywords: [],
    };
  }
}

/**
 * AI dashboard insights from aggregated metrics and prioritized reports.
 */
export async function generateDashboardInsights({ role, metrics, prioritizedReports }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const fallback = buildFallbackInsights(metrics, prioritizedReports);

  if (!apiKey) {
    return fallback;
  }

  const payload = {
    model: DEFAULT_MODEL,
    messages: [
      {
        role: 'system',
        content: [
          'You are Campus Reports AI producing dashboard intelligence for university staff.',
          `Audience role: ${role || 'staff'}.`,
          'Return ONLY valid JSON with keys: executiveSummary, recommendations, alerts.',
          'executiveSummary: 2-3 sentences.',
          'recommendations: array of 3 short actionable strings.',
          'alerts: array of up to 3 urgent watch-items (can be empty).',
        ].join(' '),
      },
      {
        role: 'user',
        content: JSON.stringify({ metrics, prioritizedReports }),
      },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  };

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: openRouterHeaders(apiKey),
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(body?.error?.message || 'OpenRouter insights request failed');
    }

    const content = body?.choices?.[0]?.message?.content;
    const parsed = typeof content === 'string' ? parseJsonFromText(content) : content;

    return {
      executiveSummary: String(parsed?.executiveSummary || fallback.executiveSummary),
      recommendations: Array.isArray(parsed?.recommendations)
        ? parsed.recommendations.map((item) => String(item)).slice(0, 5)
        : fallback.recommendations,
      alerts: Array.isArray(parsed?.alerts)
        ? parsed.alerts.map((item) => String(item)).slice(0, 5)
        : fallback.alerts,
      topPriorities: prioritizedReports,
      generatedAt: new Date().toISOString(),
      aiEnabled: true,
    };
  } catch (error) {
    console.error('Dashboard insights generation failed:', error);
    return fallback;
  }
}

function buildFallbackInsights(metrics, prioritizedReports) {
  const pending = metrics?.pendingReviewReports || 0;
  const highPriority = metrics?.highPriorityReports || 0;

  return {
    executiveSummary: `There are ${metrics?.totalCampusReports || 0} campus reports on record with ${pending} awaiting review. ${highPriority > 0 ? `${highPriority} items are flagged as high priority.` : 'No critical backlog is detected from current metrics.'}`,
    recommendations: [
      pending > 0 ? 'Review newly submitted reports in the inbox first.' : 'Monitor incoming reports throughout the day.',
      highPriority > 0 ? 'Assign high-priority reports to the appropriate office immediately.' : 'Keep maintenance and discipline queues balanced.',
      'Use tracking codes when following up with reporters.',
    ],
    alerts: highPriority > 0 ? [`${highPriority} high-priority report(s) need attention.`] : [],
    topPriorities: prioritizedReports,
    generatedAt: new Date().toISOString(),
    aiEnabled: false,
  };
}

export async function applyNlpToDocument(Model, documentId, reportFields) {
  const analysis = await analyzeReportNlp(reportFields);
  await Model.findByIdAndUpdate(documentId, {
    ai_summary: analysis.summary,
    ai_priority: analysis.priority,
    ai_priority_score: analysis.priorityScore,
    ai_keywords: analysis.keywords,
    ai_analyzed_at: new Date(),
  });
  return analysis;
}
