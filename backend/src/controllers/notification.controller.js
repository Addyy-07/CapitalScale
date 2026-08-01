import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../db/queries/notifications.queries.js';
import { addConnection, getSSEMetrics } from '../notifications/sse/sseManager.js';
import { getEmailRateLimitStats } from '../notifications/services/rateLimiter.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * @route   GET /api/v1/notifications
 * @desc    Get paginated notifications
 * @access  Private
 */
export const getUserNotifications = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const unreadOnly = req.query.unread === 'true';

  const data = await getNotifications({
    userId: req.user.id,
    limit,
    unreadOnly,
  });

  res.status(200).json(new ApiResponse(200, data, 'Notifications retrieved successfully'));
});

/**
 * @route   GET /api/v1/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
export const getUnreadNotificationsCount = asyncHandler(async (req, res) => {
  const count = await getUnreadCount(req.user.id);
  res.status(200).json(new ApiResponse(200, { count }, 'Unread count retrieved'));
});

/**
 * @route   PATCH /api/v1/notifications/:id/read
 * @desc    Mark a notification as read
 * @access  Private
 */
export const markNotificationRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = await markAsRead(id, req.user.id);
  
  if (!data) {
    throw new ApiError(404, 'Notification not found');
  }

  res.status(200).json(new ApiResponse(200, data, 'Notification marked as read'));
});

/**
 * @route   PATCH /api/v1/notifications/read-all
 * @desc    Mark all notifications as read for current user
 * @access  Private
 */
export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const updatedIds = await markAllAsRead(req.user.id);
  res.status(200).json(new ApiResponse(200, { count: updatedIds?.length || 0 }, 'All notifications marked as read'));
});

/**
 * @route   GET /api/v1/notifications/sse
 * @desc    Server-Sent Events endpoint for real-time notifications
 * @access  Private
 */
export const streamNotifications = (req, res) => {
  // Use the established SSE manager to handle the connection
  addConnection(req.user.id, req, res);
};

/**
 * @route   GET /api/v1/notifications/metrics
 * @desc    Internal metrics for the notification module
 * @access  Private (Super Admin)
 */
export const getNotificationMetrics = asyncHandler(async (req, res) => {
  // Only super admins should see this, or just internal monitoring
  if (req.user.role !== 'SUPER_ADMIN') {
    throw new ApiError(403, 'Unauthorized access to metrics');
  }

  const rateLimitStats = await getEmailRateLimitStats();
  const sseStats = getSSEMetrics();

  res.status(200).json(new ApiResponse(200, {
    rateLimiter: rateLimitStats,
    sse: sseStats,
  }, 'Metrics retrieved'));
});
