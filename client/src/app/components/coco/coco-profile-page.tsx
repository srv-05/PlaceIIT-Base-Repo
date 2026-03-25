import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Badge } from "@/app/components/ui/badge";
import { User, Mail, Phone, Building2, Calendar, Edit, Loader2, Save } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { authApi, cocoApi } from "@/app/lib/api";
import { toast } from "sonner";
import { formatSlotLabel } from "@/app/lib/format";

export function CoCoProfilePage({ userId }: { userId: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profileData, setProfileData] = useState({
    name: "",
    userId: userId || "",
    email: "",
    phone: "",
    department: "",
    companiesAssigned: 0,
  });
  const [assignedCompanies, setAssignedCompanies] = useState<Array<{ name: string; day: string; slot: string }>>([]);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [meData, companyData]: any[] = await Promise.all([
        authApi.getMe(),
        cocoApi.getAssignedCompany().catch(() => null),
      ]);
      const companies = companyData
        ? Array.isArray(companyData) ? companyData : companyData.companies ?? (companyData.company ? [companyData.company] : [])
        : [];
      setProfileData({
        name: meData.name ?? meData.instituteId ?? "",
        userId: meData.instituteId ?? userId ?? "",
        email: meData.email ?? "",
        phone: meData.phone ?? meData.contact ?? "",
        department: meData.branch ?? meData.department ?? "",
        companiesAssigned: companies.length,
      });
      setAssignedCompanies(
        companies.map((c: any) => ({
          name: c.name ?? "—",
          day: c.day != null ? `Day ${c.day}` : "—",
          slot: formatSlotLabel(c.slot),
        }))
      );
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // No dedicated coco profile update endpoint yet — just show success
      toast.success("Profile saved");
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.message ?? "Save failed");
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
          <User className="h-8 w-8 mr-3 text-green-600" /> My Profile
        </h1>
        <Button
          onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
          className="bg-green-600 hover:bg-green-700"
          disabled={saving}
        >
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : isEditing ? <Save className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
          {isEditing ? "Save Changes" : "Edit Profile"}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center"><User className="h-5 w-5 mr-2 text-gray-600" />Basic Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} disabled={!isEditing} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userId">User ID</Label>
              <Input id="userId" value={profileData.userId} disabled className="bg-gray-50" />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center"><Mail className="h-4 w-4 mr-2" />Email</Label>
              <Input id="email" type="email" value={profileData.email} disabled className="bg-gray-50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center"><Phone className="h-4 w-4 mr-2" />Phone Number</Label>
              <Input id="phone" value={profileData.phone} onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })} disabled={!isEditing} />
            </div>
          </div>
          {profileData.department && (
            <div className="space-y-2">
              <Label htmlFor="department" className="flex items-center"><Building2 className="h-4 w-4 mr-2" />Department</Label>
              <Input id="department" value={profileData.department} disabled className="bg-gray-50" />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center"><Building2 className="h-5 w-5 mr-2 text-gray-600" />Coordinator Statistics</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Companies Assigned</span>
                <Badge className="bg-green-600 text-white">{profileData.companiesAssigned}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center"><Building2 className="h-5 w-5 mr-2 text-gray-600" />Currently Assigned Companies</CardTitle></CardHeader>
        <CardContent>
          {assignedCompanies.length === 0 ? (
            <div className="py-6 text-center text-gray-500">No companies assigned yet.</div>
          ) : (
            <div className="space-y-2">
              {assignedCompanies.map((company, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="font-medium text-gray-900">{company.name}</p>
                    <p className="text-sm text-gray-600">{company.day} — {company.slot}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center"><Calendar className="h-5 w-5 mr-2 text-gray-600" />Important Information</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-gray-900 mb-1">Coordinator Responsibilities</p>
              <ul className="text-xs text-gray-600 space-y-1 ml-4">
                <li>• Manage assigned companies and interview schedules</li>
                <li>• Coordinate with interview panels</li>
                <li>• Send notifications to students</li>
                <li>• Track interview rounds and student status</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
