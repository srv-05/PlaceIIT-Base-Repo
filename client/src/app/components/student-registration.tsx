import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/app/components/ui/input-otp";
import { GraduationCap, ArrowLeft, Mail, User, CheckCircle } from "lucide-react";

interface StudentRegistrationProps {
  onBack: () => void;
  onRegistrationComplete: () => void;
}

export function StudentRegistration({ onBack, onRegistrationComplete }: StudentRegistrationProps) {
  const [step, setStep] = useState<"details" | "otp" | "success">("details");
  const [rollNo, setRollNo] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState("");

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Generate mock OTP
    const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(mockOtp);
    
    // Simulate OTP sending
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log("Sending OTP to:", email, "OTP:", mockOtp);
    alert(`OTP sent! Your OTP is: ${mockOtp}\n(In production, this would be sent to your email)`);
    setStep("otp");
    setIsLoading(false);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate OTP verification
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log("Verifying OTP:", otp);
    
    // Verify OTP
    if (otp !== generatedOtp) {
      alert("Invalid OTP. Please try again.");
      setIsLoading(false);
      return;
    }
    
    // In a real app, this would verify the OTP and create the account
    console.log("Registration successful for:", { rollNo, name, email });
    setIsLoading(false);
    setStep("success");
    
    // Redirect to login after 2 seconds
    setTimeout(() => {
      onRegistrationComplete();
    }, 2000);
  };

  const handleResendOtp = async () => {
    // Generate new OTP
    const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(mockOtp);
    setOtp("");
    alert(`New OTP sent! Your OTP is: ${mockOtp}\n(In production, this would be sent to your email)`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-yellow-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <GraduationCap className="h-12 w-12 text-indigo-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">PlaceIIT</h1>
          </div>
          <p className="text-gray-600 text-lg">Student Registration</p>
        </div>

        {step === "details" ? (
          /* Registration Form */
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <div className="flex items-center mb-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Login
                </Button>
              </div>
              <CardTitle className="text-2xl">Create Student Account</CardTitle>
              <CardDescription>
                Register with your roll number and institutional email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rollNo" className="flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Roll Number
                  </Label>
                  <Input
                    id="rollNo"
                    placeholder="e.g., 2021CS101"
                    value={rollNo}
                    onChange={(e) => setRollNo(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Enter your official roll number
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Enter your full name
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    Institutional Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="e.g., student@iit.ac.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Use your college email address
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending OTP..." : "Send OTP"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : step === "otp" ? (
          /* OTP Verification */
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <div className="flex items-center mb-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("details")}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              </div>
              <CardTitle className="text-2xl">Verify OTP</CardTitle>
              <CardDescription>
                Enter the 6-digit code sent to {email}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-center block">
                    OTP Code
                  </Label>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={(value) => setOtp(value)}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button 
                    type="submit" 
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    disabled={isLoading || otp.length !== 6}
                  >
                    {isLoading ? "Verifying..." : "Verify & Register"}
                  </Button>
                  
                  <Button 
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={handleResendOtp}
                  >
                    Resend OTP
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          /* Success Message */
          <Card className="border-2 shadow-lg">
            <CardContent className="pt-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
              <p className="text-gray-600 mb-4">
                Welcome to PlaceIIT, <strong>{name}</strong>!
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="text-sm text-gray-700 space-y-1">
                  <p><strong>Roll Number:</strong> {rollNo}</p>
                  <p><strong>Email:</strong> {email}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500">Redirecting to login...</p>
            </CardContent>
          </Card>
        )}

        {/* Info Box */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm text-gray-700 text-center">
              <strong>Note:</strong> Registration is only available for enrolled students.
              Contact the placement office if you face any issues.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}