import { useEffect, useRef, useState } from 'react';
import { NotificationFeedItem } from '../types';

interface NotificationPanelProps {
  notifications: NotificationFeedItem[];
  onMarkRead: (ids: string[]) => void;
  onMarkAllRead: () => void;
}

const NotificationPanel = ({ notifications, onMarkRead, onMarkAllRead }: NotificationPanelProps) => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  const unreadNotifications = notifications.filter((item) => !item.is_read).length;

  useEffect(() => {
    if (!notificationsOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notificationsOpen]);

  const handleNotificationClick = (id: string) => {
    const target = notifications.find((item) => item.id === id);
    if (!target || target.is_read) return;
    onMarkRead([id]);
  };

  return (
    <div ref={notificationsRef} className="relative">
      <button
        onClick={() => setNotificationsOpen((prev) => !prev)}
        className="w-11 h-11 rounded-2xl border border-zinc-200 bg-white flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 transition-all relative group shadow-md hover:shadow-lg"
        aria-label="Toggle notifications"
        aria-expanded={notificationsOpen}
      >
        {unreadNotifications > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-amber-400 text-zinc-900 text-[10px] font-bold flex items-center justify-center">
            {unreadNotifications > 9 ? '9+' : unreadNotifications}
          </span>
        )}
        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6V11c0-3.07-1.63-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
        </svg>
      </button>

      {notificationsOpen && (
        <div className="notification-panel-open absolute right-0 mt-2 w-[360px] bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden z-30">
          <div className="px-4 py-3 border-b border-zinc-200 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-zinc-900">Notifications</p>
              <p className="text-[11px] text-zinc-500">
                {unreadNotifications} unread
              </p>
            </div>
            <button
              onClick={onMarkAllRead}
              className="text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 disabled:text-zinc-300 disabled:hover:text-zinc-300"
              disabled={unreadNotifications === 0}
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-semibold text-zinc-700">No notifications yet</p>
                <p className="text-xs text-zinc-500 mt-1">You are all caught up.</p>
              </div>
            ) : (
              notifications.map((item) => {
                const toneClass =
                  item.tone === 'success'
                    ? 'bg-emerald-500'
                    : item.tone === 'warning'
                      ? 'bg-amber-500'
                      : 'bg-blue-500';

                return (
                  <button
                    key={item.id}
                    className={`w-full text-left px-4 py-3 border-b border-zinc-100 hover:bg-zinc-50 transition-colors ${
                      !item.is_read ? 'bg-zinc-50/70' : 'bg-white'
                    }`}
                    onClick={() => handleNotificationClick(item.id)}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`w-2 h-2 rounded-full mt-1.5 ${toneClass}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-zinc-900 truncate">{item.title}</p>
                          <span className="text-[10px] text-zinc-400 shrink-0">
                            {new Date(item.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">{item.message}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
