import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Bell, CheckCircle, AlertCircle, Info, Building2, Clock, Search, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { studentApi } from "@/app/lib/api";
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

export function StudentNotificationsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const normalizeNotif = (raw: any): Notification => ({
    id: raw._id ?? raw.id ?? "",
    type: raw.type ?? "info",
    title: raw.title ?? raw.subject ?? "Notification",
    message: raw.message ?? raw.body ?? "",
    company: raw.companyName ?? raw.company?.name ?? undefined,
    timestamp: raw.createdAt ?? raw.timestamp ?? new Date().toISOString(),
    isRead: raw.isRead ?? raw.read ?? false,
  });

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data: any = await studentApi.getNotifications();
      const list = Array.isArray(data) ? data : data.notifications ?? [];
      setNotifications(list.map(normalizeNotif));
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const handleMarkRead = async (id: string) => {
    try {
      await studentApi.markNotifRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      toast.error("Failed to mark as read");
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

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input placeholder="Search notifications…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={selectedFilter} onValueChange={setSelectedFilter}>
              <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Filter by type" /></SelectTrigger>
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
              className={`transition-all hover:shadow-md ${!notification.isRead ? "border-l-4 border-l-indigo-600 bg-indigo-50" : ""}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <CardTitle className="text-base text-gray-900">{notification.title}</CardTitle>
                        {getNotificationBadge(notification.type)}
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
    </div>
  );
}