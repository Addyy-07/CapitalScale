import { redisClient } from '../../config/redis.js';
import logger from '../../utils/logger.js';

// Map of userId -> array of active HTTP response objects
const _connections = new Map();

const REDIS_CHANNEL_PREFIX = 'sse:user:';
let _redisSubscriber = null;
let _heartbeatInterval = null;

/**
 * Initialize the SSE Manager.
 * Subscribes to Redis Pub/Sub for cross-instance message delivery.
 */
export const initSSEManager = () => {
  if (!redisClient) {
    logger.warn('[SSE Manager] Redis not configured. SSE will only work for single-instance deployments.');
    return;
  }

  // Duplicate the client for subscribing (Pub/Sub blocks the connection)
  _redisSubscriber = redisClient.duplicate();

  _redisSubscriber.on('message', (channel, message) => {
    if (channel.startsWith(REDIS_CHANNEL_PREFIX)) {
      const userId = channel.replace(REDIS_CHANNEL_PREFIX, '');
      const eventData = JSON.parse(message);
      _pushToLocalConnections(userId, eventData);
    }
  });

  // Keep connections alive
  _heartbeatInterval = setInterval(() => {
    for (const [userId, resList] of _connections.entries()) {
      for (const res of resList) {
        res.write(':\n\n'); // SSE comment acts as heartbeat
      }
    }
  }, 30000);

  logger.info('✅ SSE Manager initialized with Redis Pub/Sub');
};

/**
 * Register a new client connection.
 */
export const addConnection = (userId, req, res) => {
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Essential for Nginx/Proxies
  });

  res.write('retry: 10000\n\n'); // Tell client to retry after 10s if disconnected

  if (!_connections.has(userId)) {
    _connections.set(userId, []);
    // Subscribe to this user's channel on Redis
    if (_redisSubscriber) {
      _redisSubscriber.subscribe(`${REDIS_CHANNEL_PREFIX}${userId}`).catch(err => 
        logger.error(`[SSE] Redis subscribe failed for user ${userId}: ${err.message}`)
      );
    }
  }

  const userConnections = _connections.get(userId);
  userConnections.push(res);
  logger.info(`[SSE] Client connected for user ${userId}. Total active for user: ${userConnections.length}`);

  // Handle client disconnect
  req.on('close', () => removeConnection(userId, res));
};

/**
 * Remove a specific connection.
 */
export const removeConnection = (userId, res) => {
  const userConnections = _connections.get(userId);
  if (!userConnections) return;

  const index = userConnections.indexOf(res);
  if (index !== -1) {
    userConnections.splice(index, 1);
  }

  if (userConnections.length === 0) {
    _connections.delete(userId);
    // Unsubscribe from Redis channel
    if (_redisSubscriber) {
      _redisSubscriber.unsubscribe(`${REDIS_CHANNEL_PREFIX}${userId}`).catch(err => 
        logger.error(`[SSE] Redis unsubscribe failed for user ${userId}: ${err.message}`)
      );
    }
  }
};

/**
 * Push an event to a user's local active connections.
 */
const _pushToLocalConnections = (userId, eventData) => {
  const userConnections = _connections.get(userId);
  if (!userConnections) return;

  const dataString = JSON.stringify(eventData);
  for (const res of userConnections) {
    res.write(`data: ${dataString}\n\n`);
  }
};

/**
 * Publish an SSE event to a specific user.
 * Routes through Redis to reach all active server instances.
 */
export const publishSSEEvent = async (userId, eventData) => {
  if (redisClient) {
    // Publish to Redis; subscriber on all nodes (including this one) will pick it up
    await redisClient.publish(`${REDIS_CHANNEL_PREFIX}${userId}`, JSON.stringify(eventData));
  } else {
    // Fallback if no Redis
    _pushToLocalConnections(userId, eventData);
  }
};

export const getSSEMetrics = () => {
  let totalConns = 0;
  for (const list of _connections.values()) {
    totalConns += list.length;
  }
  return {
    activeUsers: _connections.size,
    totalConnections: totalConns
  };
};
