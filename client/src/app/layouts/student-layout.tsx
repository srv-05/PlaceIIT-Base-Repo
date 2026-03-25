import { Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { StudentNavbar } from "@/app/components/student/student-navbar";
import { useAuth } from "@/app/auth-context";
import { useSocket } from "@/app/socket-context";
import { studentApi } from "@/app/lib/api";

export function StudentLayout() {
    const navigate = useNavigate();
    const auth = useAuth();
    const { socket } = useSocket();

    // Fetch initial unread notification count
    const fetchUnreadCount = () => {
        studentApi.getNotifications()
            .then((data: any) => {
                const list = Array.isArray(data) ? data : data.notifications ?? [];
                const unread = list.filter((n: any) => !n.isRead && !n.read).length;
                auth.setUnreadNotificationsCount(unread);
            })
            .catch(() => {});
    };

    useEffect(() => {
        fetchUnreadCount();
    }, []);

    // Listen for new notifications in real-time
    useEffect(() => {
        if (!socket) return;
        const handleNewNotif = () => fetchUnreadCount();
        socket.on("notification:sent", handleNewNotif);
        return () => { socket.off("notification:sent", handleNewNotif); };
    }, [socket]);

    const handleNavigate = (page: string) => {
        switch (page) {
            case "home":
                navigate("/student");
                break;
            case "my-companies":
                navigate("/student/companies");
                break;
            case "profile":
                navigate("/student/profile");
                break;
            case "notifications":
                navigate("/student/notifications");
                break;
            case "contact":
                navigate("/student/contact");
                break;
            case "logout":
                auth.logout();
                navigate("/");
                break;
            default:
                navigate("/student");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <StudentNavbar
                onNavigate={handleNavigate}
                userName={auth.userName}
                unreadNotifications={auth.unreadNotificationsCount}
            />
            <main className="container mx-auto px-8 py-10">
                <Outlet />
            </main>
        </div>
    );
}
