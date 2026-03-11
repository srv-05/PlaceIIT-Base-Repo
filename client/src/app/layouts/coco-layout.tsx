import { Outlet, useNavigate } from "react-router-dom";
import { CoCoNavbar } from "@/app/components/coco/coco-navbar";
import { useAuth } from "@/app/auth-context";

export function CoCoLayout() {
    const navigate = useNavigate();
    const auth = useAuth();

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
