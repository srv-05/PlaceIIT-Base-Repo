import { Outlet, useNavigate } from "react-router-dom";
import { CoCoNavbar } from "@/app/components/coco/coco-navbar";
import { useAuth } from "@/app/auth-context";
import { useSocket } from "@/app/socket-context";
import { useEffect, useCallback } from "react";
import { cocoApi } from "@/app/lib/api";

export function CoCoLayout() {
    const navigate = useNavigate();
    const auth = useAuth();
    const { socket } = useSocket();

    // Fetch unread notification count on mount
    const fetchUnreadCount = useCallback(async () => {
        try {
            const data: any = await cocoApi.getNotifications();
            // Server may return an array directly or { notifications: [...] }
            const list = Array.isArray(data) ? data : data.notifications ?? [];
            // Check for isRead or read (some older models might use read)
            const unread = list.filter((n: any) => !n.isRead && !n.read).length;
            auth.setCocoUnreadNotificationsCount(unread);
        } catch {
            // silently fail
        }
    }, [auth]);

    useEffect(() => {
        fetchUnreadCount();
    }, [fetchUnreadCount]);

    // Listen for new notifications in real-time
    useEffect(() => {
        if (!socket) return;
        const handleNewNotif = () => {
            fetchUnreadCount();
        };
        socket.on("notification:sent", handleNewNotif);
        return () => { socket.off("notification:sent", handleNewNotif); };
    }, [socket, fetchUnreadCount]);

    const handleNavigate = (page: string) => {
        switch (page) {
            case "home":
                navigate("/coco");
                break;
            case "my-companies":
                navigate("/coco/companies");
                break;
            case "student-search":
                navigate("/coco/students");
                break;
            case "profile":
                navigate("/coco/profile");
                break;
            case "round-tracking":
                navigate("/coco/round-tracking");
                break;
            case "notifications":
                auth.setCocoUnreadNotificationsCount(0);
                navigate("/coco/notifications");
                break;
            case "logout":
                auth.logout();
                navigate("/");
                break;
            default:
                navigate("/coco");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <CoCoNavbar
                onNavigate={handleNavigate}
                userName={auth.userName}
                unreadNotifications={auth.cocoUnreadNotificationsCount}
            />
            <main className="container mx-auto px-8 py-10">
                <Outlet />
            </main>
        </div>
    );
}
