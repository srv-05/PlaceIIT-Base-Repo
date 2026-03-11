import { useAuth } from "@/app/auth-context";
import { StudentProfilePage } from "@/app/components/student/student-profile-page";

export function StudentProfileRoute() {
    const auth = useAuth();
    return <StudentProfilePage rollNo={auth.userId} />;
}
