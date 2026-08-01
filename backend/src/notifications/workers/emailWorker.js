import { createWorkerChannel, QUEUES } from '../../config/rabbitmq.js';
import { renderTemplate } from '../templates/index.js';
import { sendEmail } from '../services/emailSender.service.js';
import { acquireEmailSlot } from '../services/rateLimiter.service.js';
import { 
  createAndDeliverInAppNotification, 
  createAdminInAppNotification 
} from '../services/inAppNotification.service.js';
import { 
  SME_IN_APP_STATUSES, 
  SME_EMAIL_STATUSES, 
  NOTIFICATION_EVENTS 
} from '../events/notificationEvents.js';
import supabase from '../../db/supabaseClient.js';
import logger from '../../utils/logger.js';

let _channel = null;

const trackEmailJob = async (message, status, errorMsg = null) => {
  try {
    const email = message.payload?.smeEmail || message.payload?.email || 'unknown';
    await supabase.from('email_jobs').upsert({
      correlation_id: message.correlationId,
      recipient: email,
      template: message.eventType,
      payload: message.payload,
      status,
      retry_count: message.retryCount || 0,
      error_message: errorMsg,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'correlation_id' });
  } catch (err) {
    logger.error(`[Email Worker] Failed to track job state: ${err.message}`);
  }
};

export const startEmailWorker = async () => {
  try {
    _channel = await createWorkerChannel();

    _channel.consume(QUEUES.NOTIFICATIONS, async (msg) => {
      if (!msg) return;

      let messageData;
      try {
        messageData = JSON.parse(msg.content.toString());
      } catch (err) {
        logger.error(`[Email Worker] Invalid JSON format. Discarding message.`);
        _channel.ack(msg);
        return;
      }

      const { correlationId, eventType, payload, retryCount = 0 } = messageData;

      try {
        await trackEmailJob(messageData, 'processing');

        // 1. Process In-App Notifications First (Fast & Synchronous to DB)
        if (eventType.startsWith('loan.status.')) {
          const status = payload.toStatus;
          if (SME_IN_APP_STATUSES.has(status)) {
            await createAndDeliverInAppNotification({
              userId: payload.smeId,
              userType: 'sme',
              type: eventType,
              loanId: payload.loanId,
              appId: payload.appId,
              bankName: payload.bankName,
              toStatus: status,
              metadata: { missingDocs: payload.missingDocs }
            });
          }
        } 
        else if (eventType === NOTIFICATION_EVENTS.LOAN_MISSING_INFO_COMPLETED) {
          await createAdminInAppNotification({
            userId: payload.adminId,
            appId: payload.appId,
            smeName: payload.smeName,
            businessName: payload.businessName,
            loanId: payload.loanId
          });
        }

        // 2. Check if this event requires an email
        const isSmeEmail = eventType.startsWith('loan.status.') && SME_EMAIL_STATUSES.has(payload.toStatus);
        const isAdminEmail = eventType === NOTIFICATION_EVENTS.LOAN_MISSING_INFO_COMPLETED;
        
        if (!isSmeEmail && !isAdminEmail) {
          // Event processed (in-app only, no email needed)
          await trackEmailJob(messageData, 'sent');
          _channel.ack(msg);
          logger.info(`📬 [Notification Sent] Type: ${eventType} | Channel: IN-APP ONLY | User: ${payload.smeId || payload.adminId || 'unknown'} | App: ${payload.appId || 'N/A'} | ID: ${correlationId}`);
          return;
        }

        // 3. Process Email with Rate Limiting (General Bucket)
        const { allowed, resetInMs } = await acquireEmailSlot('general');
        
        if (!allowed) {
          logger.warn(`[Email Worker] Rate limited. Requeueing message ${correlationId}. Retry in ${resetInMs}ms`);
          await new Promise(r => setTimeout(r, Math.min(resetInMs, 5000)));
          _channel.nack(msg, false, true); 
          return;
        }

        // 4. Render and Send
        const emailContent = renderTemplate(eventType, payload);
        if (!emailContent) {
          throw new Error(`No template found for event ${eventType}`);
        }

        const toEmail = isAdminEmail ? payload.adminEmail : payload.smeEmail;

        await sendEmail({
          to: toEmail,
          subject: emailContent.subject,
          html: emailContent.html,
          correlationId,
          retryCount,
          maxRetries: 10
        });

        // 5. Success
        await trackEmailJob(messageData, 'sent');
        _channel.ack(msg);
        logger.info(`📧 [Notification Sent] Type: ${eventType} | Channel: EMAIL + IN-APP | To: ${toEmail} | App: ${payload.appId || 'N/A'} | Subject: "${emailContent.subject}" | ID: ${correlationId}`);

      } catch (err) {
        logger.error(`[Email Worker] Processing failed for ${correlationId}: ${err.message}`);
        
        messageData.retryCount = retryCount + 1;
        await trackEmailJob(messageData, 'failed', err.message);

        if (messageData.retryCount > 10) {
          logger.error(`[Email Worker] Max retries (10) exceeded for ${correlationId}. Rejecting (to DLQ).`);
          _channel.nack(msg, false, false);
        } else {
          await new Promise(r => setTimeout(r, 2000));
          _channel.ack(msg);
          _channel.publish(
             msg.fields.exchange, 
             msg.fields.routingKey, 
             Buffer.from(JSON.stringify(messageData)),
             { priority: 5 }
          );
        }
      }
    });

    logger.info(`✅ Email Worker started listening on queue: ${QUEUES.NOTIFICATIONS}`);
  } catch (err) {
    logger.error(`❌ Email Worker failed to start: ${err.message}`);
  }
};
