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
  Building2, Users, UserPlus, Search, Phone, AlertCircle, CheckCircle,
  RotateCw, CircleDot, MapPin, XCircle, UserCheck, Loader2, Send, Edit
} from "lucide-react";
import { cocoApi } from "@/app/lib/api";
import { useSocket } from "@/app/socket-context";
import { toast } from "sonner";

interface Student {
  id: string;
  name: string;
  rollNo: string;
  contact: string;
  emergencyContact: string;
  status: "in-queue" | "in-interview" | "completed";
  round: number;
  position: number;
  locationStatus: "in-queue" | "in-interview" | "no-show" | "completed-day";
  currentCompany?: string;
  userId: string;
}

interface Panel {
  id: string;
  name: string;
  members: string[];
  room: string;
  currentRound: number;
  roundId?: string;
  status: "occupied" | "unoccupied";
  currentStudent?: { _id: string; name: string; rollNumber: string };
}

interface CoCoHomePageProps {
  companyName: string;
  onRoundTracking: () => void;
}

export function CoCoHomePage({ companyName, onRoundTracking }: CoCoHomePageProps) {
  const { socket } = useSocket();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRound, setSelectedRound] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
  const [addingPanel, setAddingPanel] = useState(false);
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
  const [panelRoom, setPanelRoom] = useState("");
  const [panelMembers, setPanelMembers] = useState("");

  // Edit Panel Form
  const [editingPanel, setEditingPanel] = useState<Panel | null>(null);
  const [editPanelRoom, setEditPanelRoom] = useState("");

  // Add to Queue search state
  const [isAddQueueOpen, setIsAddQueueOpen] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [queueRoundInput, setQueueRoundInput] = useState("1");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [addingStudentId, setAddingStudentId] = useState<string | null>(null);

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
      position: raw.position ?? raw.queueEntry?.position ?? 0,
      locationStatus: (statusMap[statusRaw] ?? "in-queue") as Student["locationStatus"],
      currentCompany: raw.companyName ?? companyName,
      userId: raw.userId?._id ?? (typeof raw.userId === 'string' ? raw.userId : '') ?? "",
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

        if (cid) {
          const studentsData: any = await cocoApi.getShortlistedStudents(cid).catch(() => []);
          const sList = Array.isArray(studentsData) ? studentsData : studentsData.students ?? [];
          setStudents(sList.map(normalizeStudent));

          try {
            const panelsData: any = await cocoApi.getPanels(cid).catch(() => []);
            const pList = Array.isArray(panelsData) ? panelsData : panelsData.panels ?? [];
            setPanels(pList.map((p: any) => ({
              id: p._id || p.id,
              name: p.panelName,
              members: p.interviewers || [],
              room: p.venue || companyObj.venue || "TBA",
              currentRound: p.roundId?.roundNumber || companyObj.currentRound || 1,
              roundId: p.roundId?._id || p.roundId,
              status: p.status || "unoccupied",
              currentStudent: p.currentStudent,
            })));
          } catch (e) {
            console.error("Failed to fetch panels", e);
          }
        }
      }
    } catch {
      toast.error("Failed to load company data");
    } finally {
      setLoading(false);
    }
  }, [companyName]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!socket || !company.id) return;
    socket.emit("join:company", company.id);
    const handleUpdate = () => fetchData();
    socket.on("queue:updated", handleUpdate);
    socket.on("status:updated", handleUpdate);
    socket.on("walkin:updated", handleUpdate);
    return () => {
      socket.off("queue:updated", handleUpdate);
      socket.off("status:updated", handleUpdate);
      socket.off("walkin:updated", handleUpdate);
    };
  }, [socket, company.id, fetchData]);

  const handleSearchStudents = async () => {
    if (!studentSearchQuery.trim()) return;
    setSearchingStudents(true);
    try {
      const data: any = await cocoApi.searchStudents(studentSearchQuery);
      setSearchResults(Array.isArray(data) ? data : data.students ?? []);
    } catch {
      toast.error("Failed to search students");
    } finally {
      setSearchingStudents(false);
    }
  };

  const handleAddStudentToQueue = async (studentId: string, studentName: string) => {
    if (!company.id) return toast.error("No company assigned");
    const roundNumber = parseInt(queueRoundInput, 10);
    if (isNaN(roundNumber) || roundNumber < 1) return toast.error("Invalid round number");
    
    setAddingStudentId(studentId);
    try {
      await cocoApi.addStudentToRound({ studentId, companyId: company.id, roundNumber });
      toast.success(`${studentName} added to Round ${roundNumber} Queue`);
      setSearchResults(prev => prev.filter(s => (s._id || s.id) !== studentId));
      await fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add student to queue");
    } finally {
      setAddingStudentId(null);
    }
  };

  const handleUpdateStatus = async (studentId: string, newStatus: Student["status"]) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status: newStatus } : s));
    try {
      await cocoApi.updateStudentStatus({ studentId, companyId: company.id, status: newStatus });
      fetchData();
    } catch {
      toast.error("Failed to update status");
      fetchData();
    }
  };

  const handleSendNotification = async (studentId: string, type: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student?.userId) return toast.error("Student user information not found");
    try {
      const msg = type === "come"
        ? `Please proceed to ${company.venue} for your ${company.name} interview.`
        : `Update regarding your ${company.name} interview.`;
      await cocoApi.sendNotification({ studentUserId: student.userId, companyId: company.id, message: msg });
      toast.success("Notification sent!");
    } catch {
      toast.error("Failed to send notification");
    }
  };

  const handleToggleWalkin = async () => {
    const newState = !isWalkinActive;
    setIsWalkinActive(newState);
    try {
      if (company.id) await cocoApi.toggleWalkIn(company.id, { enabled: newState });
      toast.success(newState ? "Walk-in activated" : "Walk-in deactivated");
    } catch {
      setIsWalkinActive(!newState);
      toast.error("Failed to toggle walk-in");
    }
  };

  const handleAddPanel = async () => {
    if (!panelRoom) return toast.error("Please enter a room number");
    setAddingPanel(true);
    try {
      await cocoApi.addPanel({
        companyId: company.id,
        venue: panelRoom,
        interviewers: panelMembers.split(",").map(m => m.trim()).filter(Boolean),
      });
      toast.success("Panel added! Automatically named.");
      setPanelRoom(""); setPanelMembers(""); setIsAddPanelOpen(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add panel");
    } finally {
      setAddingPanel(false);
    }
  };

  const handleEditPanelSave = async () => {
    if (!editingPanel) return;
    try {
       await cocoApi.updatePanel(editingPanel.id, { venue: editPanelRoom });
       toast.success("Panel updated");
       setEditingPanel(null);
       fetchData();
    } catch (err: any) {
       toast.error(err.message ?? "Failed to update panel");
    }
  };

  const handleAssignNextToPanel = async (panel: Panel) => {
    const roundQueue = students.filter(s => s.status === "in-queue" && s.round === panel.currentRound);
    if (!roundQueue.length) {
      return toast.error("No students currently waiting in queue for Round " + panel.currentRound);
    }
    
    // Sort to fetch physically earliest position
    roundQueue.sort((a,b) => a.position - b.position);
    const nextStudent = roundQueue[0];
    
    try {
      await cocoApi.assignPanelStudent(panel.id, { studentId: nextStudent.id });
      toast.success(`Assigned ${nextStudent.name} to ${panel.name}`);
      fetchData();
    } catch (err: any) {
      toast.error("Failed to assign student");
    }
  };

  const handleClearPanel = async (panelId: string) => {
    try {
      await cocoApi.clearPanel(panelId);
      toast.success("Panel cleared. Student marked as completed.");
      fetchData();
    } catch (err: any) {
      toast.error("Failed to clear panel");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in-queue": return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><AlertCircle className="h-3 w-3 mr-1" />In Queue</Badge>;
      case "in-interview": return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><RotateCw className="h-3 w-3 mr-1" />In Interview</Badge>;
      case "completed": return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      default: return null;
    }
  };
  
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

  if (loading) return <div className="flex items-center justify-center py-24 text-gray-400 gap-2"><Loader2 className="h-6 w-6 animate-spin" /> Loading...</div>;

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="h-16 w-16 rounded-lg bg-white flex items-center justify-center shadow-md">
                {company.logo ? <img src={company.logo} className="h-12 w-12 object-contain" /> : <span className="text-2xl font-bold text-gray-700">{company.name.charAt(0)}</span>}
              </div>
              <div>
                <CardTitle className="text-2xl text-gray-900 mb-2">{company.name}</CardTitle>
                <p className="text-sm text-gray-600">{company.venue}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onRoundTracking} className="border-green-600 text-green-600 hover:bg-green-50"><RotateCw className="h-4 w-4 mr-2" /> Round Tracking</Button>
              <Button variant={isWalkinActive ? "default" : "outline"} onClick={handleToggleWalkin} className={isWalkinActive ? "bg-green-600" : "border-green-600 text-green-600"}><Building2 className="h-4 w-4 mr-2" />{isWalkinActive ? "Walk-in Active" : "Activate Walk-in"}</Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center"><Users className="h-5 w-5 mr-2 text-green-600" />Interview Panels</CardTitle>
          <Dialog open={isAddPanelOpen} onOpenChange={setIsAddPanelOpen}>
            <DialogTrigger asChild><Button className="bg-green-600 hover:bg-green-700"><UserPlus className="h-4 w-4 mr-2" />Add Panel</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Panel</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <Input placeholder="Room Number (Venue)" value={panelRoom} onChange={(e) => setPanelRoom(e.target.value)} />
                <Input placeholder="Members (comma separated)" value={panelMembers} onChange={(e) => setPanelMembers(e.target.value)} />
                <Button className="w-full bg-green-600" onClick={handleAddPanel} disabled={addingPanel}>{addingPanel ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Panel"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {panels.map((panel) => (
              <Card key={panel.id} className="border-2 shadow-sm transition-shadow hover:shadow-md relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1.5 h-full ${panel.status === 'occupied' ? 'bg-red-500' : 'bg-green-500'}`} />
                <CardContent className="p-5 pl-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-lg text-gray-800">{panel.name}</h3>
                      <Badge variant={panel.status === 'occupied' ? 'destructive' : 'secondary'} className="capitalize">{panel.status}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                       <Badge variant="outline" className="font-mono bg-gray-50">{panel.room}</Badge>
                       <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-800" onClick={() => { setEditingPanel(panel); setEditPanelRoom(panel.room); }}>
                         <Edit className="h-4 w-4" />
                       </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-5">
                    <div className="text-sm flex gap-2"><span className="text-gray-500 w-20">Round:</span><span className="font-medium text-gray-700">{panel.currentRound}</span></div>
                    <div className="text-sm flex gap-2"><span className="text-gray-500 w-20">Members:</span><span className="font-medium text-gray-700">{panel.members.length > 0 ? panel.members.join(", ") : "—"}</span></div>
                    {panel.status === 'occupied' && panel.currentStudent && (
                      <div className="text-sm flex gap-2"><span className="text-gray-500 w-20">Student:</span><span className="font-semibold text-blue-700">{panel.currentStudent.name} ({panel.currentStudent.rollNumber})</span></div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    {panel.status === 'unoccupied' ? (
                      <Button className="flex-1 bg-green-600 hover:bg-green-700 text-sm shadow-sm" onClick={() => handleAssignNextToPanel(panel)}>Assign Next from Queue</Button>
                    ) : (
                      <Button className="flex-1" variant="destructive" onClick={() => handleClearPanel(panel.id)}>End (Mark Unoccupied)</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {panels.length === 0 && (
              <div className="col-span-1 md:col-span-2 border-dashed border-2 rounded-lg p-6 text-center text-gray-500 bg-gray-50">No panels configured.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Panel Dialog */}
      <Dialog open={!!editingPanel} onOpenChange={(open) => !open && setEditingPanel(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit {editingPanel?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Room / Venue</label>
              <Input placeholder="Room Number" value={editPanelRoom} onChange={(e) => setEditPanelRoom(e.target.value)} />
            </div>
            <Button className="w-full bg-blue-600" onClick={handleEditPanelSave}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center"><Users className="h-5 w-5 mr-2 text-indigo-600" />Student Queue Tracker</CardTitle>
          <Dialog open={isAddQueueOpen} onOpenChange={setIsAddQueueOpen}>
            <DialogTrigger asChild><Button className="bg-indigo-600 hover:bg-indigo-700"><UserPlus className="h-4 w-4 mr-2" />Add to Queue</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Add Student to Round Queue</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Search Student</label>
                    <Input placeholder="Search name or roll number..." value={studentSearchQuery} onChange={(e) => setStudentSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearchStudents()} />
                  </div>
                  <div className="w-24">
                     <label className="text-xs text-gray-500 mb-1 block">Round</label>
                     <Input type="number" min="1" value={queueRoundInput} onChange={(e) => setQueueRoundInput(e.target.value)} />
                  </div>
                  <Button onClick={handleSearchStudents} disabled={searchingStudents}>{searchingStudents ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}</Button>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {searchResults.map((s: any) => (
                    <div key={s._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div><p className="font-semibold">{s.name}</p><p className="text-xs text-gray-500">{s.rollNumber}</p></div>
                      <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => handleAddStudentToQueue(s._id, s.name)} disabled={addingStudentId === s._id}>
                        {addingStudentId === s._id ? <Loader2 className="h-4 w-4 animate-spin" /> : `Add to Round ${queueRoundInput}`}
                      </Button>
                    </div>
                  ))}
                  {searchResults.length === 0 && !searchingStudents && studentSearchQuery && (
                     <p className="text-sm text-center text-gray-500 mt-4">No matching students found.</p>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input placeholder="Filter queue students..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={selectedRound} onValueChange={setSelectedRound}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Rounds" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rounds</SelectItem>
                {[...Array(company.totalRounds)].map((_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>Round {i + 1}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="in-queue">In Queue</SelectItem>
                <SelectItem value="in-interview">In Interview</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            {filteredStudents.map((student) => (
              <Card key={student.id} className="border-2 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{student.name}</h3>
                    <p className="text-sm text-gray-500">{student.rollNo} • <span className="text-indigo-600 font-medium">Round {student.round}</span></p>
                    <div className="flex gap-4 text-xs mt-2"><span className="flex items-center text-gray-600"><Phone className="h-3 w-3 mr-1" />{student.contact}</span></div>
                  </div>
                  <div className="text-right space-y-2">
                    {getStatusBadge(student.status)}
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t items-center justify-between">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleSendNotification(student.id, "come")}><Send className="h-3 w-3 mr-1" /> Call to Queue</Button>
                  </div>
                  <Select value={student.status} onValueChange={(v) => handleUpdateStatus(student.id, v as any)}>
                      <SelectTrigger className="w-40 h-8 text-xs bg-gray-50 border-gray-200"><SelectValue placeholder="Override status..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in-queue">Force In Queue</SelectItem>
                        <SelectItem value="in-interview">Force Interviewing</SelectItem>
                        <SelectItem value="completed">Force Completed</SelectItem>
                      </SelectContent>
                  </Select>
                </div>
              </Card>
            ))}
            {filteredStudents.length === 0 && (
                <div className="text-center py-12 text-gray-500 rounded-lg border-2 border-dashed">No students currently in the queue match criteria.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}