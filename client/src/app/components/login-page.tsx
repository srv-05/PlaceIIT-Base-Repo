import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { GraduationCap, UserCog, ShieldCheck, CheckCircle, X, AlertCircle, Loader2 } from "lucide-react";
import { ForgotPassword } from "@/app/components/forgot-password";
import { StudentRegistration } from "@/app/components/student-registration";

type UserRole = "student" | "coco" | "apc";

interface LoginPageProps {
  onLogin: (role: UserRole, userId: string, userName: string, password?: string) => void;
  error?: string | null;
  loading?: boolean;
}

export function LoginPage({ onLogin, error, loading }: LoginPageProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showStudentRegistration, setShowStudentRegistration] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !userId) return;

    const userName = selectedRole === "apc" ? "Admin" : userId;
    onLogin(selectedRole, userId, userName, password);
  };

  const roleCards = [
    {
      role: "student" as UserRole,
      title: "Student",
      description: "Access your companies, interviews & queue status",
      icon: GraduationCap,
      color: "bg-blue-50 hover:bg-blue-100 border-blue-200"
    },
    {
      role: "coco" as UserRole,
      title: "CoCo / Coordinator",
      description: "Manage companies, panels & student interviews",
      icon: UserCog,
      color: "bg-green-50 hover:bg-green-100 border-green-200"
    },
    {
      role: "apc" as UserRole,
      title: "APC / Admin",
      description: "Overall system management & coordination",
      icon: ShieldCheck,
      color: "bg-purple-50 hover:bg-purple-100 border-purple-200"
    }
  ];

  // Show forgot password screen if requested
  if (showForgotPassword && selectedRole) {
    return (
      <ForgotPassword
        role={selectedRole}
        onBack={() => {
          setShowForgotPassword(false);
        }}
      />
    );
  }

  // Show student registration screen if requested
  if (showStudentRegistration) {
    return (
      <StudentRegistration
        onBack={() => {
          setShowStudentRegistration(false);
        }}
        onRegistrationComplete={() => {
          setShowStudentRegistration(false);
          setSelectedRole(null);
          setUserId("");
          setPassword("");
          setRegistrationSuccess(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-yellow-50 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-4">
            <GraduationCap className="h-12 w-12 text-indigo-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">PlaceIIT</h1>
          </div>
          <p className="text-gray-600 text-lg">Campus Placement Management System</p>
        </div>

        {/* Registration Success Alert */}
        {registrationSuccess && (
          <Alert className="max-w-md mx-auto mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="ml-2 flex items-center justify-between">
              <span className="text-green-800">
                Registration successful! You can now login with your credentials.
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => setRegistrationSuccess(false)}
              >
                <X className="h-4 w-4 text-green-800" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!selectedRole ? (
          /* Role Selection */
          <div>
            <h2 className="text-2xl font-semibold text-center text-gray-900 mb-6">
              Select Your Role
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {roleCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Card
                    key={card.role}
                    className={`cursor-pointer transition-all border-2 ${card.color}`}
                    onClick={() => setSelectedRole(card.role)}
                  >
                    <CardHeader className="text-center">
                      <div className="flex justify-center mb-3">
                        <Icon className="h-12 w-12 text-gray-700" />
                      </div>
                      <CardTitle>{card.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {card.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                      <Button variant="outline" className="w-full">
                        Login as {card.title}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          /* Login Form */
          <Card className="max-w-md mx-auto border-2 shadow-lg">
            <CardHeader>
              <div className="flex items-center mb-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedRole(null);
                    setUserId("");
                    setPassword("");
                  }}
                >
                  ← Back
                </Button>
              </div>
              <CardTitle className="text-2xl">
                {selectedRole === "student" && "Student Login"}
                {selectedRole === "coco" && "CoCo Login"}
                {selectedRole === "apc" && "APC Login"}
              </CardTitle>
              <CardDescription>
                Enter your credentials to access the portal
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Error Alert */}
              {error && (
                <Alert className="mb-4 bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="ml-2 text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="userId">
                    {selectedRole === "student" ? "Roll Number" : "User ID"}
                  </Label>
                  <Input
                    id="userId"
                    placeholder={
                      selectedRole === "student"
                        ? "e.g., 2021CS101"
                        : "Enter your ID"
                    }
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Login"
                  )}
                </Button>
                <div className="text-center mt-2">
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Forgot Password?
                  </Button>
                </div>
                {selectedRole === "student" && (
                  <div className="text-center mt-2">
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setShowStudentRegistration(true)}
                    >
                      Register as a Student
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}