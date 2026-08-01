import React from 'react';
import { Check, Info } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { Card } from '../ui/card';

export default function NotificationDropdown({ onClose }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const handleMarkAll = () => {
    markAllAsRead();
  };

  const handleNotificationClick = (notif) => {
    if (!notif.is_read) {
      markAsRead(notif.id);
    }
    // Could route to specific loan page here if needed:
    // if (notif.loan_id) navigate(`/loan/${notif.loan_id}`);
    onClose();
  };

  const timeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <Card className="w-80 md:w-96 max-h-[85vh] flex flex-col shadow-xl border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <h3 className="font-semibold text-foreground">Notifications</h3>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            <Check className="w-3 h-3" /> Mark all read
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <Info className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-sm">You have no notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notif) => (
              <button
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`w-full text-left p-4 transition-colors hover:bg-muted/50 ${
                  !notif.is_read ? 'bg-primary/5' : ''
                }`}
              >
                <div className="flex gap-3">
                  <div className="mt-1 flex-shrink-0 text-xl">
                    {notif.metadata?.icon || '📢'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm mb-1 ${!notif.is_read ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2 leading-relaxed">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 font-medium uppercase tracking-wider">
                      {timeAgo(notif.created_at)}
                    </p>
                  </div>
                  {!notif.is_read && (
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-primary flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
