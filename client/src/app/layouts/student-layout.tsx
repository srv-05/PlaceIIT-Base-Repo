import { Outlet, useNavigate } from "react-router-dom";
import { StudentNavbar } from "@/app/components/student/student-navbar";
import { useAuth } from "@/app/auth-context";

export function StudentLayout() {
    const navigate = useNavigate();
    const auth = useAuth();

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
                auth.setUnreadNotificationsCount(0);
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
