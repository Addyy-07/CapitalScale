import { redisClient } from '../../config/redis.js';
import env from '../../config/env.js';
import logger from '../../utils/logger.js';

/**
 * Redis-backed sliding window rate limiter for email sending.
 *
 * Key strategy:
 *   email:ratelimit:general:{minute_epoch}  → general emails sent this minute
 *   email:ratelimit:otp:{minute_epoch}      → OTP emails sent this minute
 *
 * OTP queue reserves OTP_RATE_RESERVE slots.
 * General queue may use remaining slots: (limit - otpSentThisMinute - generalSentThisMinute)
 */

const _getMinuteKey = (bucket) => {
  const minuteEpoch = Math.floor(Date.now() / 60000);
  return `email:ratelimit:${bucket}:${minuteEpoch}`;
};

/**
 * Check if sending is allowed and atomically increment the counter.
 *
 * @param {'otp' | 'general'} bucket
 * @returns {Promise<{ allowed: boolean, remaining: number, resetInMs: number }>}
 */
export const acquireEmailSlot = async (bucket = 'general') => {
  if (!redisClient) {
    // Redis not available — allow sending (graceful degradation)
    return { allowed: true, remaining: 999, resetInMs: 0 };
  }

  const limit = env.EMAIL_RATE_LIMIT_PER_MINUTE;
  const otpReserve = env.OTP_RATE_RESERVE;
  const generalLimit = limit - otpReserve;

  const otpKey     = _getMinuteKey('otp');
  const generalKey = _getMinuteKey('general');
  const bucketKey  = bucket === 'otp' ? otpKey : generalKey;
  const bucketLimit = bucket === 'otp' ? otpReserve : generalLimit;

  // Atomically increment and check
  const pipeline = redisClient.pipeline();
  pipeline.incr(bucketKey);
  pipeline.ttl(bucketKey);
  const [[, count], [, ttl]] = await pipeline.exec();

  // Set TTL on first increment (key expires in 61 seconds to cover edge of minute)
  if (count === 1) {
    await redisClient.expire(bucketKey, 61);
  }

  const remaining = Math.max(0, bucketLimit - count);
  const resetInMs = ttl > 0 ? ttl * 1000 : 60000;

  if (count > bucketLimit) {
    logger.warn(`[RateLimiter] ${bucket} bucket full (${count}/${bucketLimit}) — throttling`);
    // Decrement back since we won't send
    await redisClient.decr(bucketKey);
    return { allowed: false, remaining: 0, resetInMs };
  }

  return { allowed: true, remaining, resetInMs };
};

/**
 * Get current usage stats for monitoring.
 */
export const getEmailRateLimitStats = async () => {
  if (!redisClient) return { otpSent: 0, generalSent: 0, limit: env.EMAIL_RATE_LIMIT_PER_MINUTE };

  const otpCount     = parseInt(await redisClient.get(_getMinuteKey('otp'))     || '0', 10);
  const generalCount = parseInt(await redisClient.get(_getMinuteKey('general')) || '0', 10);

  return {
    otpSent: otpCount,
    generalSent: generalCount,
    totalSent: otpCount + generalCount,
    limitPerMinute: env.EMAIL_RATE_LIMIT_PER_MINUTE,
    otpReserve: env.OTP_RATE_RESERVE,
  };
};
