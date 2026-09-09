import { Redis } from '@upstash/redis';

const DEFAULT_TTL_SECONDS = 60;
const CACHE_PREFIX = 'campus-reports:v1';

let redisClient;
let redisInitialized = false;

function getRedisClient() {
  if (redisInitialized) {
    return redisClient;
  }

  redisInitialized = true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.info('Redis cache disabled: UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing.');
    return undefined;
  }

  try {
    redisClient = new Redis({ url, token });
  } catch (error) {
    console.warn('Redis cache disabled: failed to initialize the Upstash client.', error.message);
  }

  return redisClient;
}

function getCacheTtlSeconds() {
  const configuredTtl = Number.parseInt(process.env.REDIS_CACHE_TTL_SECONDS || '', 10);
  return Number.isFinite(configuredTtl) && configuredTtl > 0
    ? configuredTtl
    : DEFAULT_TTL_SECONDS;
}

function getUserCacheIdentity(user) {
  if (!user) return 'anonymous';
  const identity = user.id || user._id || user.username || 'unknown';
  return `${user.role || 'unknown'}:${identity}`;
}

function buildCacheKey(req) {
  const query = new URLSearchParams();
  Object.keys(req.query || {})
    .sort()
    .forEach((key) => query.set(key, String(req.query[key])));

  const querySuffix = query.toString() ? `?${query.toString()}` : '';
  return `${CACHE_PREFIX}:${getUserCacheIdentity(req.user)}:${req.baseUrl}${req.path}${querySuffix}`;
}

export function cacheResponse() {
  return async (req, res, next) => {
    const redis = getRedisClient();
    if (req.method !== 'GET' || !redis) {
      next();
      return;
    }

    const key = buildCacheKey(req);

    try {
      const cachedResponse = await redis.get(key);
      if (cachedResponse !== null && cachedResponse !== undefined) {
        res.set('X-Cache', 'HIT');
        res.json(cachedResponse);
        return;
      }
    } catch (error) {
      console.warn('Redis cache read failed; continuing without cache.', error.message);
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        redis.set(key, body, { ex: getCacheTtlSeconds() }).catch((error) => {
          console.warn('Redis cache write failed; continuing without cache.', error.message);
        });
        res.set('X-Cache', 'MISS');
      }
      return originalJson(body);
    };

    next();
  };
}

export function resetCacheForTests() {
  redisClient = undefined;
  redisInitialized = false;
}
