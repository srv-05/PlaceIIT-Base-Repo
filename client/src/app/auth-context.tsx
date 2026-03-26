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
    isMainAdmin: boolean;
    login: (instituteId: string, password: string, role?: UserRole) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    /** Whether the user is required to change their password */
    userMustChangePassword: boolean;
    setUserMustChangePassword: (val: boolean) => void;
    /** legacy mock login for testing without server */
    mockLogin: (role: UserRole, id: string, name: string) => void;
    // Notification counts (shared state)
    unreadNotificationsCount: number;
    setUnreadNotificationsCount: (n: number) => void;
    cocoUnreadNotificationsCount: number;
    setCocoUnreadNotificationsCount: (n: number) => void;
    apcUnreadNotificationsCount: number;
    setApcUnreadNotificationsCount: (n: number) => void;
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
    const [userMustChangePassword, setUserMustChangePassword] = useState(false);
    const [isMainAdmin, setIsMainAdmin] = useState(false);
    const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
    const [cocoUnreadNotificationsCount, setCocoUnreadNotificationsCount] = useState(0);
    const [apcUnreadNotificationsCount, setApcUnreadNotificationsCount] = useState(0);
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
                    setUserMustChangePassword(!!user.mustChangePassword);
                    setIsMainAdmin(!!user.isMainAdmin);
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

    const login = async (instituteId: string, password: string, requestedRole?: UserRole) => {
        try {
            const serverRole = requestedRole ? clientRoleToServer(requestedRole) : undefined;
            const res = await authApi.login(instituteId, password, serverRole);
            setToken(res.token);
            setTokenState(res.token);
            const role = serverRoleToClient(res.user.role);
            setUserRole(role);
            setUserId(res.user.id);
            setUserName(res.user.instituteId);
            setUserMustChangePassword(!!res.user.mustChangePassword);
            setIsMainAdmin(!!res.user.isMainAdmin);
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
        setUserMustChangePassword(false);
        setIsMainAdmin(false);
        setUnreadNotificationsCount(0);
        setCocoUnreadNotificationsCount(0);
        setApcUnreadNotificationsCount(0);
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
                isMainAdmin,
                login,
                logout,
                userMustChangePassword,
                setUserMustChangePassword,
                mockLogin,
                unreadNotificationsCount,
                setUnreadNotificationsCount,
                cocoUnreadNotificationsCount,
                setCocoUnreadNotificationsCount,
                apcUnreadNotificationsCount,
                setApcUnreadNotificationsCount,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function RequireAuth({ children, allowedRole }: { children: ReactNode; allowedRole?: UserRole }) {
    const { isLoggedIn, userRole, userMustChangePassword } = useAuth();
    const location = useLocation();

    if (!isLoggedIn) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    if (userMustChangePassword && location.pathname !== "/change-password") {
        return <Navigate to="/change-password" replace />;
    }

    if (allowedRole && userRole !== allowedRole) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}
