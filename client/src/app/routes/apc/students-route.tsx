import { useNavigate } from "react-router-dom";
import { StudentSearchPage } from "@/app/components/student-search-page";
import { adminApi } from "@/app/lib/api";

export function APCStudentsRoute() {
    const navigate = useNavigate();

    const handleStudentClick = (student: any) => {
        navigate(`/apc/students/${student.id}`, { state: { student } });
    };

    return <StudentSearchPage onStudentClick={handleStudentClick} fetchApi={adminApi.searchStudents} allowAdd={true} />;
}
