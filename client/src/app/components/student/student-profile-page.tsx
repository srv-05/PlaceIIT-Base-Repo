import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Badge } from "@/app/components/ui/badge";
import { User, Mail, Phone, GraduationCap, FileText, Award, Edit, Loader2, Save, Upload, Lock } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { studentApi, authApi } from "@/app/lib/api";
import { toast } from "sonner";

interface ProfileData {
  name: string;
  rollNo: string;
  email: string;
  phone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  friendContactName: string;
  friendContactPhone: string;
}

const EMPTY_PROFILE: ProfileData = {
  name: "", rollNo: "", email: "", phone: "",
  emergencyContactName: "", emergencyContactPhone: "",
  friendContactName: "", friendContactPhone: "",
};

export function StudentProfilePage({ rollNo }: { rollNo: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>(EMPTY_PROFILE);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const normalizeProfile = (raw: any): ProfileData => ({
    name: raw.name ?? "",
    rollNo: raw.rollNumber ?? raw.rollNo ?? rollNo ?? "2021CS101",
    email: raw.email ?? raw.userId?.email ?? raw.user?.email ?? "",
    phone: raw.contact ?? raw.phone ?? "",
    emergencyContactName: raw.emergencyContact?.name ?? "",
    emergencyContactPhone: raw.emergencyContact?.phone ?? "",
    friendContactName: raw.friendContact?.name ?? "",
    friendContactPhone: raw.friendContact?.phone ?? "",
  });

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data: any = await studentApi.getProfile();
      setProfileData(normalizeProfile(data.student ?? data));
    } catch (err: any) {
      toast.error("Failed to load profile: " + (err.message ?? ""));
    } finally {
      setLoading(false);
    }
  }, [rollNo]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const set = (key: keyof ProfileData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setProfileData((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await studentApi.updateProfile({
        name: profileData.name,
        contact: profileData.phone,
        email: profileData.email,
        emergencyContact: {
          name: profileData.emergencyContactName,
          phone: profileData.emergencyContactPhone,
        },
        friendContact: {
          name: profileData.friendContactName,
          phone: profileData.friendContactPhone,
        },
      });
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 gap-2">
        <Loader2 className="h-6 w-6 animate-spin" /> Loading profile…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <User className="h-8 w-8 mr-3 text-indigo-600" /> My Profile
        </h1>
        <Button
          onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
          className="bg-indigo-600 hover:bg-indigo-700"
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : isEditing ? (
            <Save className="h-4 w-4 mr-2" />
          ) : (
            <Edit className="h-4 w-4 mr-2" />
          )}
          {isEditing ? "Save Changes" : "Edit Profile"}
        </Button>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><User className="h-5 w-5 mr-2 text-gray-600" />Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={profileData.name} onChange={set("name")} disabled={!isEditing} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rollNo">Roll Number</Label>
              <Input id="rollNo" value={profileData.rollNo} disabled className="bg-gray-50" />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center"><Mail className="h-4 w-4 mr-2" />Email</Label>
              <Input id="email" type="email" value={profileData.email} onChange={set("email")} disabled={!isEditing} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center"><Phone className="h-4 w-4 mr-2" />Phone Number</Label>
              <Input id="phone" value={profileData.phone} onChange={set("phone")} disabled={!isEditing} />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center"><Phone className="h-4 w-4 mr-2 text-red-500" />Emergency Contact Name</Label>
              <Input value={profileData.emergencyContactName} onChange={set("emergencyContactName")} disabled={!isEditing} placeholder="Contact name" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center"><Phone className="h-4 w-4 mr-2 text-red-500" />Emergency Contact Phone</Label>
              <Input value={profileData.emergencyContactPhone} onChange={set("emergencyContactPhone")} disabled={!isEditing} placeholder="Phone number" />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center"><Phone className="h-4 w-4 mr-2 text-blue-500" />Friend Contact Name</Label>
              <Input value={profileData.friendContactName} onChange={set("friendContactName")} disabled={!isEditing} placeholder="Friend name" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center"><Phone className="h-4 w-4 mr-2 text-blue-500" />Friend Contact Phone</Label>
              <Input value={profileData.friendContactPhone} onChange={set("friendContactPhone")} disabled={!isEditing} placeholder="Phone number" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Lock className="h-5 w-5 mr-2 text-gray-600" />Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
              onClick={async () => {
                if (newPassword !== confirmPassword) { toast.error("New passwords do not match"); return; }
                if (newPassword === currentPassword) { toast.error("New password must be different from your current password"); return; }
                if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
                setChangingPassword(true);
                try {
                  await authApi.changePassword(newPassword, currentPassword);
                  toast.success("Password changed successfully!");
                  setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
                } catch (err: any) {
                  toast.error(err.message ?? "Failed to change password");
                } finally {
                  setChangingPassword(false);
                }
              }}
            >
              {changingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Password
            </Button>
          </div>
        </CardContent>
      </Card>


      {/* Profile completion badge */}
      {!profileData.phone && !profileData.emergencyContactPhone && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4 flex items-center gap-3">
            <Award className="h-5 w-5 text-amber-600" />
            <p className="text-amber-800 text-sm font-medium">
              Complete your profile by adding your phone number and emergency contacts to improve visibility.
            </p>
            {!isEditing && (
              <Button size="sm" variant="outline" className="ml-auto border-amber-600 text-amber-700" onClick={() => setIsEditing(true)}>
                Complete Now
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}