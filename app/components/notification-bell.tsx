import { useState, useRef, useEffect } from "react";
import { useFetcher, useNavigate } from "react-router";
import { Bell } from "lucide-react";
import { cn } from "~/lib/utils";

interface Notification {
  id: number;
  title: string;
  message: string;
  linkUrl: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationBellProps {
  unreadCount: number;
  notifications: Notification[];
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell({
  unreadCount,
  notifications,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const markReadFetcher = useFetcher();
  const markAllReadFetcher = useFetcher();
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleNotificationClick(notification: Notification) {
    if (!notification.isRead) {
      markReadFetcher.submit(
        { notificationId: String(notification.id) },
        { method: "post", action: "/api/notifications/mark-read" }
      );
    }
    setOpen(false);
    navigate(notification.linkUrl);
  }

  function handleMarkAllRead() {
    markAllReadFetcher.submit(
      {},
      { method: "post", action: "/api/notifications/mark-all-read" }
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-md p-1 text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        title="Notifications"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-80 rounded-md border border-sidebar-border bg-sidebar shadow-lg">
          <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-2">
            <span className="text-sm font-semibold text-sidebar-foreground">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-primary hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-sidebar-foreground/50">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "w-full px-4 py-3 text-left transition-colors hover:bg-sidebar-accent",
                    !notification.isRead && "bg-sidebar-accent/50"
                  )}
                >
                  <div className="flex items-start gap-2">
                    {!notification.isRead && (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                    )}
                    <div className={cn("min-w-0 flex-1", notification.isRead && "ml-4")}>
                      <div className="text-sm font-medium text-sidebar-foreground">
                        {notification.title}
                      </div>
                      <div className="truncate text-xs text-sidebar-foreground/70">
                        {notification.message}
                      </div>
                      <div className="mt-1 text-xs text-sidebar-foreground/50">
                        {timeAgo(notification.createdAt)}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
