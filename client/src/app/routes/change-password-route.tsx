import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { authApi } from "@/app/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/app/auth-context";

export function ChangePasswordRoute() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [friendContactName, setFriendContactName] = useState("");
  const [friendContactPhone, setFriendContactPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
    if (emojiRegex.test(newPassword)) {
      toast.error("Password cannot contain emojis.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (!emergencyContactName.trim() || !emergencyContactPhone.trim()) {
      toast.error("Emergency contact fields are required.");
      return;
    }
    const trimmedECN = emergencyContactName.trim();
    if (!trimmedECN) {
      toast.error("Emergency contact name cannot be just spaces.");
      return;
    }
    if (!/^[A-Za-z\s]+$/.test(trimmedECN)) {
      toast.error("Emergency contact name can only contain letters and spaces.");
      return;
    }
    if (!/^\d{10}$/.test(emergencyContactPhone.trim())) {
      toast.error("Emergency contact phone number must be exactly 10 digits.");
      return;
    }
    if (friendContactName.trim()) {
      const trimmedFCN = friendContactName.trim();
      if (!/^[A-Za-z\s]+$/.test(trimmedFCN)) {
        toast.error("Friend contact name can only contain letters and spaces.");
        return;
      }
    }
    if (friendContactPhone.trim() && !/^\d{10}$/.test(friendContactPhone.trim())) {
      toast.error("Friend contact phone number must be exactly 10 digits.");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.changePassword(newPassword, undefined, {
        emergencyContact: {
          name: emergencyContactName.trim(),
          phone: emergencyContactPhone.trim(),
        },
        friendContact: friendContactName.trim() && friendContactPhone.trim() ? {
          name: friendContactName.trim(),
          phone: friendContactPhone.trim(),
        } : undefined as any,
      });
      // Update local storage / context if necessary, or just force them to log in again
      if (res.user) {
        // Optionally update the context here, but simplest is to redirect to portal
        // We successfully changed it. Let's redirect them based on their role
        toast.success("Password changed successfully!");
        const role = res.user.role || auth.userRole;
        if (role === 'apc') navigate("/apc");
        else if (role === 'coco') navigate("/coco");
        else navigate("/student");

        // Also tell the auth context they changed it
        auth.setUserMustChangePassword?.(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Action Required
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          For security reasons, you must change your temporary password before accessing the portal.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="bg-indigo-600 text-white pb-6 pt-8 px-8">
            <CardTitle className="text-2xl font-bold">Change Password</CardTitle>
            <CardDescription className="text-indigo-100 mt-2">
              Please enter a new, secure password and complete your required contact details.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 py-8 bg-white">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency-contact-name">Emergency Contact Name</Label>
                <Input
                  id="emergency-contact-name"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  placeholder="Emergency contact name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency-contact-phone">Emergency Contact Phone</Label>
                <Input
                  id="emergency-contact-phone"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit phone number"
                  inputMode="numeric"
                  maxLength={10}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="friend-contact-name">Friend Contact Name</Label>
                <Input
                  id="friend-contact-name"
                  value={friendContactName}
                  onChange={(e) => setFriendContactName(e.target.value)}
                  placeholder="Friend contact name"

                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="friend-contact-phone">Friend Contact Phone</Label>
                <Input
                  id="friend-contact-phone"
                  value={friendContactPhone}
                  onChange={(e) => setFriendContactPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit phone number"
                  inputMode="numeric"
                  maxLength={10}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 text-base shadow-md"
                disabled={loading}
              >
                {loading ? "Changing Password..." : "Update Password & Continue"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
