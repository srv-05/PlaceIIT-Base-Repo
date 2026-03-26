import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { Bell, CheckCircle, AlertCircle, Info, Building2, Clock, Search, Loader2, CheckCheck, Trash2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { studentApi } from "@/app/lib/api";
import { useSocket } from "@/app/socket-context";
import { useAuth } from "@/app/auth-context";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: "info" | "warning" | "success";
  title: string;
  message: string;
  company?: string;
  timestamp: string;
  isRead: boolean;
}

/** Derive a display type from backend type + message content. */
const classifyNotificationType = (rawType: string | undefined, message: string): "info" | "warning" | "success" => {
  const msg = (message || "").toLowerCase();

  // Backend "alert" type maps to warning (displayed as ALERT)
  if (rawType === "alert") return "warning";

  // interview_call is always urgent → ALERT
  if (rawType === "interview_call") return "warning";

  // Check for success-related keywords
  const successKw = ["congratulations", "cleared", "completed", "selected", "offer", "accepted"];
  if (successKw.some((kw) => msg.includes(kw))) return "success";

  // Check for alert-related keywords
  const alertKw = ["report immediately", "urgent", "be ready", "called for", "about to begin"];
  if (alertKw.some((kw) => msg.includes(kw))) return "warning";

  return "info";
};

/** User-facing label for notification type. */
const getTypeLabel = (type: string): string => {
  switch (type) {
    case "warning": return "ALERT";
    case "success": return "SUCCESS";
    default: return "INFO";
  }
};

/** Tailwind classes for the type label pill. */
const getTypeLabelClasses = (type: string): string => {
  switch (type) {
    case "warning": return "bg-yellow-100 text-yellow-800 border border-yellow-300";
    case "success": return "bg-green-100 text-green-800 border border-green-300";
    default: return "bg-blue-100 text-blue-800 border border-blue-300";
  }
};

/** Card background classes per type. */
const getCardBgClasses = (type: string, isRead: boolean): string => {
  // Use thicker left border for unread, regular border for read
  const borderStyle = !isRead ? "border-l-4" : "border";
  switch (type) {
    case "success": return `${borderStyle} border-green-400`;
    case "warning": return `${borderStyle} border-red-400`;
    default: return `${borderStyle} border-blue-400`;
  }
};

/** Inline style to force background color based on type. */
const getCardBgStyle = (type: string): React.CSSProperties => {
  switch (type) {
    case "success": return { backgroundColor: "#dcfce7" }; // green-100
    case "warning": return { backgroundColor: "#fee2e2" }; // red-100
    default: return { backgroundColor: "#dbeafe" };        // blue-100
  }
};

export function StudentNotificationsPage() {
  const { socket } = useSocket();
  const auth = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const normalizeNotif = (raw: any): Notification => {
    const message = raw.message ?? raw.body ?? "";
    return {
      id: raw._id ?? raw.id ?? "",
      type: classifyNotificationType(raw.type, message),
      title: raw.title ?? raw.subject ?? "Notification",
      message,
      company: raw.companyName ?? raw.company?.name ?? undefined,
      timestamp: raw.createdAt ?? raw.timestamp ?? new Date().toISOString(),
      isRead: raw.isRead ?? raw.read ?? false,
    };
  };

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data: any = await studentApi.getNotifications();
      const list = Array.isArray(data) ? data : data.notifications ?? [];
      const mapped = list.map(normalizeNotif);
      setNotifications(mapped);
      auth.setUnreadNotificationsCount(mapped.filter((n: Notification) => !n.isRead).length);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // ── Real-time new notifications ──────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handleNewNotif = (raw: any) => {
      const notif = normalizeNotif(raw);
      setNotifications((prev) => [notif, ...prev]);
      toast.info(notif.message || "You have a new notification.");
    };
    socket.on("notification:sent", handleNewNotif);
    return () => { socket.off("notification:sent", handleNewNotif); };
  }, [socket]);
  // ─────────────────────────────────────────────────────────────────────────

  const handleMarkRead = async (id: string) => {
    try {
      await studentApi.markNotifRead(id);
      setNotifications((prev) => {
        const updated = prev.map((n) => (n.id === id ? { ...n, isRead: true } : n));
        auth.setUnreadNotificationsCount(updated.filter((n) => !n.isRead).length);
        return updated;
      });
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await studentApi.markAllNotifRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      auth.setUnreadNotificationsCount(0);
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const handleClearAll = async () => {
    try {
      await studentApi.clearAllNotifications();
      setNotifications([]);
      auth.setUnreadNotificationsCount(0);
      setShowClearConfirm(false);
      toast.success("All notifications cleared");
    } catch {
      toast.error("Failed to clear notifications");
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success": return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "warning": return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case "info": return <Info className="h-5 w-5 text-blue-600" />;
      default: return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getNotificationBadge = (type: string) => {
    switch (type) {
      case "success": return <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Success</Badge>;
      case "warning": return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">Alert</Badge>;
      case "info": return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">Info</Badge>;
      default: return null;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} minutes ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs} hours ago`;
    return date.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = notifications.filter((notification) => {
    const matchesSearch =
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (notification.company && notification.company.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = selectedFilter === "all" || notification.type === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 gap-2">
        <Loader2 className="h-6 w-6 animate-spin" /> Loading notifications…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Bell className="h-8 w-8 mr-3 text-indigo-600" />
          Notifications
        </h1>
        {unreadCount > 0 && (
          <Badge className="bg-red-100 text-red-800 border-red-200 text-sm px-4 py-2">
            {unreadCount} Unread
          </Badge>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="flex gap-2 justify-end">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <CheckCheck className="h-4 w-4 mr-2" /> Mark All as Read
            </Button>
          )}
          <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setShowClearConfirm(true)}>
            <Trash2 className="h-4 w-4 mr-2" /> Clear All
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input placeholder="Search notifications…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={selectedFilter} onValueChange={setSelectedFilter}>
              <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Filter by Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="warning">Alert</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {notifications.length === 0 ? (
        <Card className="bg-gray-50">
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No notifications yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition-all hover:shadow-md ${getCardBgClasses(notification.type, notification.isRead)}`}
              style={getCardBgStyle(notification.type)}
            >
              <CardHeader className="pb-3">
                {/* Type Label Box */}
                <div className="mb-2">
                  <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${getTypeLabelClasses(notification.type)}`}>
                    {getTypeLabel(notification.type)}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <CardTitle className="text-base text-gray-900">{notification.title}</CardTitle>
                        {!notification.isRead && <Badge className="bg-indigo-600 text-white text-xs">New</Badge>}
                      </div>
                      {notification.company && (
                        <div className="flex items-center text-xs text-gray-600 mb-2">
                          <Building2 className="h-3 w-3 mr-1" /> {notification.company}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 mb-3">{notification.message}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-xs text-gray-500">
                    <Clock className="h-3 w-3 mr-1" /> {formatTimestamp(notification.timestamp)}
                  </div>
                  {!notification.isRead && (
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleMarkRead(notification.id)}>
                      Mark as Read
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Clear All Confirmation Dialog */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Notifications</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear all notifications? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll} className="bg-red-600 hover:bg-red-700">
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}