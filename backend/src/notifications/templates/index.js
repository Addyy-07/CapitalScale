import { otpTemplate } from './otp.template.js';
import { loanApprovedTemplate } from './loanApproved.template.js';
import { loanRejectedTemplate } from './loanRejected.template.js';
import { missingInfoTemplate } from './missingInfo.template.js';
import { missingInfoCompletedTemplate } from './missingInfoCompleted.template.js';
import { NOTIFICATION_EVENTS } from '../events/notificationEvents.js';

/**
 * Template registry — maps event types to template functions.
 * To add a new template: create the file and add a mapping here.
 *
 * Each template function receives (payload) and returns { subject, html }.
 */
const TEMPLATE_REGISTRY = {
  [NOTIFICATION_EVENTS.AUTH_OTP_SEND]: (p) => otpTemplate({
    code: p.code,
    expiresInMinutes: p.expiresInMinutes,
    recipientName: p.recipientName,
  }),
  [NOTIFICATION_EVENTS.LOAN_APPROVED]: (p) => loanApprovedTemplate({
    smeName: p.smeName,
    appId: p.appId,
    bankName: p.bankName,
    loanAmount: p.loanAmount,
    tenure: p.tenure,
  }),
  [NOTIFICATION_EVENTS.LOAN_REJECTED]: (p) => loanRejectedTemplate({
    smeName: p.smeName,
    appId: p.appId,
    bankName: p.bankName,
    notes: p.notes,
  }),
  [NOTIFICATION_EVENTS.LOAN_MISSING_INFO]: (p) => missingInfoTemplate({
    smeName: p.smeName,
    appId: p.appId,
    bankName: p.bankName,
    missingDocs: p.missingDocs,
  }),
  [NOTIFICATION_EVENTS.LOAN_MISSING_INFO_COMPLETED]: (p) => missingInfoCompletedTemplate({
    adminName: p.adminName,
    appId: p.appId,
    smeName: p.smeName,
    businessName: p.businessName,
  }),
};

/**
 * Render an email template by event type.
 * Returns null if no template is registered for this event
 * (indicating the event does not require an email).
 *
 * @param {string} eventType
 * @param {object} payload
 * @returns {{ subject: string, html: string } | null}
 */
export const renderTemplate = (eventType, payload) => {
  const templateFn = TEMPLATE_REGISTRY[eventType];
  if (!templateFn) return null;
  return templateFn(payload);
};

export default TEMPLATE_REGISTRY;
