import { getRedisClient } from './cache.js';

const fallbackBuckets = new Map();
const DEFAULT_API_LIMIT = 120;
const DEFAULT_AUTH_LIMIT = 20;
const DEFAULT_WINDOW_SECONDS = 60;

function getClientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown-ip';
}

function getPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getRateLimitConfig(options = {}) {
  const prefix = options.prefix || 'api';
  const defaultLimit = prefix === 'auth' ? DEFAULT_AUTH_LIMIT : DEFAULT_API_LIMIT;
  const envKey = prefix.toUpperCase();

  return {
    limit: getPositiveInteger(options.limit, getPositiveInteger(process.env[`${envKey}_RATE_LIMIT_MAX`], defaultLimit)),
    windowSeconds: getPositiveInteger(
      options.windowSeconds,
      getPositiveInteger(process.env[`${envKey}_RATE_LIMIT_WINDOW_SECONDS`], DEFAULT_WINDOW_SECONDS),
    ),
    prefix,
  };
}

function getRequestKey(req, prefix) {
  return `campus-reports:rate:${prefix}:${getClientIp(req)}`;
}

function getFallbackCount(key, windowSeconds, now) {
  const current = fallbackBuckets.get(key);
  if (!current || now >= current.resetAt) {
    const next = { count: 1, resetAt: now + windowSeconds * 1000 };
    fallbackBuckets.set(key, next);
    return next;
  }

  current.count += 1;
  return current;
}

function setRateHeaders(res, limit, remaining, resetAt) {
  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(remaining, 0)));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));
}

export function requestRateLimit(options = {}) {
  return async (req, res, next) => {
    const { limit, windowSeconds, prefix } = getRateLimitConfig(options);
    const key = getRequestKey(req, prefix);
    const redis = getRedisClient();
    const now = Date.now();
    let count;
    let resetAt = now + windowSeconds * 1000;

    if (redis) {
      try {
        count = await redis.incr(key);
        if (count === 1) {
          await redis.expire(key, windowSeconds);
        }
        resetAt = now + windowSeconds * 1000;
      } catch (error) {
        console.warn('Redis rate-limit check failed; using in-memory fallback.', error.message);
      }
    }

    if (!Number.isFinite(count)) {
      const fallback = getFallbackCount(key, windowSeconds, now);
      count = fallback.count;
      resetAt = fallback.resetAt;
    }

    setRateHeaders(res, limit, limit - count, resetAt);
    if (count > limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfterSeconds,
      });
    }

    return next();
  };
}

export function resetRateLimitForTests() {
  fallbackBuckets.clear();
}
