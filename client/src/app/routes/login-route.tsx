import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth-context";
import { LoginPage } from "@/app/components/login-page";

type UserRole = "student" | "coco" | "apc";

export function LoginPageRoute() {
    const navigate = useNavigate();
    const auth = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (role: UserRole, id: string, _name: string, password?: string) => {
        setError(null);
        setLoading(true);

        try {
            // Try real API login first
            if (password) {
                const result = await auth.login(id, password);
                if (result.success) {
                    navigateToPortal(auth.userRole || role);
                    return;
                }
                // If server is unreachable, fall back to mock
                if (result.error && !result.error.includes("Failed to fetch")) {
                    setError(result.error);
                    setLoading(false);
                    return;
                }
            }

            // Fallback: mock login (when no server running)
            const userName = role === "apc" ? "Admin" : id;
            auth.mockLogin(role, id, userName);
            navigateToPortal(role);
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const navigateToPortal = (role: UserRole) => {
        switch (role) {
            case "apc":
                navigate("/apc");
                break;
            case "student":
                navigate("/student");
                break;
            case "coco":
                navigate("/coco");
                break;
        }
    };

    // If already logged in, redirect to the correct portal
    if (auth.isLoggedIn && auth.userRole) {
        navigateToPortal(auth.userRole);
    }

    return <LoginPage onLogin={handleLogin} error={error} loading={loading} />;
}
