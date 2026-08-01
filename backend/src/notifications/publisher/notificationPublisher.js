import { v4 as uuidv4 } from 'uuid';
import { getPublishChannel, EXCHANGES } from '../../config/rabbitmq.js';
import logger from '../../utils/logger.js';

/**
 * Publish a notification event to RabbitMQ.
 *
 * @param {string} eventType  - From NOTIFICATION_EVENTS constants
 * @param {object} payload    - Event-specific data
 * @param {object} options
 * @param {number} options.priority - 1-10 (default 5; OTP should use 10)
 */
export const publishEvent = async (eventType, payload, { priority = 5 } = {}) => {
  let channel;
  try {
    channel = await getPublishChannel();

    const message = {
      correlationId: uuidv4(),
      eventType,
      timestamp: new Date().toISOString(),
      priority,
      retryCount: 0,
      payload,
    };

    const buffer = Buffer.from(JSON.stringify(message));

    const published = channel.publish(
      EXCHANGES.NOTIFICATIONS,
      eventType,           // routing key matches the event type (e.g. "otp.send", "loan.status.approved")
      buffer,
      {
        persistent: true,  // survive broker restarts
        priority,
        contentType: 'application/json',
        messageId: message.correlationId,
        timestamp: Date.now(),
      }
    );

    if (!published) {
      // Channel's write buffer is full — backpressure signal
      logger.warn(`[NotificationPublisher] Backpressure: message not published immediately for event ${eventType}`);
    }

    logger.info(`[NotificationPublisher] Published event: ${eventType} | correlationId: ${message.correlationId}`);
    return message.correlationId;
  } catch (err) {
    logger.error(`[NotificationPublisher] Failed to publish event ${eventType}: ${err.message}`);
    throw err;
  }
};
