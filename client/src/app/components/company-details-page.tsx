import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  UserCog, 
  Users,
  Search,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  Clock3,
  Edit3
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

interface Student {
  id: string;
  rollNumber: string;
  name: string;
  email: string;
  phone: string;
  branch: string;
  cgpa: number;
  status: "Pending" | "Selected" | "Rejected";
}

interface CompanyDetailsPageProps {
  companyId: string;
  companyName: string;
  cocoAssigned: string;
  venue: string;
  day: string;
  slot: string;
  shortlistedCount: number;
  onBack: () => void;
}

export function CompanyDetailsPage({
  companyId,
  companyName,
  cocoAssigned,
  venue,
  day,
  slot,
  shortlistedCount,
  onBack
}: CompanyDetailsPageProps) {
  // Mock data for shortlisted students
  const [students, setStudents] = useState<Student[]>([
    {
      id: "1",
      rollNumber: "21CS001",
      name: "Aarav Sharma",
      email: "aarav.sharma@student.iit.ac.in",
      phone: "+91 98765 43210",
      branch: "Computer Science",
      cgpa: 8.9,
      status: "Pending"
    },
    {
      id: "2",
      rollNumber: "21CS015",
      name: "Priya Patel",
      email: "priya.patel@student.iit.ac.in",
      phone: "+91 98765 43211",
      branch: "Computer Science",
      cgpa: 9.1,
      status: "Selected"
    },
    {
      id: "3",
      rollNumber: "21EC023",
      name: "Vikram Singh",
      email: "vikram.singh@student.iit.ac.in",
      phone: "+91 98765 43212",
      branch: "Electronics",
      cgpa: 8.7,
      status: "Pending"
    },
    {
      id: "4",
      rollNumber: "21ME042",
      name: "Ananya Reddy",
      email: "ananya.reddy@student.iit.ac.in",
      phone: "+91 98765 43213",
      branch: "Mechanical",
      cgpa: 8.8,
      status: "Rejected"
    },
    {
      id: "5",
      rollNumber: "21CS089",
      name: "Rohan Kumar",
      email: "rohan.kumar@student.iit.ac.in",
      phone: "+91 98765 43214",
      branch: "Computer Science",
      cgpa: 9.3,
      status: "Selected"
    }
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterBranch, setFilterBranch] = useState("all");

  // Editable fields
  const [editableVenue, setEditableVenue] = useState(venue);
  const [editableCoCo, setEditableCoCo] = useState(cocoAssigned);

  // Mock CoCo list
  const availableCocos = ["Arjun Mehta", "Kavya Singh", "Rohan Gupta", "Not Assigned"];

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || student.status === filterStatus;
    const matchesBranch = filterBranch === "all" || student.branch === filterBranch;
    return matchesSearch && matchesStatus && matchesBranch;
  });

  const statusCounts = {
    pending: students.filter(s => s.status === "Pending").length,
    selected: students.filter(s => s.status === "Selected").length,
    rejected: students.filter(s => s.status === "Rejected").length,
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
          <h1 className="text-3xl font-bold text-gray-800">{companyName}</h1>
          <p className="text-gray-500">Company details and shortlisted students</p>
        </div>
      </div>

      {/* Company Details Card */}
      <Card className="border-2 border-indigo-100">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900">Company Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="flex items-start gap-3 bg-indigo-50 p-4 rounded-lg">
              <Calendar className="h-5 w-5 text-indigo-600 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Day</div>
                <div className="font-semibold text-gray-900">{day}</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3 bg-indigo-50 p-4 rounded-lg">
              <Clock className="h-5 w-5 text-indigo-600 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Slot</div>
                <div className="font-semibold text-gray-900">{slot}</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3 bg-indigo-50 p-4 rounded-lg">
              <UserCog className="h-5 w-5 text-indigo-600 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">CoCo Assigned</div>
                <div className="font-semibold text-gray-900">{editableCoCo}</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3 bg-indigo-50 p-4 rounded-lg">
              <MapPin className="h-5 w-5 text-indigo-600 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Venue</div>
                <div className="font-semibold text-gray-900">{editableVenue}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Assignment Section */}
      <Card className="border-2 border-yellow-100 bg-yellow-50/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-yellow-600" />
            <CardTitle className="text-xl font-bold text-gray-900">Edit Assignment</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Change CoCo</label>
              <Select value={editableCoCo} onValueChange={setEditableCoCo}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select CoCo" />
                </SelectTrigger>
                <SelectContent>
                  {availableCocos.map((coco) => (
                    <SelectItem key={coco} value={coco}>
                      {coco}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Assign or reassign a coordinator to this company
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Change Venue</label>
              <Input
                value={editableVenue}
                onChange={(e) => setEditableVenue(e.target.value)}
                className="bg-white"
                placeholder="Enter venue"
              />
              <p className="text-xs text-gray-500 mt-1">
                Update the interview venue location
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Students</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{students.length}</p>
              </div>
              <Users className="h-8 w-8 text-indigo-600" />
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
                  placeholder="Search students..."
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
              <Select value={filterBranch} onValueChange={setFilterBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  <SelectItem value="Computer Science">Computer Science</SelectItem>
                  <SelectItem value="Electronics">Electronics</SelectItem>
                  <SelectItem value="Mechanical">Mechanical</SelectItem>
                  <SelectItem value="Civil">Civil</SelectItem>
                  <SelectItem value="Electrical">Electrical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shortlisted Students List */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Shortlisted Students ({filteredStudents.length})</h2>
        <div className="space-y-3">
          {filteredStudents.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No students found matching your filters.
              </CardContent>
            </Card>
          ) : (
            filteredStudents.map((student) => (
              <Card key={student.id} className="hover:shadow-lg transition-shadow duration-200">
                <CardContent className="py-5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 grid md:grid-cols-6 gap-4 items-center">
                      <div className="md:col-span-2">
                        <div className="font-semibold text-gray-900 text-lg">{student.name}</div>
                        <div className="text-sm text-gray-500 mt-0.5">{student.rollNumber}</div>
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="h-3.5 w-3.5" />
                          <span>{student.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{student.phone}</span>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Branch</div>
                        <div className="text-sm font-semibold text-gray-900 mt-1">{student.branch}</div>
                      </div>
                      
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">CGPA</div>
                        <div className="text-sm font-semibold text-gray-900 mt-1">{student.cgpa}</div>
                      </div>
                      
                      <div className="flex justify-end">
                        {getStatusBadge(student.status)}
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