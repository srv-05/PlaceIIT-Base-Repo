import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { authApi, setToken, clearToken, getToken } from "@/app/lib/api";

type UserRole = "student" | "coco" | "apc";

/** Server uses "admin" but frontend calls it "apc" */
function serverRoleToClient(role: string): UserRole {
    if (role === "admin") return "apc";
    return role as UserRole;
}

function clientRoleToServer(role: UserRole): string {
    if (role === "apc") return "admin";
    return role;
}

interface AuthState {
    isLoggedIn: boolean;
    userRole: UserRole | null;
    userId: string;
    userName: string;
    token: string | null;
    login: (instituteId: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    /** legacy mock login for testing without server */
    mockLogin: (role: UserRole, id: string, name: string) => void;
    // Notification counts (shared state)
    unreadNotificationsCount: number;
    setUnreadNotificationsCount: (n: number) => void;
    cocoUnreadNotificationsCount: number;
    setCocoUnreadNotificationsCount: (n: number) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [userId, setUserId] = useState("");
    const [userName, setUserName] = useState("");
    const [token, setTokenState] = useState<string | null>(null);
    const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
    const [cocoUnreadNotificationsCount, setCocoUnreadNotificationsCount] = useState(0);
    const [loading, setLoading] = useState(true);

    // Restore session from localStorage on mount
    useEffect(() => {
        const stored = getToken();
        if (stored) {
            authApi
                .getMe()
                .then((user) => {
                    setTokenState(stored);
                    setUserRole(serverRoleToClient(user.role));
                    setUserId(user._id);
                    setUserName(user.instituteId);
                    setIsLoggedIn(true);
                })
                .catch(() => {
                    clearToken();
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (instituteId: string, password: string) => {
        try {
            const res = await authApi.login(instituteId, password);
            setToken(res.token);
            setTokenState(res.token);
            const role = serverRoleToClient(res.user.role);
            setUserRole(role);
            setUserId(res.user.id);
            setUserName(res.user.instituteId);
            setIsLoggedIn(true);
            return { success: true };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Login failed";
            return { success: false, error: message };
        }
    };

    /** Mock login (keeps app working without server) */
    const mockLogin = (role: UserRole, id: string, name: string) => {
        setUserRole(role);
        setUserId(id);
        setUserName(name);
        setIsLoggedIn(true);
    };

    const logout = () => {
        clearToken();
        setTokenState(null);
        setIsLoggedIn(false);
        setUserRole(null);
        setUserId("");
        setUserName("");
        setUnreadNotificationsCount(0);
        setCocoUnreadNotificationsCount(0);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
        );
    }

    return (
        <AuthContext.Provider
            value={{
                isLoggedIn,
                userRole,
                userId,
                userName,
                token,
                login,
                logout,
                mockLogin,
                unreadNotificationsCount,
                setUnreadNotificationsCount,
                cocoUnreadNotificationsCount,
                setCocoUnreadNotificationsCount,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function RequireAuth({ children, allowedRole }: { children: ReactNode; allowedRole?: UserRole }) {
    const { isLoggedIn, userRole } = useAuth();
    const location = useLocation();

    if (!isLoggedIn) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    if (allowedRole && userRole !== allowedRole) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}
