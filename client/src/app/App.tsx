import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, RequireAuth, useAuth } from "@/app/auth-context";
import { SocketProvider } from "@/app/socket-context";
import { Toaster } from "@/app/components/ui/sonner";

// Layouts
import { APCLayout } from "@/app/layouts/apc-layout";
import { StudentLayout } from "@/app/layouts/student-layout";
import { CoCoLayout } from "@/app/layouts/coco-layout";

// Login
import { LoginPageRoute } from "@/app/routes/login-route";
import { ChangePasswordRoute } from "@/app/routes/change-password-route";

// APC route pages
import { APCHomeRoute } from "@/app/routes/apc/home-route";
import { APCStudentsRoute } from "@/app/routes/apc/students-route";
import { APCStudentDetailsRoute } from "@/app/routes/apc/student-details-route";
import { APCCoCosRoute } from "@/app/routes/apc/cocos-route";
import { APCCoCoScheduleRoute } from "@/app/routes/apc/coco-schedule-route";
import { APCCompaniesRoute } from "@/app/routes/apc/companies-route";
import { APCCompanyDetailsRoute } from "@/app/routes/apc/company-details-route";
import { APCProfileRoute } from "@/app/routes/apc/profile-route";
import { APCApcsRoute } from "@/app/routes/apc/apcs-route";
import { APCQueriesRoute } from "@/app/routes/apc/queries-route";

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
import { CoCoStudentDetailsRoute } from "@/app/routes/coco/student-details-route";
import { CoCoRoundTrackingRoute } from "@/app/routes/coco/round-tracking-route";
import { CoCoProfileRoute } from "@/app/routes/coco/profile-route";
import { CoCoNotificationsRoute } from "@/app/routes/coco/notifications-route";

function AppRoutes() {
  const { userId } = useAuth();
  return (
    <SocketProvider userId={userId}>
      <BrowserRouter>
        <Routes>
          {/* Login */}
          <Route path="/" element={<LoginPageRoute />} />
          <Route path="/change-password" element={
            <RequireAuth>
              <ChangePasswordRoute />
            </RequireAuth>
          } />

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
            <Route path="cocos" element={<APCCoCosRoute />} />
            <Route path="cocos/:id/schedule" element={<APCCoCoScheduleRoute />} />
            <Route path="companies" element={<APCCompaniesRoute />} />
            <Route path="companies/:id" element={<APCCompanyDetailsRoute />} />
            <Route path="profile" element={<APCProfileRoute />} />
            <Route path="apcs" element={<APCApcsRoute />} />
            <Route path="queries" element={<APCQueriesRoute />} />
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
            <Route path="students/:id" element={<CoCoStudentDetailsRoute />} />
            <Route path="round-tracking" element={<CoCoRoundTrackingRoute />} />
            <Route path="profile" element={<CoCoProfileRoute />} />
            <Route path="notifications" element={<CoCoNotificationsRoute />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <Toaster richColors position="top-right" />
    </AuthProvider>
  );
}

export default App;