import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Badge } from "@/app/components/ui/badge";
import { User, Mail, Phone, GraduationCap, FileText, Award, Edit, Loader2, Save, Upload } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { studentApi } from "@/app/lib/api";
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
  department: string;
  cgpa: string;
  resumeUrl: string;
}

const EMPTY_PROFILE: ProfileData = {
  name: "", rollNo: "", email: "", phone: "",
  emergencyContactName: "", emergencyContactPhone: "",
  friendContactName: "", friendContactPhone: "",
  department: "", cgpa: "", resumeUrl: "",
};

export function StudentProfilePage({ rollNo }: { rollNo: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>(EMPTY_PROFILE);

  const normalizeProfile = (raw: any): ProfileData => ({
    name: raw.name ?? "",
    rollNo: raw.rollNumber ?? raw.rollNo ?? rollNo ?? "2021CS101",
    email: raw.email ?? raw.user?.email ?? "",
    phone: raw.contact ?? raw.phone ?? "",
    emergencyContactName: raw.emergencyContact?.name ?? "",
    emergencyContactPhone: raw.emergencyContact?.phone ?? "",
    friendContactName: raw.friendContact?.name ?? "",
    friendContactPhone: raw.friendContact?.phone ?? "",
    department: raw.branch ?? raw.department ?? "",
    cgpa: raw.cgpa?.toString() ?? "8.5",
    resumeUrl: raw.resume ?? raw.resumeUrl ?? "",
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

      {/* Academic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><GraduationCap className="h-5 w-5 mr-2 text-gray-600" />Academic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">Department / Branch</Label>
              <Input id="department" value={profileData.department} disabled className="bg-gray-50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cgpa">CGPA</Label>
              <Input id="cgpa" value={profileData.cgpa} disabled className="bg-gray-50" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resume */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><FileText className="h-5 w-5 mr-2 text-gray-600" />Resume</CardTitle>
        </CardHeader>
        <CardContent>
          {profileData.resumeUrl ? (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-indigo-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900 truncate max-w-xs">{profileData.resumeUrl.split("/").pop()}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => window.open(profileData.resumeUrl, "_blank")}>View</Button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center text-gray-500">
              No resume uploaded yet.
            </div>
          )}
          {isEditing && (
            <div className="mt-4">
              <Label htmlFor="resume-upload" className="flex items-center mb-2">
                <Upload className="h-4 w-4 mr-2" /> Upload Resume (PDF only)
              </Label>
              <input
                id="resume-upload"
                type="file"
                accept="application/pdf"
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                disabled={uploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.type !== "application/pdf") { toast.error("Only PDF files are allowed"); return; }
                  setUploading(true);
                  try {
                    const res: any = await studentApi.uploadResume(file);
                    setProfileData((prev) => ({ ...prev, resumeUrl: res.resumePath ?? res.resume ?? prev.resumeUrl }));
                    toast.success("Resume uploaded successfully!");
                  } catch (err: any) {
                    toast.error(err.message ?? "Failed to upload resume");
                  } finally {
                    setUploading(false);
                  }
                }}
              />
              {uploading && <p className="text-sm text-gray-400 mt-1 flex items-center"><Loader2 className="h-3 w-3 animate-spin mr-1" /> Uploading…</p>}
            </div>
          )}
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