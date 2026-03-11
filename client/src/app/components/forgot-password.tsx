import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { ArrowLeft, Mail, Lock, CheckCircle } from "lucide-react";

type UserRole = "student" | "coco" | "apc";

interface ForgotPasswordProps {
  role: UserRole;
  onBack: () => void;
}

export function ForgotPassword({ role, onBack }: ForgotPasswordProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [identifier, setIdentifier] = useState(""); // email or roll number
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!identifier) {
      setError("Please enter your identifier");
      return;
    }

    // Generate mock OTP
    const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(mockOtp);
    
    // In a real app, send OTP to email/phone
    console.log(`OTP sent to ${identifier}: ${mockOtp}`);
    alert(`Mock OTP sent! Your OTP is: ${mockOtp}\n(In production, this would be sent to your email/phone)`);
    
    setStep(2);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (otp !== generatedOtp) {
      setError("Invalid OTP. Please try again.");
      return;
    }

    setStep(3);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // In a real app, update password in backend
    console.log(`Password reset successful for ${identifier}`);
    setSuccess(true);

    // Redirect back to login after 2 seconds
    setTimeout(() => {
      onBack();
    }, 2000);
  };

  const handleResendOtp = () => {
    const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(mockOtp);
    setOtp("");
    setError("");
    alert(`New OTP sent! Your OTP is: ${mockOtp}\n(In production, this would be sent to your email/phone)`);
  };

  const getRoleTitle = () => {
    switch (role) {
      case "student": return "Student";
      case "coco": return "CoCo";
      case "apc": return "APC";
    }
  };

  const getIdentifierLabel = () => {
    return role === "student" ? "Roll Number" : "Email Address";
  };

  const getIdentifierPlaceholder = () => {
    return role === "student" ? "e.g., 2021CS101" : "your.email@example.com";
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-yellow-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-2 shadow-lg">
          <CardContent className="pt-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Reset Successful!</h2>
            <p className="text-gray-600 mb-4">
              Your password has been successfully updated.
            </p>
            <p className="text-sm text-gray-500">Redirecting to login...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-yellow-50 flex items-center justify-center p-6">
      <Card className="max-w-md w-full border-2 shadow-lg">
        <CardHeader>
          <div className="flex items-center mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </div>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            {step === 1 && `Enter your ${getIdentifierLabel().toLowerCase()} to receive an OTP`}
            {step === 2 && "Enter the OTP sent to your registered contact"}
            {step === 3 && "Create a new password for your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 1: Enter Identifier */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">{getIdentifierLabel()}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="identifier"
                    type={role === "student" ? "text" : "email"}
                    placeholder={getIdentifierPlaceholder()}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">
                Send OTP
              </Button>
            </form>
          )}

          {/* Step 2: Verify OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Enter OTP</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  required
                />
                <p className="text-xs text-gray-500">
                  OTP sent to {identifier}
                </p>
              </div>
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">
                Verify OTP
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleResendOtp}
              >
                Resend OTP
              </Button>
            </form>
          )}

          {/* Step 3: Reset Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">
                Reset Password
              </Button>
            </form>
          )}

          {/* Progress Indicator */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <div className={`flex flex-col items-center ${step >= 1 ? 'text-indigo-600' : 'text-gray-400'}`}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  1
                </div>
                <span className="text-xs mt-1">Verify ID</span>
              </div>
              <div className={`flex-1 h-1 mx-2 ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
              <div className={`flex flex-col items-center ${step >= 2 ? 'text-indigo-600' : 'text-gray-400'}`}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  2
                </div>
                <span className="text-xs mt-1">OTP</span>
              </div>
              <div className={`flex-1 h-1 mx-2 ${step >= 3 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
              <div className={`flex flex-col items-center ${step >= 3 ? 'text-indigo-600' : 'text-gray-400'}`}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= 3 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  3
                </div>
                <span className="text-xs mt-1">Reset</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
