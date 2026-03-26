import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Bell, CheckCircle, AlertCircle, Info, Building2, Clock, Search, Loader2, User, ShieldAlert, Trash2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { adminApi } from "@/app/lib/api";
import { useSocket } from "@/app/socket-context";
import { useAuth } from "@/app/auth-context";

interface Notification {
  id: string;
  type: string;
  source: string;
  senderName?: string;
  senderRoll?: string;
  title: string;
  message: string;
  company?: string;
  timestamp: string;
  isRead: boolean;
  read?: boolean;
}

export function APCNotificationsPage() {
  const { socket } = useSocket();
  const auth = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const normalizeNotif = (raw: any): Notification => ({
    id: raw._id ?? raw.id ?? "",
    type: raw.type ?? "info",
    source: raw.source ?? "system",
    senderName: raw.senderId?.name,
    senderRoll: raw.senderId?.rollNumber,
    title: raw.title ?? raw.subject ?? mapTypeToTitle(raw.type),
    message: raw.message ?? raw.body ?? "",
    company: raw.companyId?.name ?? raw.companyName ?? raw.company?.name ?? undefined,
    timestamp: raw.createdAt ?? raw.timestamp ?? new Date().toISOString(),
    isRead: raw.isRead ?? raw.read ?? false,
  });

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data: any = await adminApi.getNotifications();
      const list = Array.isArray(data) ? data : data.notifications ?? [];
      setNotifications(list.map(normalizeNotif));
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Real-time
  useEffect(() => {
    if (!socket) return;
    const handleNewNotif = (raw: any) => {
      const notif = normalizeNotif(raw);
      setNotifications((prev) => [notif, ...prev]);
    };
    socket.on("notification:sent", handleNewNotif);
    return () => { socket.off("notification:sent", handleNewNotif); };
  }, [socket]);

  // Sync Unread Count
  useEffect(() => {
    if (!loading) {
      const unread = notifications.filter(n => !n.isRead && !n.read).length;
      auth.setApcUnreadNotificationsCount(unread);
    }
  }, [notifications, loading, auth]);

  const handleMarkRead = async (id: string) => {
    try {
      await adminApi.markNotifRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch { /* silently fail */ }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    for (const n of unread) {
      try { await adminApi.markNotifRead(n.id); } catch { /* skip */ }
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleClearAll = async () => {
    try {
      await adminApi.clearAllNotifications();
      setNotifications([]);
    } catch { /* skip */ }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "alert": return <AlertCircle className="h-5 w-5 text-red-600" />;
      case "warning": return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case "success": return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "interview_call": return <Bell className="h-5 w-5 text-indigo-600" />;
      case "queue_update": return <Clock className="h-5 w-5 text-blue-600" />;
      case "query_reply": case "query_resolved": return <User className="h-5 w-5 text-purple-600" />;
      case "info": return <Info className="h-5 w-5 text-blue-600" />;
      default: return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getNotificationBadge = (type: string) => {
    switch (type) {
      case "alert": return <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">Alert</Badge>;
      case "warning": return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">Warning</Badge>;
      case "interview_call": return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-xs">Interview</Badge>;
      case "queue_update": return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">Queue</Badge>;
      case "query_reply": case "query_resolved": return <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">Query</Badge>;
      case "info": return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">Info</Badge>;
      default: return <Badge className="bg-gray-100 text-gray-800 border-gray-200 text-xs">General</Badge>;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs} hours ago`;
    return date.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = notifications.filter((n) =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (n.company && n.company.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4 pb-8">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge className="bg-red-100 text-red-800 border-red-200 text-sm px-2 py-1">
              {unreadCount} New
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="h-8 text-xs">
              Mark all read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearAll} className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="h-3 w-3 mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm" />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {notifications.length === 0 ? (
          <div className="py-12 text-center text-gray-500 flex flex-col items-center">
            <Bell className="h-8 w-8 text-gray-300 mb-2" />
            <p className="text-sm">No notifications.</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => !notification.isRead && handleMarkRead(notification.id)}
              className={`p-3 rounded-lg border transition-colors cursor-pointer ${!notification.isRead ? "border-indigo-300 bg-indigo-50 shadow-sm" : "border-gray-200 hover:bg-gray-50 bg-white"
                }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1 flex-shrink-0">{getNotificationIcon(notification.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-gray-900 truncate pr-2">{notification.title}</span>
                    {getNotificationBadge(notification.type)}
                  </div>

                  {notification.company && (
                    <div className="flex items-center text-xs text-gray-600 mb-1">
                      <Building2 className="h-3 w-3 mr-1 flex-shrink-0" /> {notification.company}
                    </div>
                  )}

                  <p className="text-xs text-gray-700 mb-2 line-clamp-3">{notification.message}</p>

                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" /> {formatTimestamp(notification.timestamp)}
                    </div>
                    {!notification.isRead && (
                      <Button variant="ghost" size="sm" className="h-6 text-[11px] text-indigo-700 hover:text-indigo-800 hover:bg-indigo-100 px-2" onClick={(e) => { e.stopPropagation(); handleMarkRead(notification.id); }}>
                        Mark as Read
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function mapTypeToTitle(type?: string): string {
  switch (type) {
    case "alert": return "Alert";
    case "interview_call": return "Interview Call";
    case "queue_update": return "Queue Update";
    case "status_update": return "Status Update";
    case "query_reply": return "Query Reply";
    case "query_resolved": return "Query Resolved";
    case "info": return "Information";
    case "warning": return "Warning";
    default: return "Notification";
  }
}
