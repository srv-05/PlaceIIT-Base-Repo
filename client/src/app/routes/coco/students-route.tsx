import { StudentSearchPage } from "@/app/components/student-search-page";

export function CoCoStudentsRoute() {
    const handleStudentClick = (student: any) => {
        console.log("Student clicked in CoCo portal:", student);
    };

    return <StudentSearchPage onStudentClick={handleStudentClick} />;
}
