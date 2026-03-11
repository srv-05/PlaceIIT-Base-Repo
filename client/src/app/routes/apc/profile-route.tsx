import { useAuth } from "@/app/auth-context";
import { APCProfilePage } from "@/app/components/apc-profile-page";

export function APCProfileRoute() {
    const auth = useAuth();
    return <APCProfilePage userName={auth.userName} userId={auth.userId} />;
}
