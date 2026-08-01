import { createWorkerChannel, QUEUES } from '../../config/rabbitmq.js';
import supabase from '../../db/supabaseClient.js';
import logger from '../../utils/logger.js';

let _channel = null;

export const startDLQProcessor = async () => {
  try {
    _channel = await createWorkerChannel();

    _channel.consume(QUEUES.DLQ, async (msg) => {
      if (!msg) return;

      let messageData;
      try {
        messageData = JSON.parse(msg.content.toString());
      } catch (err) {
        logger.error(`[DLQ Processor] Invalid JSON format in DLQ. Discarding message.`);
        _channel.ack(msg);
        return;
      }

      const { correlationId, eventType } = messageData;

      try {
        // Just mark the job as DLQ in the database.
        // In a real system, you might trigger a Slack alert here to Ops.
        await supabase.from('email_jobs').update({
          status: 'dlq',
          updated_at: new Date().toISOString()
        }).eq('correlation_id', correlationId);

        logger.error(`🚨 [DLQ Processor] Message permanently failed and moved to DLQ: ${correlationId} | Type: ${eventType}`);
        
        // Acknowledge to clear from DLQ, since we've recorded it in the DB
        _channel.ack(msg);

      } catch (err) {
        logger.error(`[DLQ Processor] Failed to process DLQ message ${correlationId}: ${err.message}`);
        // If DB fails, don't ack, let it sit in DLQ
        _channel.nack(msg, false, true);
      }
    });

    logger.info(`✅ DLQ Processor started listening on queue: ${QUEUES.DLQ}`);
  } catch (err) {
    logger.error(`❌ DLQ Processor failed to start: ${err.message}`);
  }
};
