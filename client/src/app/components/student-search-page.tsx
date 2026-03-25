import { useState, useEffect, useCallback } from "react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Search, Phone, Mail, FileText, Clock, Eye, Loader2, UserPlus, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { toast } from "sonner";
import { adminApi } from "@/app/lib/api";
import { ROLES } from "@/app/utils/constants";

interface Student {
  id: string;
  userId: string;
  name: string;
  rollNo: string;
  email: string;
  phone: string;
  emergencyContact: string;
  department: string;
  cgpa: number;
  resumeUrl: string;
  inInterview: boolean;
  interviewWith?: string;
  interviewVenue?: string;
  queuedFor?: string;
}

interface StudentSearchPageProps {
  onStudentClick: (student: Student) => void;
  fetchApi: (query: string) => Promise<any>;
  allowAdd?: boolean;
}

export function StudentSearchPage({ onStudentClick, fetchApi, allowAdd = false }: StudentSearchPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    rollNumber: "",
    email: "",
    phone: "",
  });

  const normalizeStudent = (raw: any): Student => ({
    id: raw._id,
    userId: raw.userId,
    name: raw.name,
    rollNo: raw.rollNumber,
    email: raw.email ?? "",
    phone: raw.phone || raw.contact || "Not Available",
    emergencyContact: raw.emergencyContact?.phone ?? "",
    department: raw.branch ?? "Unknown",
    cgpa: raw.cgpa ?? 0,
    resumeUrl: raw.resume ?? raw.resumeUrl ?? "",
    inInterview: raw.inInterview ?? false,
    interviewWith: raw.interviewWith ?? undefined,
    interviewVenue: raw.interviewVenue ?? undefined,
    queuedFor: raw.queuedFor ?? undefined,
  });

  const fetchStudents = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const data: any = await fetchApi(q);
      const list = Array.isArray(data) ? data : data.students ?? [];
      setStudents(list.map(normalizeStudent));
      setHasSearched(true);
    } catch (err: any) {
      setError(err.message ?? "Failed to load students");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [fetchApi]);

  // Load all on mount
  useEffect(() => {
    fetchStudents("");
  }, [fetchStudents]);

  const handleSearch = () => fetchStudents(searchQuery);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  // Client-side filter for instant feedback while debouncing
  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[AddStudent] Form submitted, data:", formData);
    if (!formData.name || !formData.rollNumber || !formData.email || !formData.phone) {
      toast.error("Name, Roll Number, Email ID, and Phone Number are required");
      return;
    }
    if (!/^\d{10}$/.test(formData.phone)) {
      toast.error("Phone number must be exactly 10 digits");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        rollNumber: formData.rollNumber,
        email: formData.email,
        phone: formData.phone,
      };
      console.log("[AddStudent] Sending API request with payload:", payload);
      const res: any = await adminApi.addStudent(payload);
      console.log("[AddStudent] API response:", res);
      toast.success(`Student added! Login ID: ${res.credentials?.instituteId}, Password: ${res.credentials?.password}`);
      setIsAddModalOpen(false);
      setFormData({ name: "", rollNumber: "", email: "", phone: "" });
      const roll = res.credentials?.instituteId || formData.rollNumber;
      setSearchQuery(roll);
      fetchStudents(roll);
    } catch (err: any) {
      toast.error(err.message || "Failed to add student");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const uploadData = new FormData();
    uploadData.append("file", file);
    try {
      const res: any = await adminApi.uploadStudentExcel(uploadData);
      toast.success(res.message || "Students uploaded from Excel successfully");
      if (res.problemList?.length > 0) {
        toast.warning(`${res.problemList.length} row(s) had issues. Check console for details.`);
        console.warn("Student Excel errors:", res.problemList);
      }
      fetchStudents(searchQuery);
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    }
    event.target.value = "";
  };
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Student Search</h1>
          <p className="text-gray-500">Search and view student information</p>
        </div>
        {allowAdd && (
          <div className="flex gap-2">
            {/* Excel Upload for Students */}
            <div className="relative group">
              <input id="student-excel-upload" type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
              <Button
                variant="outline"
                className="flex items-center gap-2 border-gray-300"
                onClick={() => document.getElementById("student-excel-upload")?.click()}
              >
                <Upload className="h-4 w-4" /> Upload Students (Excel)
              </Button>
              <div className="absolute top-12 right-0 hidden group-hover:block bg-gray-900 text-white text-xs rounded p-2 z-10 w-64 shadow-lg">
                Excel must have exactly 4 columns in any order: <strong>Name, Roll Number, Email ID, Phone Number</strong>.
              </div>
            </div>

            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Student</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddStudent} className="space-y-4 pt-4">
                  <Input
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                  <Input
                    placeholder="Roll Number"
                    value={formData.rollNumber}
                    onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                    required
                  />
                  <Input
                    placeholder="Email ID"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                  <Input
                    placeholder="Phone Number (10 digits)"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    pattern="\d{10}"
                    title="Must be a valid 10-digit phone number"
                  />
                  <p className="text-xs text-gray-500">
                    A random secure password will be auto-generated and emailed to the student. They will be forced to reset it upon first login.
                  </p>
                  <Button type="submit" className="w-full bg-indigo-600" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Create Student Account
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            type="text"
            placeholder="Search by name, roll number, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-12 h-12 bg-white border-gray-300 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg"
          />
        </div>
        <Button
          className="bg-indigo-600 hover:bg-indigo-700 h-12 px-8 shadow-sm"
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-red-700 text-sm">{error}</CardContent>
        </Card>
      )}

      {/* Results */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500 flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading students…
            </CardContent>
          </Card>
        ) : filteredStudents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              {hasSearched
                ? "No students found matching your search."
                : "No students found in the database."}
            </CardContent>
          </Card>
        ) : (
          filteredStudents.map((student) => (
            <Card key={student.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-xl font-bold text-gray-900">{student.name}</CardTitle>
                      {student.inInterview ? (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full border border-yellow-300">
                          In Interview
                        </span>
                      ) : student.queuedFor ? (
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full border border-blue-300">
                          Queued
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full border border-green-300">
                          Available
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1.5 font-medium">Roll No: {student.rollNo}</p>
                  </div>

                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                    <Mail className="h-5 w-5 text-indigo-600" />
                    <div>
                      <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-0.5">Email</div>
                      <span className="text-sm text-gray-900 font-medium">{student.email}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                    <Phone className="h-5 w-5 text-indigo-600" />
                    <div>
                      <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-0.5">Phone</div>
                      <span className="text-sm text-gray-900 font-medium">{student.phone}</span>
                    </div>
                  </div>
                  <div className={`flex items-center gap-3 bg-red-50 p-3 rounded-lg ${student.inInterview || student.queuedFor ? "" : "md:col-span-2"}`}>
                    <Phone className="h-5 w-5 text-red-600" />
                    <div>
                      <div className="text-xs text-red-600 font-semibold uppercase tracking-wide mb-0.5">Emergency Contact</div>
                      <span className="text-sm text-gray-900 font-medium">{student.emergencyContact || "—"}</span>
                    </div>
                  </div>

                  {student.inInterview && (
                    <div className="flex items-center gap-3 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      <Clock className="h-5 w-5 text-yellow-700" />
                      <div>
                        <div className="text-xs text-yellow-700 font-semibold uppercase tracking-wide mb-0.5">Interview Status</div>
                        <span className="text-sm text-gray-900 font-medium">
                          Interviewing with {student.interviewWith} ({student.interviewVenue})
                        </span>
                      </div>
                    </div>
                  )}
                  {student.queuedFor && !student.inInterview && (
                    <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <Clock className="h-5 w-5 text-blue-700" />
                      <div>
                        <div className="text-xs text-blue-700 font-semibold uppercase tracking-wide mb-0.5">Queue Status</div>
                        <span className="text-sm text-gray-900 font-medium">
                          Waiting in queue for {student.queuedFor}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm w-full md:w-auto"
                  size="sm"
                  onClick={() => onStudentClick(student)}
                >
                  <Eye className="h-4 w-4" />
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}