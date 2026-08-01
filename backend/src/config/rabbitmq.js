import amqplib from 'amqplib';
import env from './env.js';
import logger from '../utils/logger.js';

// ── Exchange and queue names ────────────────────────────────────────────────
export const EXCHANGES = Object.freeze({
  NOTIFICATIONS: 'capitalscale.notifications',
  DLX: 'capitalscale.dlx',
});

export const QUEUES = Object.freeze({
  OTP: 'otp_queue',
  NOTIFICATIONS: 'notification_queue',
  DLQ: 'dead_letter_queue',
});

export const ROUTING_KEYS = Object.freeze({
  OTP: 'otp.send',
  LOAN: 'loan.status',
  DLQ: 'dlq',
});

// ── Singleton connection + channel ─────────────────────────────────────────
let _connection = null;
let _publishChannel = null;
let _isConnecting = false;

/**
 * Connect to RabbitMQ and set up the full topology.
 * Safe to call multiple times — returns cached connection.
 */
export const connectRabbitMQ = async () => {
  if (_connection) return _connection;
  if (_isConnecting) {
    // Wait for in-progress connection
    await new Promise((resolve) => setTimeout(resolve, 500));
    return _connection;
  }

  _isConnecting = true;

  try {
    _connection = await amqplib.connect(env.RABBITMQ_URL);
    logger.info('✅ Connected to RabbitMQ successfully');

    _connection.on('error', (err) => {
      logger.error('❌ RabbitMQ connection error:', err.message);
      _connection = null;
      _publishChannel = null;
    });

    _connection.on('close', () => {
      logger.warn('⚠️  RabbitMQ connection closed — will reconnect on next use');
      _connection = null;
      _publishChannel = null;
    });

    await _setupTopology();
    return _connection;
  } catch (err) {
    _connection = null;
    logger.error('❌ Failed to connect to RabbitMQ:', err.message);
    throw err;
  } finally {
    _isConnecting = false;
  }
};

/**
 * Declare exchanges, queues, and bindings.
 * Idempotent — safe to call on reconnect.
 */
const _setupTopology = async () => {
  const ch = await _connection.createChannel();

  // Dead letter exchange (direct)
  await ch.assertExchange(EXCHANGES.DLX, 'direct', { durable: true });

  // Dead letter queue
  await ch.assertQueue(QUEUES.DLQ, { durable: true });
  await ch.bindQueue(QUEUES.DLQ, EXCHANGES.DLX, ROUTING_KEYS.DLQ);

  // Main notifications exchange (topic)
  await ch.assertExchange(EXCHANGES.NOTIFICATIONS, 'topic', { durable: true });

  // OTP queue — highest priority (10), dead-lettered on rejection
  await ch.assertQueue(QUEUES.OTP, {
    durable: true,
    arguments: {
      'x-max-priority': 10,
      'x-dead-letter-exchange': EXCHANGES.DLX,
      'x-dead-letter-routing-key': ROUTING_KEYS.DLQ,
    },
  });
  await ch.bindQueue(QUEUES.OTP, EXCHANGES.NOTIFICATIONS, 'otp.#');

  // Notification queue — standard priority (5), dead-lettered on rejection
  await ch.assertQueue(QUEUES.NOTIFICATIONS, {
    durable: true,
    arguments: {
      'x-max-priority': 5,
      'x-dead-letter-exchange': EXCHANGES.DLX,
      'x-dead-letter-routing-key': ROUTING_KEYS.DLQ,
    },
  });
  await ch.bindQueue(QUEUES.NOTIFICATIONS, EXCHANGES.NOTIFICATIONS, 'loan.#');

  await ch.close();
  logger.info('✅ RabbitMQ topology asserted (exchanges, queues, bindings)');
};

/**
 * Get a shared publish channel (creates one if needed).
 * Workers should create their own dedicated channels via createWorkerChannel().
 */
export const getPublishChannel = async () => {
  if (!_connection) await connectRabbitMQ();
  if (!_publishChannel) {
    _publishChannel = await _connection.createChannel();
    _publishChannel.on('error', (err) => {
      logger.error('❌ RabbitMQ publish channel error:', err.message);
      _publishChannel = null;
    });
    _publishChannel.on('close', () => {
      _publishChannel = null;
    });
  }
  return _publishChannel;
};

/**
 * Create a dedicated channel for a worker (each worker owns its own channel).
 */
export const createWorkerChannel = async () => {
  if (!_connection) await connectRabbitMQ();
  const ch = await _connection.createChannel();
  // Prefetch 1 — process one message at a time for reliability
  await ch.prefetch(1);
  return ch;
};

/**
 * Gracefully close the RabbitMQ connection during server shutdown.
 */
export const closeRabbitMQ = async () => {
  try {
    if (_publishChannel) { await _publishChannel.close(); _publishChannel = null; }
    if (_connection)     { await _connection.close();     _connection = null; }
    logger.info('✅ RabbitMQ connection closed gracefully');
  } catch (err) {
    logger.error('❌ Error closing RabbitMQ:', err.message);
  }
};

export default { connectRabbitMQ, getPublishChannel, createWorkerChannel, closeRabbitMQ, EXCHANGES, QUEUES, ROUTING_KEYS };
