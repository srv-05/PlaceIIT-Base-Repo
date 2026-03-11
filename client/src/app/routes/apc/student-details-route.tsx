import { useNavigate, useLocation } from "react-router-dom";
import { StudentDetailsPage } from "@/app/components/student-details-page";
import { Navigate } from "react-router-dom";

export function APCStudentDetailsRoute() {
    const navigate = useNavigate();
    const location = useLocation();
    const student = location.state?.student;

    if (!student) {
        return <Navigate to="/apc/students" replace />;
    }

    return (
        <StudentDetailsPage
            studentId={student.id}
            studentName={student.name}
            rollNo={student.rollNo}
            email={student.email}
            phone={student.phone}
            emergencyContact={student.emergencyContact}
            department={student.department}
            cgpa={student.cgpa}
            resumeUrl={student.resumeUrl}
            inInterview={student.inInterview}
            interviewWith={student.interviewWith}
            interviewVenue={student.interviewVenue}
            onBack={() => navigate("/apc/students")}
        />
    );
}
