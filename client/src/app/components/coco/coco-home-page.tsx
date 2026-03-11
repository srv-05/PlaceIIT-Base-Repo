import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/app/components/ui/dialog";
import {
  Building2, Users, UserPlus, Search, Phone, Mail, AlertCircle, CheckCircle,
  Send, RotateCw, Clock, CircleDot, MapPin, XCircle, UserCheck, Loader2,
} from "lucide-react";
import { cocoApi } from "@/app/lib/api";
import { toast } from "sonner";

interface Student {
  id: string;
  name: string;
  rollNo: string;
  contact: string;
  emergencyContact: string;
  status: "in-queue" | "in-interview" | "completed";
  round: number;
  locationStatus: "in-queue" | "in-interview" | "no-show" | "completed-day";
  currentCompany?: string;
}

interface Panel {
  id: string;
  name: string;
  members: string[];
  room: string;
  currentRound: number;
  currentStudent?: { name: string; rollNo: string };
}

interface CoCoHomePageProps {
  companyName: string;
  onRoundTracking: () => void;
}

export function CoCoHomePage({ companyName, onRoundTracking }: CoCoHomePageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRound, setSelectedRound] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
  const [isWalkinActive, setIsWalkinActive] = useState(false);
  const [loading, setLoading] = useState(true);

  const [company, setCompany] = useState({
    id: "",
    name: companyName || "—",
    logo: "",
    role: "",
    venue: "—",
    currentRound: 1,
    totalRounds: 1,
  });

  const [students, setStudents] = useState<Student[]>([]);
  const [panels, setPanels] = useState<Panel[]>([]);

  // Panel form
  const [panelName, setPanelName] = useState("");
  const [panelRoom, setPanelRoom] = useState("");
  const [panelMembers, setPanelMembers] = useState("");

  const normalizeStudent = (raw: any, i: number): Student => {
    const qe = raw.queueEntry ?? raw;
    const statusRaw: string = qe.status ?? "in-queue";
    const statusMap: Record<string, Student["status"]> = {
      in_queue: "in-queue", waiting: "in-queue", "in-queue": "in-queue",
      in_interview: "in-interview", interviewing: "in-interview", "in-interview": "in-interview",
      completed: "completed", done: "completed",
    };
    return {
      id: raw._id ?? raw.id ?? raw.student?._id ?? String(i),
      name: raw.name ?? raw.student?.name ?? "—",
      rollNo: raw.rollNumber ?? raw.student?.rollNumber ?? "—",
      contact: raw.contact ?? raw.student?.contact ?? "—",
      emergencyContact: raw.emergencyContact?.phone ?? raw.student?.emergencyContact?.phone ?? "—",
      status: statusMap[statusRaw] ?? "in-queue",
      round: raw.round ?? raw.currentRound ?? 1,
      locationStatus: (statusMap[statusRaw] ?? "in-queue") as Student["locationStatus"],
      currentCompany: raw.companyName ?? companyName,
    };
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const companyRes: any = await cocoApi.getAssignedCompany();
      const companyObj = Array.isArray(companyRes)
        ? companyRes.find((c: any) => (c.name ?? "").toLowerCase() === companyName.toLowerCase()) ?? companyRes[0]
        : companyRes.company ?? companyRes;

      if (companyObj) {
        const cid = companyObj._id ?? companyObj.id ?? "";
        setCompany({
          id: cid,
          name: companyObj.name ?? companyName,
          logo: companyObj.logo ?? "",
          role: companyObj.role ?? "",
          venue: companyObj.venue ?? "TBA",
          currentRound: companyObj.currentRound ?? 1,
          totalRounds: companyObj.totalRounds ?? 1,
        });
        setIsWalkinActive(!!companyObj.walkInOpen);

        // Fetch students
        if (cid) {
          const studentsData: any = await cocoApi.getShortlistedStudents(cid).catch(() => []);
          const sList = Array.isArray(studentsData) ? studentsData : studentsData.students ?? [];
          setStudents(sList.map(normalizeStudent));
        }
      }
    } catch {
      toast.error("Failed to load company data");
    } finally {
      setLoading(false);
    }
  }, [companyName]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.rollNo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRound = selectedRound === "all" || student.round === parseInt(selectedRound);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "yet-to-interview" && student.status === "in-queue") ||
      statusFilter === student.status;
    return matchesSearch && matchesRound && matchesStatus;
  });

  const handleUpdateStatus = async (studentId: string, newStatus: Student["status"]) => {
    // Optimistic
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status: newStatus, locationStatus: newStatus as any } : s))
    );
    try {
      await cocoApi.updateStudentStatus({ queueId: studentId, status: newStatus });
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleSendNotification = async (studentId: string, type: string) => {
    try {
      const msg = type === "come"
        ? `Please proceed to ${company.venue} for your ${company.name} interview.`
        : `Update regarding your ${company.name} interview.`;
      await cocoApi.sendNotification({ studentId, message: msg });
      toast.success("Notification sent!");
    } catch {
      toast.error("Failed to send notification");
    }
  };

  const handleToggleWalkin = async () => {
    const newState = !isWalkinActive;
    setIsWalkinActive(newState);
    try {
      if (company.id) {
        await cocoApi.toggleWalkIn(company.id, { walkInOpen: newState });
      }
      toast.success(newState ? "Walk-in activated" : "Walk-in deactivated");
    } catch {
      setIsWalkinActive(!newState);
      toast.error("Failed to toggle walk-in");
    }
  };

  const handleAddPanel = async () => {
    if (!panelName || !panelRoom) return;
    try {
      await cocoApi.addPanel({
        companyId: company.id,
        name: panelName,
        room: panelRoom,
        members: panelMembers.split(",").map((m) => m.trim()).filter(Boolean),
      });
      toast.success("Panel added!");
      setPanelName("");
      setPanelRoom("");
      setPanelMembers("");
      setIsAddPanelOpen(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add panel");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in-queue":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><AlertCircle className="h-3 w-3 mr-1" />In Queue</Badge>;
      case "in-interview":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><RotateCw className="h-3 w-3 mr-1" />In Interview</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      default: return null;
    }
  };

  const getLocationBadge = (locationStatus: Student["locationStatus"], currentCompany?: string) => {
    switch (locationStatus) {
      case "in-queue":
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center"><MapPin className="h-4 w-4 text-blue-600 mr-2" /><span className="text-sm font-medium text-blue-900">Waiting in {currentCompany}&apos;s queue</span></div>
          </div>
        );
      case "in-interview":
        return (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="flex items-center"><CircleDot className="h-4 w-4 text-purple-600 mr-2 animate-pulse" /><span className="text-sm font-medium text-purple-900">Getting interviewed at {currentCompany}</span></div>
          </div>
        );
      case "no-show":
        return (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center"><XCircle className="h-4 w-4 text-red-600 mr-2" /><span className="text-sm font-medium text-red-900">Did not appear</span></div>
          </div>
        );
      case "completed-day":
        return (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center"><UserCheck className="h-4 w-4 text-green-600 mr-2" /><span className="text-sm font-medium text-green-900">Completed all interviews for the day</span></div>
          </div>
        );
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 gap-2">
        <Loader2 className="h-6 w-6 animate-spin" /> Loading company data…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Company Header */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="h-16 w-16 rounded-lg bg-white flex items-center justify-center shadow-md">
                {company.logo ? (
                  <img src={company.logo} alt={company.name} className="h-12 w-12 object-contain"
                    onError={(e) => { e.currentTarget.style.display = "none"; }} />
                ) : (
                  <span className="text-2xl font-bold text-gray-700">{company.name.charAt(0)}</span>
                )}
              </div>
              <div>
                <CardTitle className="text-2xl text-gray-900 mb-2">{company.name}</CardTitle>
                {company.role && <p className="text-gray-700 mb-1">{company.role}</p>}
                <p className="text-sm text-gray-600">{company.venue}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onRoundTracking} className="border-green-600 text-green-600 hover:bg-green-50">
                <RotateCw className="h-4 w-4 mr-2" /> Round Tracking
              </Button>
              <Button
                variant={isWalkinActive ? "default" : "outline"}
                onClick={handleToggleWalkin}
                className={isWalkinActive ? "bg-green-600 hover:bg-green-700" : "border-green-600 text-green-600 hover:bg-green-50"}
              >
                <Building2 className="h-4 w-4 mr-2" />
                {isWalkinActive ? "Walk-in Active" : "Activate Walk-in"}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Panels */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center"><Users className="h-5 w-5 mr-2 text-green-600" />Interview Panels</CardTitle>
            <Dialog open={isAddPanelOpen} onOpenChange={setIsAddPanelOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700"><UserPlus className="h-4 w-4 mr-2" />Add Panel</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Panel</DialogTitle>
                  <DialogDescription>Create a new interview panel for {company.name}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input placeholder="Panel Name" value={panelName} onChange={(e) => setPanelName(e.target.value)} />
                  <Input placeholder="Room Number" value={panelRoom} onChange={(e) => setPanelRoom(e.target.value)} />
                  <Input placeholder="Panel Members (comma separated)" value={panelMembers} onChange={(e) => setPanelMembers(e.target.value)} />
                  <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleAddPanel}>Create Panel</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {panels.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No panels created yet. Click "Add Panel" to create one.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {panels.map((panel) => (
                <Card key={panel.id} className="border-2">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 text-lg">{panel.name}</h3>
                        <Badge variant="outline">{panel.room}</Badge>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Ongoing Round:</span>
                          <Badge className="bg-green-600 text-white">Round {panel.currentRound}</Badge>
                        </div>
                      </div>
                      {panel.currentStudent && (
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                          <div className="flex items-center mb-1">
                            <CircleDot className="h-4 w-4 text-blue-600 mr-2" />
                            <span className="text-sm font-medium text-gray-700">Currently Interviewing:</span>
                          </div>
                          <p className="text-sm font-semibold text-gray-900">{panel.currentStudent.name}</p>
                          <p className="text-xs text-gray-600">{panel.currentStudent.rollNo}</p>
                        </div>
                      )}
                      <div className="text-sm text-gray-600 pt-2 border-t">
                        <p className="font-medium mb-1">Panel Members:</p>
                        {panel.members.map((member, idx) => (
                          <p key={idx} className="text-xs">• {member}</p>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Search and List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Users className="h-5 w-5 mr-2 text-green-600" />Students List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input placeholder="Search by name or roll number…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={selectedRound} onValueChange={setSelectedRound}>
              <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Select Round" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rounds</SelectItem>
                {Array.from({ length: company.totalRounds }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>Round {i + 1}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Filter by Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="yet-to-interview">Yet to Interview</SelectItem>
                <SelectItem value="in-queue">In Queue</SelectItem>
                <SelectItem value="in-interview">In Interview</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {filteredStudents.map((student) => (
              <Card key={student.id} className="border-2">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg">{student.name}</h3>
                        <p className="text-sm text-gray-600">{student.rollNo}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(student.status)}
                        <Badge variant="outline" className="text-xs">Round {student.round}</Badge>
                      </div>
                    </div>

                    {getLocationBadge(student.locationStatus, student.currentCompany)}

                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center text-gray-700">
                        <Phone className="h-4 w-4 mr-2 text-gray-400" /> {student.contact}
                      </div>
                      <div className="flex items-center text-gray-700">
                        <AlertCircle className="h-4 w-4 mr-2 text-red-400" /> Emergency: {student.emergencyContact}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      <Button size="sm" variant="outline" onClick={() => handleSendNotification(student.id, "come")}>
                        <Send className="h-4 w-4 mr-1" /> Send to Interview
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleSendNotification(student.id, "general")}>
                        <Mail className="h-4 w-4 mr-1" /> Send Notification
                      </Button>
                      <Select onValueChange={(value) => handleUpdateStatus(student.id, value as Student["status"])}>
                        <SelectTrigger className="w-40"><SelectValue placeholder="Update Status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in-queue">Add to Queue</SelectItem>
                          <SelectItem value="in-interview">In Interview</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>{students.length === 0 ? "No students shortlisted for this company yet." : "No students found matching the filters."}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}