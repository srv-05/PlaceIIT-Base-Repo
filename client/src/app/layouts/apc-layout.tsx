import { Outlet, useNavigate } from "react-router-dom";
import { APCNavbar } from "@/app/components/apc-navbar";
import { useAuth } from "@/app/auth-context";
import { useSocket } from "@/app/socket-context";
import { useEffect, useCallback } from "react";
import { adminApi } from "@/app/lib/api";

export function APCLayout() {
    const navigate = useNavigate();
    const auth = useAuth();
    const { socket } = useSocket();

    // Fetch unread notification count on mount
    const fetchUnreadCount = useCallback(async () => {
        try {
            const data: any = await adminApi.getNotifications();
            const list = Array.isArray(data) ? data : data.notifications ?? [];
            const unread = list.filter((n: any) => !n.isRead && !n.read).length;
            auth.setApcUnreadNotificationsCount(unread);
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
                navigate("/apc");
                break;
            case "student-search":
                navigate("/apc/students");
                break;
            case "manage-cocos":
                navigate("/apc/cocos");
                break;
            case "manage-companies":
                navigate("/apc/companies");
                break;
            case "manage-apcs":
                navigate("/apc/apcs");
                break;
            case "queries":
                navigate("/apc/queries");
                break;
            case "profile":
                navigate("/apc/profile");
                break;
            case "logout":
                auth.logout();
                navigate("/");
                break;
            default:
                navigate("/apc");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <APCNavbar onNavigate={handleNavigate} userName={auth.userName} isMainAdmin={auth.isMainAdmin} unreadNotifications={auth.apcUnreadNotificationsCount} />
            <main className="container mx-auto px-8 py-10">
                <Outlet />
            </main>
        </div>
    );
}

