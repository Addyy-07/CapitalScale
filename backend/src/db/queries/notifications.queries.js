import supabase from '../supabaseClient.js';
import logger from '../../utils/logger.js';

/**
 * Fetch paginated in-app notifications for a user.
 */
export const getNotifications = async ({ userId, limit = 20, unreadOnly = false }) => {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (err) {
    logger.error(`[DB] getNotifications failed: ${err.message}`);
    throw err;
  }
};

/**
 * Get unread notification count.
 */
export const getUnreadCount = async (userId) => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  } catch (err) {
    logger.error(`[DB] getUnreadCount failed: ${err.message}`);
    throw err;
  }
};

/**
 * Mark a single notification as read.
 */
export const markAsRead = async (id, userId) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    logger.error(`[DB] markAsRead failed: ${err.message}`);
    throw err;
  }
};

/**
 * Mark all notifications as read for a user.
 */
export const markAllAsRead = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false)
      .select('id'); // return updated ids

    if (error) throw error;
    return data;
  } catch (err) {
    logger.error(`[DB] markAllAsRead failed: ${err.message}`);
    throw err;
  }
};
