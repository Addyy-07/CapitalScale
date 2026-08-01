import Redis from 'ioredis';

import logger from '../utils/logger.js';

import env from './env.js';

let redisClient = null;

try {
  redisClient = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    reconnectOnError: (err) => {
      const targetError = 'READONLY';
      if (err.message.slice(0, targetError.length) === targetError) {
        return true;
      }
      return false;
    },
  });

  redisClient.on('connect', () => {
    logger.info('✅ Connected to Redis successfully');
  });

  redisClient.on('error', (err) => {
    logger.error('❌ Redis Connection Error:', err);
  });
} catch (error) {
  logger.error('❌ Redis Initialization Failed:', error);
}


// ─── Session helpers ─────────────────────────────────────────────────────────

export const setSession = async (sessionId, sessionData, ttlSeconds = 30 * 24 * 60 * 60) => {
  if (!redisClient) { return; }
  await redisClient.set(`session:${sessionId}`, JSON.stringify(sessionData), 'EX', ttlSeconds);
};


export const getSession = async (sessionId) => {
  if (!redisClient) { return null; }
  const data = await redisClient.get(`session:${sessionId}`);
  return data ? JSON.parse(data) : null;
};


export const deleteSession = async (sessionId) => {
  if (!redisClient) { return; }
  await redisClient.del(`session:${sessionId}`);
};


// ─── Token blacklist helpers ──────────────────────────────────────────────────

export const blacklistToken = async (jti, ttlSeconds = 30 * 24 * 60 * 60) => {
  if (!redisClient) { return; }
  await redisClient.set(`blacklist:token:${jti}`, 'revoked', 'EX', ttlSeconds);
};


/**
 * BUG-06 FIX: Fail-safe — when Redis is unavailable we return TRUE (deny).
 * This prevents revoked/blacklisted tokens from becoming valid again during
 * a Redis outage. An attacker who forces a Redis outage can no longer reuse
 * previously revoked tokens.
 */
export const isTokenBlacklisted = async (jti) => {
  if (!redisClient) {
    logger.warn('[Security] Redis unavailable — treating all tokens as potentially blacklisted (fail-safe deny)');
    return true; // Deny by default when Redis is down
  }
  const res = await redisClient.get(`blacklist:token:${jti}`);
  return !!res;
};


// ─── OTP verification distributed lock ───────────────────────────────────────
// BUG-10 FIX: Prevents concurrent OTP verification for the same user, which
// could bypass the 3-attempt lockout via a race condition. A per-user Redis
// lock (SET NX EX) ensures only one verification is processed at a time.

const OTP_LOCK_TTL_SECONDS = 15;

export const acquireOtpLock = async (userId) => {
  if (!redisClient) {
    // If Redis is down, allow verification to proceed (rate-limiting still applies)
    return true;
  }
  const key = `otp:verify:lock:${userId}`;
  const result = await redisClient.set(key, '1', 'NX', 'EX', OTP_LOCK_TTL_SECONDS);
  return result === 'OK';
};

export const releaseOtpLock = async (userId) => {
  if (!redisClient) { return; }
  await redisClient.del(`otp:verify:lock:${userId}`);
};


// ─── Brute Force Lockout Helpers ──────────────────────────────────────────────
export const incrementFailedAttempts = async (email, ipAddress) => {
  if (!redisClient) { return; }
  const key = `lockout:failed:${email}:${ipAddress}`;
  const attempts = await redisClient.incr(key);
  if (attempts === 1) {
    // 15-minute lockout window
    await redisClient.expire(key, 15 * 60);
  }
  return attempts;
};

export const getFailedAttempts = async (email, ipAddress) => {
  if (!redisClient) { return 0; }
  const key = `lockout:failed:${email}:${ipAddress}`;
  const attempts = await redisClient.get(key);
  return attempts ? parseInt(attempts, 10) : 0;
};

export const clearFailedAttempts = async (email, ipAddress) => {
  if (!redisClient) { return; }
  const key = `lockout:failed:${email}:${ipAddress}`;
  await redisClient.del(key);
};


export { redisClient };
export default redisClient;
