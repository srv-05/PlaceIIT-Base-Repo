import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, RequireAuth } from "@/app/auth-context";

// Layouts
import { APCLayout } from "@/app/layouts/apc-layout";
import { StudentLayout } from "@/app/layouts/student-layout";
import { CoCoLayout } from "@/app/layouts/coco-layout";

// Login
import { LoginPageRoute } from "@/app/routes/login-route";

// APC route pages
import { APCHomeRoute } from "@/app/routes/apc/home-route";
import { APCStudentsRoute } from "@/app/routes/apc/students-route";
import { APCStudentDetailsRoute } from "@/app/routes/apc/student-details-route";
import { APCCoCosRoute } from "@/app/routes/apc/cocos-route";
import { APCCoCoScheduleRoute } from "@/app/routes/apc/coco-schedule-route";
import { APCCompaniesRoute } from "@/app/routes/apc/companies-route";
import { APCCompanyDetailsRoute } from "@/app/routes/apc/company-details-route";
import { APCProfileRoute } from "@/app/routes/apc/profile-route";

// Student route pages
import { StudentHomeRoute } from "@/app/routes/student/home-route";
import { StudentCompaniesRoute } from "@/app/routes/student/companies-route";
import { StudentProfileRoute } from "@/app/routes/student/profile-route";
import { StudentNotificationsRoute } from "@/app/routes/student/notifications-route";
import { StudentContactRoute } from "@/app/routes/student/contact-route";

// CoCo route pages
import { CoCoHomeRoute } from "@/app/routes/coco/home-route";
import { CoCoCompaniesRoute } from "@/app/routes/coco/companies-route";
import { CoCoStudentsRoute } from "@/app/routes/coco/students-route";
import { CoCoRoundTrackingRoute } from "@/app/routes/coco/round-tracking-route";
import { CoCoProfileRoute } from "@/app/routes/coco/profile-route";
import { CoCoNotificationsRoute } from "@/app/routes/coco/notifications-route";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Login */}
          <Route path="/" element={<LoginPageRoute />} />

          {/* APC Portal */}
          <Route
            path="/apc"
            element={
              <RequireAuth allowedRole="apc">
                <APCLayout />
              </RequireAuth>
            }
          >
            <Route index element={<APCHomeRoute />} />
            <Route path="students" element={<APCStudentsRoute />} />
            <Route path="students/:id" element={<APCStudentDetailsRoute />} />
            <Route path="cocos" element={<APCCoCosRoute />} /> your phone number and emergency contacts to improve visibility.
            <Route path="cocos/:id/schedule" element={<APCCoCoScheduleRoute />} />
            <Route path="companies" element={<APCCompaniesRoute />} />
            <Route path="companies/:id" element={<APCCompanyDetailsRoute />} />
            <Route path="profile" element={<APCProfileRoute />} />
          </Route>

          {/* Student Portal */}
          <Route
            path="/student"
            element={
              <RequireAuth allowedRole="student">
                <StudentLayout />
              </RequireAuth>
            }
          >
            <Route index element={<StudentHomeRoute />} />
            <Route path="companies" element={<StudentCompaniesRoute />} />
            <Route path="profile" element={<StudentProfileRoute />} />
            <Route path="notifications" element={<StudentNotificationsRoute />} />
            <Route path="contact" element={<StudentContactRoute />} />
          </Route>

          {/* CoCo Portal */}
          <Route
            path="/coco"
            element={
              <RequireAuth allowedRole="coco">
                <CoCoLayout />
              </RequireAuth>
            }
          >
            <Route index element={<CoCoHomeRoute />} />
            <Route path="companies" element={<CoCoCompaniesRoute />} />
            <Route path="students" element={<CoCoStudentsRoute />} />
            <Route path="round-tracking" element={<CoCoRoundTrackingRoute />} />
            <Route path="profile" element={<CoCoProfileRoute />} />
            <Route path="notifications" element={<CoCoNotificationsRoute />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;