import { useState, useEffect, useCallback } from "react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Search, Phone, Mail, FileText, Clock, Eye, Loader2, UserPlus, Upload, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/app/components/ui/dialog";
import { Label } from "@/app/components/ui/label";
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    rollNumber: "",
    email: "",
    phone: "",
  });
  const [addMethod, setAddMethod] = useState<"manual" | "excel">("manual");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

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
  const handleAddStudent = async () => {
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
      const res: any = await adminApi.addStudent(payload);
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const selected = Array.from(event.target.files);
      setFiles((prev) => [...prev, ...selected]);
    }
    event.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    let errorCount = 0;
    try {
      for (const file of files) {
        const uploadData = new FormData();
        uploadData.append("file", file);
        const res: any = await adminApi.uploadStudentExcel(uploadData);
        if (res.problemList?.length > 0) {
          errorCount += res.problemList.length;
          console.warn(`Excel import errors in ${file.name}:`, res.problemList);
        }
      }

      toast.success("Students uploaded successfully");
      if (errorCount > 0) {
        toast.warning(`${errorCount} row(s) had issues across files. Check console.`);
      }

      setIsAddModalOpen(false);
      setFiles([]);
      fetchStudents(searchQuery);
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    try {
      setDeletingId(id);
      await adminApi.deleteStudent(id);
      setStudents((prev) => prev.filter((s) => s.id !== id));
      toast.success("Student deleted successfully");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete student");
    } finally {
      setDeletingId(null);
    }
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
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 flex items-center gap-2 h-11 shadow-sm">
                  <UserPlus className="h-4 w-4" />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Student</DialogTitle>
                  <DialogDescription>
                    Choose how you want to add students - manually or via Excel upload.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex gap-2 border-b border-gray-200 pt-4">
                  {(["manual", "excel"] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setAddMethod(method)}
                      className={`px-4 py-2 font-medium transition-colors border-b-2 ${addMethod === method
                        ? "border-indigo-600 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                      {method === "manual" ? "Manual Entry" : "Upload Excel"}
                    </button>
                  ))}
                </div>

                <div className="py-4">
                  {addMethod === "manual" ? (
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="s-name">Full Name *</Label>
                        <Input
                          id="s-name"
                          placeholder="Enter name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="s-roll">Roll Number *</Label>
                        <Input
                          id="s-roll"
                          placeholder="Enter roll number"
                          value={formData.rollNumber}
                          onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="s-email">Email ID *</Label>
                        <Input
                          id="s-email"
                          placeholder="Enter email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="s-phone">Phone Number *</Label>
                        <Input
                          id="s-phone"
                          placeholder="Enter 10-digit phone number"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                          minLength={10}
                          maxLength={10}
                          pattern="\d{10}"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-4">
                        A random secure password will be auto-generated and emailed to the student. They will be forced to reset it upon first login.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 pt-4">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors relative">
                        {uploading && (
                          <div className="absolute inset-0 bg-white/50 z-10 flex flex-col items-center justify-center rounded-lg">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
                            <span className="text-sm font-medium text-indigo-900">Uploading...</span>
                          </div>
                        )}
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="font-semibold text-gray-900 mb-2">Upload Excel File</h3>
                        <p className="text-sm text-gray-500 mb-4">Upload an Excel file (.xlsx, .xls) with student details</p>
                        <input id="student-excel-upload" type="file" multiple accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />
                        <Button type="button" variant="outline" onClick={() => document.getElementById("student-excel-upload")?.click()} disabled={uploading}>
                          <Upload className="h-4 w-4 mr-2" />
                          Choose Files
                        </Button>
                      </div>

                      {files.length > 0 && (
                        <div className="bg-white border rounded-lg p-4 space-y-2">
                          <h4 className="text-sm font-semibold text-gray-700">Selected Files:</h4>
                          {files.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm text-gray-600 border">
                              <span className="truncate">{file.name}</span>
                              <button
                                type="button"
                                onClick={() => removeFile(idx)}
                                className="text-red-500 hover:text-red-700 p-1"
                                disabled={uploading}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-900 mb-2 text-sm">Excel Format Requirements:</h4>
                        <p className="text-xs text-blue-800 mb-2">Columns must be in any order with these exact names:</p>
                        <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                          <li><strong>Name</strong> (required)</li>
                          <li><strong>Roll Number</strong> (required, unique)</li>
                          <li><strong>Email ID</strong> (required, unique)</li>
                          <li><strong>Phone Number</strong> (required, 10 digits)</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setIsAddModalOpen(false);
                    setFiles([]);
                  }} disabled={uploading}>Cancel</Button>
                  {addMethod === "manual" && (
                    <Button onClick={handleAddStudent} disabled={isSubmitting} className="bg-indigo-600">
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Create Student Account
                    </Button>
                  )}
                  {addMethod === "excel" && (
                    <Button onClick={handleConfirmUpload} disabled={files.length === 0 || uploading} className="bg-indigo-600">
                      {uploading ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Uploading...</>
                      ) : (
                        "Add Students"
                      )}
                    </Button>
                  )}
                </DialogFooter>
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
                  {allowAdd && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 -mt-1 -mr-1"
                      disabled={deletingId === student.id}
                      onClick={(e) => { e.stopPropagation(); handleDeleteStudent(student.id); }}
                    >
                      {deletingId === student.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  )}
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