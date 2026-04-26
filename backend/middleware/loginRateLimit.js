const attempts = new Map();

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown-ip';
}

function getRateLimitConfig() {
  const maxAttempts = Number.parseInt(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS || '', 10);
  const windowMs = Number.parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '', 10);

  return {
    maxAttempts: Number.isFinite(maxAttempts) && maxAttempts > 0 ? maxAttempts : DEFAULT_MAX_ATTEMPTS,
    windowMs: Number.isFinite(windowMs) && windowMs > 0 ? windowMs : DEFAULT_WINDOW_MS,
  };
}

function clearExpired(now, windowMs) {
  for (const [key, value] of attempts.entries()) {
    if (now - value.firstAttemptAt > windowMs) {
      attempts.delete(key);
    }
  }
}

function getLoginAttemptKey(req) {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : '';
  return `${getClientIp(req)}::${username || 'anonymous'}`;
}

export function recordFailedLoginAttempt(attemptKey) {
  if (!attemptKey) return;
  const now = Date.now();
  const { windowMs } = getRateLimitConfig();
  clearExpired(now, windowMs);
  const current = attempts.get(attemptKey);

  if (!current || now - current.firstAttemptAt > windowMs) {
    attempts.set(attemptKey, { count: 1, firstAttemptAt: now });
    return;
  }

  current.count += 1;
  attempts.set(attemptKey, current);
}

export function clearLoginAttempts(attemptKey) {
  if (!attemptKey) return;
  attempts.delete(attemptKey);
}

export function loginRateLimit(req, res, next) {
  const now = Date.now();
  const { maxAttempts, windowMs } = getRateLimitConfig();
  clearExpired(now, windowMs);

  const key = getLoginAttemptKey(req);
  req.loginAttemptKey = key;
  const record = attempts.get(key);

  if (record && now - record.firstAttemptAt <= windowMs && record.count >= maxAttempts) {
    const retryAfterSeconds = Math.ceil((windowMs - (now - record.firstAttemptAt)) / 1000);
    res.setHeader('Retry-After', `${retryAfterSeconds}`);
    return res.status(429).json({
      error: `Too many login attempts. Try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).`,
    });
  }

  return next();
}

