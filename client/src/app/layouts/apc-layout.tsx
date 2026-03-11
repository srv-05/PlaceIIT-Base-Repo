import { Outlet, useNavigate } from "react-router-dom";
import { APCNavbar } from "@/app/components/apc-navbar";
import { useAuth } from "@/app/auth-context";

export function APCLayout() {
    const navigate = useNavigate();
    const auth = useAuth();

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
            <APCNavbar onNavigate={handleNavigate} userName={auth.userName} />
            <main className="container mx-auto px-8 py-10">
                <Outlet />
            </main>
        </div>
    );
}
