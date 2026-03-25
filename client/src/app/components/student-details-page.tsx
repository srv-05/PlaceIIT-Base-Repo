import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  ArrowLeft,
  Mail,
  Phone,
  FileText,
  GraduationCap,
  Building2,
  Calendar,
  Clock,
  MapPin,
  Search,
  CheckCircle2,
  XCircle,
  Clock3
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { formatSlotLabel } from "@/app/lib/format";
interface Company {
  id: string;
  name: string;
  day: string;
  slot: string;
  venue: string;
  status: "Pending" | "Selected" | "Rejected";
  interviewDate: string;
}

interface StudentDetailsPageProps {
  studentId: string;
  studentName: string;
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
  fetchCompanies: () => Promise<any>;
  onBack: () => void;
}

export function StudentDetailsPage({
  studentId,
  studentName,
  rollNo,
  email,
  phone,
  emergencyContact,
  department,
  cgpa,
  resumeUrl,
  inInterview,
  interviewWith,
  interviewVenue,
  queuedFor,
  fetchCompanies,
  onBack
}: StudentDetailsPageProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchCompanies();
        setCompanies(Array.isArray(data) ? data : data.companies || []);
      } catch (err: any) {
        toast.error("Failed to load student's companies: " + (err.message || "Unknown error"));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [fetchCompanies]);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDay, setFilterDay] = useState("all");

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || company.status === filterStatus;
    const matchesDay = filterDay === "all" || company.day === filterDay;
    return matchesSearch && matchesStatus && matchesDay;
  });

  const statusCounts = {
    pending: companies.filter(c => c.status === "Pending").length,
    selected: companies.filter(c => c.status === "Selected").length,
    rejected: companies.filter(c => c.status === "Rejected").length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Selected":
        return (
          <div className="flex items-center gap-1.5 text-green-700 bg-green-50 px-3 py-1.5 rounded-full text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            Selected
          </div>
        );
      case "Rejected":
        return (
          <div className="flex items-center gap-1.5 text-red-700 bg-red-50 px-3 py-1.5 rounded-full text-sm font-semibold">
            <XCircle className="h-4 w-4" />
            Rejected
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 text-yellow-700 bg-yellow-50 px-3 py-1.5 rounded-full text-sm font-semibold">
            <Clock3 className="h-4 w-4" />
            Pending
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24 text-gray-500 gap-2">
        <Loader2 className="h-6 w-6 animate-spin" /> Loading student details...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{studentName}</h1>
          <p className="text-gray-500">Student profile and shortlisted companies</p>
        </div>
      </div>

      {/* Student Information Card */}
      <Card className="border-2 border-indigo-100">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-xl font-bold text-gray-900">Student Information</CardTitle>
            {inInterview ? (
              <span className="px-3 py-1.5 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full border border-yellow-300">
                In Interview
              </span>
            ) : (
              <span className="px-3 py-1.5 bg-green-100 text-green-800 text-sm font-semibold rounded-full border border-green-300">
                Available
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3 bg-indigo-50 p-4 rounded-lg">
              <GraduationCap className="h-5 w-5 text-indigo-600 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Roll Number</div>
                <div className="font-semibold text-gray-900">{rollNo}</div>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-indigo-50 p-4 rounded-lg">
              <Building2 className="h-5 w-5 text-indigo-600 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Department</div>
                <div className="font-semibold text-gray-900">{department}</div>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-indigo-50 p-4 rounded-lg">
              <GraduationCap className="h-5 w-5 text-indigo-600 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">CGPA</div>
                <div className="font-semibold text-gray-900">{cgpa}</div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg">
              <Mail className="h-5 w-5 text-indigo-600 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Email</div>
                <div className="font-medium text-gray-900 break-all">{email}</div>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg">
              <Phone className="h-5 w-5 text-indigo-600 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Phone</div>
                <div className="font-medium text-gray-900">{phone}</div>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-red-50 p-4 rounded-lg">
              <Phone className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Emergency Contact</div>
                <div className="font-medium text-gray-900">{emergencyContact}</div>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg">
              <FileText className="h-5 w-5 text-indigo-600 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Resume</div>
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-indigo-600 hover:text-indigo-700 underline"
                >
                  View Resume
                </a>
              </div>
            </div>
          </div>

          {inInterview && interviewWith && (
            <div className="flex items-start gap-3 bg-yellow-50 p-4 rounded-lg border border-yellow-200 mt-6">
              <Clock className="h-5 w-5 text-yellow-700 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-1">Current Interview</div>
                <div className="font-medium text-gray-900">
                  Interviewing with {interviewWith} at {interviewVenue}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Companies</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{companies.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{statusCounts.pending}</p>
              </div>
              <Clock3 className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Selected</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{statusCounts.selected}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Rejected</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{statusCounts.rejected}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search companies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Selected">Selected</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={filterDay} onValueChange={setFilterDay}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by day" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Days</SelectItem>
                  <SelectItem value="Monday">Monday</SelectItem>
                  <SelectItem value="Tuesday">Tuesday</SelectItem>
                  <SelectItem value="Wednesday">Wednesday</SelectItem>
                  <SelectItem value="Thursday">Thursday</SelectItem>
                  <SelectItem value="Friday">Friday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shortlisted Companies List */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Shortlisted Companies ({filteredCompanies.length})</h2>
        <div className="space-y-3">
          {filteredCompanies.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No companies found matching your filters.
              </CardContent>
            </Card>
          ) : (
            filteredCompanies.map((company) => (
              <Card key={company.id} className="hover:shadow-lg transition-shadow duration-200">
                <CardContent className="py-5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 grid md:grid-cols-5 gap-4 items-center">
                      <div className="md:col-span-1">
                        <div className="font-semibold text-gray-900 text-lg">{company.name}</div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <div>
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Day</div>
                          <div className="font-medium text-gray-900">{company.day}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <div>
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Slot</div>
                          <div className="font-medium text-gray-900">{formatSlotLabel(company.slot)}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <div>
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Venue</div>
                          <div className="font-medium text-gray-900">{company.venue}</div>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        {getStatusBadge(company.status)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}