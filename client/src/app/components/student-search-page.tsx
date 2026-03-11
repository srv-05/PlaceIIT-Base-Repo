import { useState, useEffect, useCallback } from "react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Search, Phone, Mail, FileText, Clock, Eye, Loader2 } from "lucide-react";
import { adminApi } from "@/app/lib/api";

interface Student {
  id: string;
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
}

interface StudentSearchPageProps {
  onStudentClick: (student: Student) => void;
}

export function StudentSearchPage({ onStudentClick }: StudentSearchPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const normalizeStudent = (raw: any): Student => ({
    id: raw._id ?? raw.id ?? "",
    name: raw.name ?? "—",
    rollNo: raw.rollNumber ?? raw.rollNo ?? "—",
    email: raw.email ?? raw.user?.email ?? "—",
    phone: raw.contact ?? raw.phone ?? "—",
    emergencyContact: raw.emergencyContact?.phone ?? raw.emergencyContact ?? "—",
    department: raw.branch ?? raw.department ?? "—",
    cgpa: raw.cgpa ?? 0,
    resumeUrl: raw.resume ?? raw.resumeUrl ?? "",
    inInterview: raw.inInterview ?? false,
    interviewWith: raw.interviewWith ?? undefined,
    interviewVenue: raw.interviewVenue ?? undefined,
  });

  const fetchStudents = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const data: any = await adminApi.searchStudents(q);
      const list = Array.isArray(data) ? data : data.students ?? [];
      setStudents(list.map(normalizeStudent));
      setHasSearched(true);
    } catch (err: any) {
      setError(err.message ?? "Failed to load students");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, []);

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Student Search</h1>
        <p className="text-gray-500">Search and view student information</p>
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
                      ) : (
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full border border-green-300">
                          Available
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1.5 font-medium">Roll No: {student.rollNo}</p>
                  </div>
                  <div className="text-right bg-gray-50 px-4 py-2 rounded-lg">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{student.department}</div>
                    <div className="text-lg font-bold text-indigo-600 mt-1">CGPA: {student.cgpa}</div>
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
                      <span className="text-sm text-gray-900 font-medium">{student.phone || "—"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-red-50 p-3 rounded-lg md:col-span-2">
                    <Phone className="h-5 w-5 text-red-600" />
                    <div>
                      <div className="text-xs text-red-600 font-semibold uppercase tracking-wide mb-0.5">Emergency Contact</div>
                      <span className="text-sm text-gray-900 font-medium">{student.emergencyContact || "—"}</span>
                    </div>
                  </div>
                  {student.resumeUrl && (
                    <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                      <FileText className="h-5 w-5 text-indigo-600" />
                      <div>
                        <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-0.5">Resume</div>
                        <a
                          href={student.resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-indigo-600 font-medium hover:underline"
                        >
                          View Resume
                        </a>
                      </div>
                    </div>
                  )}
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