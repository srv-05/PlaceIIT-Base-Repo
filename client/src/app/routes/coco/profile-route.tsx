import { useAuth } from "@/app/auth-context";
import { CoCoProfilePage } from "@/app/components/coco/coco-profile-page";

export function CoCoProfileRoute() {
    const auth = useAuth();
    return <CoCoProfilePage userId={auth.userId} />;
}
