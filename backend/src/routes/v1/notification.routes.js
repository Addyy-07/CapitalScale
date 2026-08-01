import express from 'express';
import {
  getUserNotifications,
  getUnreadNotificationsCount,
  markNotificationRead,
  markAllNotificationsRead,
  streamNotifications,
  getNotificationMetrics
} from '../../controllers/notification.controller.js';
import { protect, authorizeRoles, ROLES } from '../../middleware/auth.js';

const router = express.Router();

// SSE Endpoint (must not be rate limited by general API limiter if possible)
// But it MUST be protected by auth
router.get('/sse', protect, streamNotifications);

// API Endpoints
router.use(protect);

router.get('/', getUserNotifications);
router.get('/unread-count', getUnreadNotificationsCount);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:id/read', markNotificationRead);

// Internal Metrics
router.get('/metrics', authorizeRoles(ROLES.SUPER_ADMIN), getNotificationMetrics);

export default router;
