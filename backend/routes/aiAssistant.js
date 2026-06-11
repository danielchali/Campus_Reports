import express from 'express';

const router = express.Router();

const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function buildPayload(reqBody) {
  const { messages, systemPrompt, pathname } = reqBody || {};

  if (!Array.isArray(messages) || messages.length === 0) return { error: 'At least one user message is required.', status: 400 };

  const sanitizedMessages = messages
    .filter((message) => message && typeof message.content === 'string' && (message.role === 'user' || message.role === 'assistant'))
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 4000),
    }))
    .filter((message) => message.content.length > 0)
    .slice(-12);

  if (sanitizedMessages.length === 0) return { error: 'No valid chat messages were provided.', status: 400 };

  const resolvedSystemPrompt = typeof systemPrompt === 'string' && systemPrompt.trim()
    ? systemPrompt.trim().slice(0, 3000)
    : 'You are Campus Reports AI. Introduce yourself as "I\'m Campus Reports AI" when greeting users. Provide concise, practical guidance for this platform.';

  return {
    payload: {
      model: DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content: `${resolvedSystemPrompt}\n\nCurrent app location: ${typeof pathname === 'string' ? pathname : 'unknown'}`,
        },
        ...sanitizedMessages,
      ],
      temperature: 0.3,
    },
  };
}

function openRouterHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.OPENROUTER_SITE_URL || process.env.FRONTEND_URL || 'http://localhost:3000',
    'X-Title': process.env.OPENROUTER_SITE_NAME || 'Campus Reports',
  };
}

router.post('/chat', async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenRouter API key is not configured on the server.' });
  }

  const built = buildPayload(req.body);
  if ('error' in built) return res.status(built.status).json({ error: built.error });

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: openRouterHeaders(apiKey),
      body: JSON.stringify(built.payload),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const providerError = payload?.error?.message || payload?.error || 'OpenRouter request failed';
      return res.status(502).json({ error: providerError });
    }

    const answer = payload?.choices?.[0]?.message?.content;
    if (!answer) {
      return res.status(502).json({ error: 'OpenRouter returned an empty response.' });
    }

    return res.json({
      reply: answer,
      model: payload?.model || DEFAULT_MODEL,
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'AI request failed' });
  }
});

router.post('/chat/stream', async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenRouter API key is not configured on the server.' });
  }

  const built = buildPayload(req.body);
  if ('error' in built) return res.status(built.status).json({ error: built.error });

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: openRouterHeaders(apiKey),
      body: JSON.stringify({
        ...built.payload,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      const payload = await response.json().catch(() => null);
      const providerError = payload?.error?.message || payload?.error || 'OpenRouter stream request failed';
      return res.status(502).json({ error: providerError });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of response.body) {
      res.write(chunk);
    }
    res.end();
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'AI stream failed' });
  }
});

function parseJsonFromAssistantText(text) {
  if (!text) return null;
  const fenced = String(text).match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : String(text).trim();
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

router.post('/guided-report/extract', async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const { narrative, category, mode } = req.body || {};

  if (!narrative || typeof narrative !== 'string' || !narrative.trim()) {
    return res.status(400).json({ error: 'A narrative description is required.' });
  }

  const fallback = {
    title: narrative.trim().slice(0, 80),
    description: narrative.trim(),
    category: category || 'disciplinary_case',
    location: '',
    incidentDate: new Date().toISOString().slice(0, 10),
  };

  if (!apiKey) {
    return res.json({ ...fallback, aiEnabled: false });
  }

  const allowedCategories =
    mode === 'anonymous'
      ? ['disciplinary_case', 'maintenance_issue', 'other']
      : ['disciplinary_case', 'maintenance_issue'];

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: openRouterHeaders(apiKey),
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content: [
              'Extract structured campus report fields from a user narrative.',
              'Return ONLY valid JSON with keys: title, description, category, location, incidentDate.',
              `Allowed categories: ${allowedCategories.join(', ')}.`,
              'title: max 80 chars. description: neutral factual summary. incidentDate: YYYY-MM-DD if known else empty string.',
            ].join(' '),
          },
          {
            role: 'user',
            content: JSON.stringify({
              narrative: narrative.trim().slice(0, 4000),
              preferredCategory: category || '',
            }),
          },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error?.message || 'OpenRouter extraction failed');
    }

    const content = payload?.choices?.[0]?.message?.content;
    const parsed = typeof content === 'string' ? parseJsonFromAssistantText(content) : content;
    const resolvedCategory = allowedCategories.includes(parsed?.category)
      ? parsed.category
      : (category || fallback.category);

    return res.json({
      title: String(parsed?.title || fallback.title).slice(0, 80),
      description: String(parsed?.description || fallback.description).slice(0, 4000),
      category: resolvedCategory,
      location: String(parsed?.location || '').slice(0, 200),
      incidentDate:
        typeof parsed?.incidentDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.incidentDate)
          ? parsed.incidentDate
          : fallback.incidentDate,
      aiEnabled: true,
    });
  } catch (error) {
    console.error('Guided report extraction failed:', error);
    return res.json({ ...fallback, aiEnabled: false });
  }
});

export default router;
