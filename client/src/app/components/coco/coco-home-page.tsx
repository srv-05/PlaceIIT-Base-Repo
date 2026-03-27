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
  RotateCw, CircleDot, MapPin, XCircle, UserCheck, Loader2, Send, Edit,
  Pencil, Mail, UserX, Clock
} from "lucide-react";
import { cocoApi } from "@/app/lib/api";
import { useSocket } from "@/app/socket-context";
import { toast } from "sonner";

/* ───────────────────────────── types ───────────────────────────── */

interface Student {
  id: string;
  name: string;
  rollNo: string;
  contact: string;
  emergencyContact: string;
  status: "in-queue" | "in-interview" | "completed" | "unassigned";
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
  companyName?: string;
  onRoundTracking: () => void;
}

/* ───────────────────────────── component ───────────────────────── */

export function CoCoHomePage({ companyName, onRoundTracking }: CoCoHomePageProps) {
  const { socket } = useSocket();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRound, setSelectedRound] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
  const [addingPanel, setAddingPanel] = useState(false);
  const [isWalkinActive, setIsWalkinActive] = useState(false);
  const [isVenueDialogOpen, setIsVenueDialogOpen] = useState(false);
  const [newVenue, setNewVenue] = useState("");
  const [savingVenue, setSavingVenue] = useState(false);
  const [loading, setLoading] = useState(true);

  // Drive state (display only — CoCo assignment is separate)
  const [driveDay, setDriveDay] = useState<number | null>(null);
  const [driveSlot, setDriveSlot] = useState<string | null>(null);

  const [company, setCompany] = useState({
    id: "",
    name: companyName || "",
    logo: "",
    role: "",
    venue: "—",
    currentRound: 1,
    totalRounds: 1,
  });

  const [students, setStudents] = useState<Student[]>([]);
  const [panels, setPanels] = useState<Panel[]>([]);

  const [panelRoom, setPanelRoom] = useState("");
  const [panelMembers, setPanelMembers] = useState("");

  const [editingPanel, setEditingPanel] = useState<Panel | null>(null);
  const [editPanelRoom, setEditPanelRoom] = useState("");
  const [editPanelRound, setEditPanelRound] = useState("1");

  // Inline-edit state for panel members
  const [editingMember, setEditingMember] = useState<{ panelId: string; memberIdx: number } | null>(null);
  const [editingMemberValue, setEditingMemberValue] = useState("");

  // Inline-edit state for panel venue
  const [editingVenue, setEditingVenue] = useState<string | null>(null);
  const [editingVenueValue, setEditingVenueValue] = useState("");

  // Per-panel round selection (tracks dropdown value without opening dialog)
  const [roundSelections, setRoundSelections] = useState<Record<string, string>>({});

  const [isAddQueueOpen, setIsAddQueueOpen] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [queueRoundInput, setQueueRoundInput] = useState("1");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [addingStudentId, setAddingStudentId] = useState<string | null>(null);

  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [selectedStudentForNotification, setSelectedStudentForNotification] = useState<Student | null>(null);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [forceActionStudent, setForceActionStudent] = useState<Student | null>(null);
  const [forceActionType, setForceActionType] = useState<"in-queue" | "in-interview" | null>(null);
  const [forceRoundSelection, setForceRoundSelection] = useState("1");
  const [forcePanelSelection, setForcePanelSelection] = useState("");
  const [forceActionLoading, setForceActionLoading] = useState(false);

  const PREDEFINED_MESSAGES = [
    "Please report to our interview panel right now.",
    "Your interview starts in 10 minutes. Please be ready.",
    "You've been moved to the next round. See you soon.",
    "Your interview has been slightly delayed. We'll call you shortly.",
    "Congratulations! You have cleared this round.",
    "Please bring a hard copy of your resume to the panel.",
    "Your interview is over for today. Thank you.",
  ];

  const deriveRoundNumber = (raw: any) => {
    const roundIdValue = raw.roundId ?? raw.queueEntry?.roundId;
    const roundNumberFromId = typeof roundIdValue === "object" ? roundIdValue?.roundNumber : undefined;
    if (typeof roundNumberFromId === "number") return roundNumberFromId;

    const roundLabel = raw.round ?? raw.queueEntry?.round;
    if (typeof roundLabel === "number") return roundLabel;
    if (typeof roundLabel === "string") {
      const match = roundLabel.match(/(\d+)/);
      if (match) return Number(match[1]);
    }

    if (typeof raw.currentRound === "number") return raw.currentRound;
    return 1;
  };

  /* ── normalizer ── */
  const normalizeStudent = (raw: any, i: number, compName: string): Student => {
    const hasQueueEntry = !!raw.queueEntry;
    const statusRaw: string = hasQueueEntry ? raw.queueEntry.status : "unassigned";
    const statusMap: Record<string, Student["status"]> = {
      in_queue: "in-queue", waiting: "in-queue", "in-queue": "in-queue",
      in_interview: "in-interview", interviewing: "in-interview", "in-interview": "in-interview",
      completed: "completed", done: "completed",
      unassigned: "unassigned",
    };
    return {
      id: raw._id ?? raw.id ?? raw.student?._id ?? String(i),
      name: raw.name ?? raw.student?.name ?? "—",
      rollNo: raw.rollNumber ?? raw.student?.rollNumber ?? "—",
      contact: raw.contact ?? raw.student?.contact ?? "—",
      emergencyContact: raw.emergencyContact?.phone ?? raw.student?.emergencyContact?.phone ?? "—",
      status: statusMap[statusRaw] ?? "unassigned",
      round: deriveRoundNumber(raw),
      position: raw.position ?? raw.queueEntry?.position ?? 0,
      locationStatus: (statusMap[statusRaw] ?? "unassigned") as Student["locationStatus"],
      currentCompany: raw.companyName ?? compName,
      userId: raw.userId?._id ?? (typeof raw.userId === 'string' ? raw.userId : '') ?? "",
    };
  };

  /* ── data fetching ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const companyRes: any = await cocoApi.getAssignedCompany();
      const arr = Array.isArray(companyRes) ? companyRes : (companyRes.companies || (companyRes.company ? [companyRes.company] : []));

      if (arr.length === 0) {
        setCompany({ id: "", name: "", logo: "", role: "", venue: "—", currentRound: 1, totalRounds: 1 });
        return;
      }

      let companyObj = companyName
        ? arr.find((c: any) => (c.name ?? "").toLowerCase() === companyName.toLowerCase())
        : arr[0];

      if (!companyObj) companyObj = arr[0];

      if (companyObj) {
        const cid = companyObj._id ?? companyObj.id ?? "";
        setCompany({
          id: cid,
          name: companyObj.name ?? companyName ?? "—",
          logo: companyObj.logo ?? "",
          role: companyObj.role ?? "",
          venue: companyObj.venue ?? "TBA",
          currentRound: companyObj.currentRound ?? 1,
          totalRounds: companyObj.totalRounds ?? 1,
        });
        setIsWalkinActive(!!companyObj.isWalkInEnabled);

        if (cid) {
          const studentsData: any = await cocoApi.getShortlistedStudents(cid).catch(() => []);
          const sList = Array.isArray(studentsData) ? studentsData : studentsData.students ?? [];
          setStudents(sList.map((s: any, i: number) => normalizeStudent(s, i, companyObj.name ?? companyName)));

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

  // Fetch drive state
  useEffect(() => {
    cocoApi.getDriveState().then((data: any) => {
      setDriveDay(data.currentDay ?? null);
      setDriveSlot(data.currentSlot ?? null);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket || !company.id) return;
    socket.emit("join:company", company.id);
    const handleUpdate = () => fetchData();
    socket.on("queue:updated", handleUpdate);
    socket.on("status:updated", handleUpdate);
    socket.on("walkin:updated", handleUpdate);
    socket.on("round:updated", handleUpdate);
    return () => {
      socket.off("queue:updated", handleUpdate);
      socket.off("status:updated", handleUpdate);
      socket.off("walkin:updated", handleUpdate);
      socket.off("round:updated", handleUpdate);
    };
  }, [socket, company.id, fetchData]);

  // Drive state socket sync
  useEffect(() => {
    if (!socket) return;
    const handleDriveUpdate = (data: any) => {
      setDriveDay(data.currentDay);
      setDriveSlot(data.currentSlot);
    };
    socket.on("driveState:updated", handleDriveUpdate);
    return () => { socket.off("driveState:updated", handleDriveUpdate); };
  }, [socket]);

  /* ── handlers ── */
  const handleSearchStudents = async () => {
    if (!studentSearchQuery.trim()) {
      setSearchResults([]);
      return;
    }
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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (studentSearchQuery.trim()) {
        handleSearchStudents();
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [studentSearchQuery]);

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
      toast.error(err.message ?? "Failed to add student to queue", {
        description: err.data?.conflictCompanyName
          ? `${studentName} is already in ${err.data.conflictCompanyName}'s queue.`
          : undefined,
      });
    } finally {
      setAddingStudentId(null);
    }
  };

  const handleUpdateStatus = async (student: Student, newStatus: Student["status"]) => {
    setStudents(prev => prev.map(s => {
      if (s.id !== student.id) return s;
      let locStatus = s.locationStatus;
      if (newStatus === "in-queue") {
        locStatus = s.currentCompany ? "in-queue" : "idle" as any;
      } else if (newStatus === "in-interview") {
        locStatus = s.currentCompany ? "in-interview" : "idle" as any;
      } else if (newStatus === "completed") {
        locStatus = "completed-day";
      } else {
        locStatus = "idle" as any;
      }
      return { ...s, status: newStatus, locationStatus: locStatus };
    }));

    try {
      const statusMap: Record<Student["status"], string> = {
        "in-queue": "in_queue",
        "in-interview": "in_interview",
        completed: "completed",
        unassigned: "not_joined",
      };

      await cocoApi.updateStudentStatus({
        studentId: student.id,
        companyId: company.id,
        status: statusMap[newStatus],
        round: `Round ${student.round}`,
      });
      fetchData();
    } catch {
      toast.error("Failed to update status");
      fetchData();
    }
  };

  const ensureStudentInRound = async (studentId: string, roundNumber: number) => {
    try {
      await cocoApi.addStudentToRound({ studentId, companyId: company.id, roundNumber });
    } catch (err: any) {
      if (!String(err?.message ?? "").includes("actively in this round's queue already")) {
        throw err;
      }
    }
  };

  const openForceAction = (student: Student, action: Student["status"]) => {
    if (action === "completed") {
      handleUpdateStatus(student, action);
      return;
    }

    if (action === "in-interview") {
      const availablePanels = panels.filter((panel) => panel.status === "unoccupied");
      if (availablePanels.length === 0) {
        toast.error("No interview panels are currently available.");
        return;
      }
      setForcePanelSelection(availablePanels[0].id);
      setForceRoundSelection(String(availablePanels[0].currentRound || student.round || 1));
      setForceActionStudent(student);
      setForceActionType("in-interview");
      return;
    }

    setForceRoundSelection(String(student.round || company.currentRound || 1));
    setForceActionStudent(student);
    setForceActionType("in-queue");
  };

  const resetForceAction = () => {
    setForceActionStudent(null);
    setForceActionType(null);
    setForceRoundSelection("1");
    setForcePanelSelection("");
    setForceActionLoading(false);
  };

  const handleConfirmForceAction = async () => {
    if (!forceActionStudent || !forceActionType) return;

    setForceActionLoading(true);
    try {
      if (forceActionType === "in-queue") {
        const roundNumber = parseInt(forceRoundSelection, 10);
        if (isNaN(roundNumber) || roundNumber < 1) {
          throw new Error("Please select a valid round.");
        }

        await ensureStudentInRound(forceActionStudent.id, roundNumber);
        await cocoApi.updateStudentStatus({
          studentId: forceActionStudent.id,
          companyId: company.id,
          status: "in_queue",
          round: `Round ${roundNumber}`,
        });
        toast.success(`${forceActionStudent.name} moved to Round ${roundNumber} queue.`);
      }

      if (forceActionType === "in-interview") {
        const selectedPanel = panels.find((panel) => panel.id === forcePanelSelection && panel.status === "unoccupied");
        if (!selectedPanel) {
          throw new Error("Please select an available panel.");
        }

        const roundNumber = selectedPanel.currentRound || 1;
        await cocoApi.updatePanel(selectedPanel.id, { roundNumber });
        await ensureStudentInRound(forceActionStudent.id, roundNumber);
        await cocoApi.assignPanelStudent(selectedPanel.id, { studentId: forceActionStudent.id });
        toast.success(`${forceActionStudent.name} assigned to ${selectedPanel.name} for interview.`);
      }

      resetForceAction();
      fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update status");
      setForceActionLoading(false);
      fetchData();
    }
  };

  const handleSendPredefinedNotification = async (message: string) => {
    if (!selectedStudentForNotification) return;
    setNotifyLoading(true);
    try {
      if (!selectedStudentForNotification.userId) throw new Error("Student user information not found");
      await cocoApi.sendNotification({
        studentUserId: selectedStudentForNotification.userId,
        companyId: company.id,
        message: message
      });
      toast.success(`Message sent to ${selectedStudentForNotification.name}`);
      setIsNotificationModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to send notification");
    } finally {
      setNotifyLoading(false);
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

  const handleChangeVenue = async () => {
    if (!newVenue.trim()) return toast.error("Please enter a venue");
    setSavingVenue(true);
    try {
      await cocoApi.updateVenue(company.id, newVenue.trim());
      setCompany(prev => ({ ...prev, venue: newVenue.trim() }));
      toast.success("Venue updated successfully");
      setIsVenueDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update venue");
    } finally {
      setSavingVenue(false);
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
      await cocoApi.updatePanel(editingPanel.id, { venue: editPanelRoom, roundNumber: parseInt(editPanelRound) });
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
    roundQueue.sort((a, b) => a.position - b.position);
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

  /* ── helpers ── */
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in-queue":
        return <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-200"><AlertCircle className="h-3 w-3 mr-1" />In Queue</Badge>;
      case "in-interview":
        return <Badge className="bg-blue-100 text-blue-800 border border-blue-200"><RotateCw className="h-3 w-3 mr-1" />In Interview</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800 border border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case "unassigned":
        return <Badge className="bg-gray-100 text-gray-600 border border-gray-200"><UserCheck className="h-3 w-3 mr-1" />Unassigned</Badge>;
      default:
        return null;
    }
  };

  const getLocationBadge = (locationStatus: Student["locationStatus"], currentCompany?: string) => {
    switch (locationStatus) {
      case "in-queue":
        if (currentCompany) {
          return (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center">
                <MapPin className="h-4 w-4 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-900">Waiting in {currentCompany}&apos;s queue</span>
              </div>
            </div>
          );
        }
        break;
      case "in-interview":
        if (currentCompany) {
          return (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-center">
                <CircleDot className="h-4 w-4 text-purple-600 mr-2 animate-pulse" />
                <span className="text-sm font-medium text-purple-900">Getting interviewed at {currentCompany}</span>
              </div>
            </div>
          );
        }
        break;
      case "completed-day":
        return (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center">
              <UserCheck className="h-4 w-4 text-green-600 mr-2" />
              <span className="text-sm font-medium text-green-900">Completed all interviews for the day</span>
            </div>
          </div>
        );
    }
    // Default: Idle
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="flex items-center">
          <Clock className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-sm font-medium text-gray-500">Idle — not currently assigned to any company.</span>
        </div>
      </div>
    );
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.rollNo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRound = selectedRound === "all" || student.round === parseInt(selectedRound) || student.status === "unassigned";
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "yet-to-interview" && student.status === "in-queue") ||
      statusFilter === student.status;
    return matchesSearch && matchesRound && matchesStatus;
  });

  /* ────────────────── loading state ────────────────── */
  if (loading) return (
    <div className="flex items-center justify-center py-24 text-gray-400 gap-2">
      <Loader2 className="h-6 w-6 animate-spin" /> Loading...
    </div>
  );

  /* ────────────────── no company state ────────────────── */
  if (!company.id) {
    return (
      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm m-6">
        <CardContent className="py-24 text-center flex flex-col items-center">
          <Building2 className="h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-700">No assignments yet</h2>
          <p className="text-gray-500 mt-2">You have not been assigned to any companies today.</p>
        </CardContent>
      </Card>
    );
  }

  /* ────────────────────────── RENDER ────────────────────────── */
  return (
    <div className="space-y-6 bg-gray-50 min-h-screen p-4 md:p-6">

      {/* ═══════════════  COMPANY HEADER  ═══════════════ */}
      <Card className="bg-white border border-green-200 rounded-xl shadow-sm">
        <CardHeader className="p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start space-x-4">
              <div className="h-16 w-16 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center shadow-sm flex-shrink-0">
                {company.logo ? (
                  <img
                    src={company.logo}
                    alt={company.name}
                    className="h-12 w-12 object-contain"
                    onError={(e) => {
                      const target = e.currentTarget;
                      const parent = target.parentElement;
                      if (parent) {
                        target.style.display = "none";
                        const fallback = document.createElement("span");
                        fallback.className = "text-2xl font-bold text-gray-700";
                        fallback.textContent = company.name.charAt(0);
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                ) : (
                  <span className="text-2xl font-bold text-gray-700">{company.name.charAt(0)}</span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CardTitle className="text-2xl text-gray-900">{company.name}</CardTitle>
                  {driveDay != null && (
                    <Badge className="bg-green-100 text-green-700 border border-green-200 text-sm font-medium">
                      Day {driveDay}
                    </Badge>
                  )}
                  {driveSlot && (
                    <Badge className="bg-green-100 text-green-700 border border-green-200 text-sm font-medium">
                      {driveSlot.charAt(0).toUpperCase() + driveSlot.slice(1)} Slot
                    </Badge>
                  )}
                </div>
                {company.role && <p className="text-gray-600 text-sm mb-1">{company.role}</p>}
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-sm text-gray-600">{company.venue}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={onRoundTracking}
                className="border-green-600 text-green-600 hover:bg-green-50"
              >
                <RotateCw className="h-4 w-4 mr-2" />
                Round Tracking
              </Button>
              <Button
                variant="outline"
                onClick={() => { setNewVenue(company.venue); setIsVenueDialogOpen(true); }}
                className="border-green-600 text-green-600 hover:bg-green-50"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Change Venue
              </Button>
              <Button
                variant={isWalkinActive ? "default" : "outline"}
                onClick={handleToggleWalkin}
                className={isWalkinActive ? "bg-green-600 hover:bg-green-700 text-white" : "border-green-600 text-green-600 hover:bg-green-50"}
              >
                <Building2 className="h-4 w-4 mr-2" />
                {isWalkinActive ? "Walk-in Active" : "Activate Walk-in"}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* ═══════════════  INTERVIEW PANELS  ═══════════════ */}
      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <CardHeader className="p-5 md:p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-lg">
              <Users className="h-5 w-5 mr-2 text-green-600" />
              Interview Panels
            </CardTitle>
            <Dialog open={isAddPanelOpen} onOpenChange={setIsAddPanelOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Panel
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Panel</DialogTitle>
                  <DialogDescription>Create a new interview panel for {company.name}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input placeholder="Room Number (Venue)" value={panelRoom} onChange={(e) => setPanelRoom(e.target.value)} />
                  <Input placeholder="Members (comma separated)" value={panelMembers} onChange={(e) => setPanelMembers(e.target.value)} />
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={handleAddPanel} disabled={addingPanel}>
                    {addingPanel ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Panel"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 md:px-6 md:pb-6 pt-0">
          <div className="grid md:grid-cols-2 gap-4">
            {panels.map((panel) => {
              const isOccupied = panel.status === "occupied";
              const selectedRoundForPanel = roundSelections[panel.id] ?? panel.currentRound.toString();
              return (
                <Card key={panel.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
                  <CardContent className="p-5 flex flex-col flex-1">
                    <div className="space-y-4 flex flex-col flex-1">
                      {/* Header row: Panel name + editable venue */}
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 text-lg">{panel.name}</h3>
                        {editingVenue === panel.id ? (
                          <Input
                            className="h-7 w-36 text-xs font-mono"
                            autoFocus
                            value={editingVenueValue}
                            onChange={(e) => setEditingVenueValue(e.target.value)}
                            onBlur={() => {
                              setPanels(prev => prev.map(p => p.id === panel.id ? { ...p, room: editingVenueValue } : p));
                              setEditingVenue(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                setPanels(prev => prev.map(p => p.id === panel.id ? { ...p, room: editingVenueValue } : p));
                                setEditingVenue(null);
                              }
                            }}
                          />
                        ) : (
                          <button
                            className="flex items-center gap-1 group cursor-pointer"
                            onClick={() => { setEditingVenue(panel.id); setEditingVenueValue(panel.room); }}
                          >
                            <Badge variant="outline" className="text-xs text-gray-600 border-gray-300 bg-gray-50 font-mono">{panel.room}</Badge>
                            <Pencil className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        )}
                      </div>

                      {/* Ongoing Round section — green tinted box */}
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Ongoing Round:</span>
                          <Badge className="bg-green-600 text-white">Round {panel.currentRound}</Badge>
                        </div>
                        <div className="flex gap-2">
                          <Select
                            value={selectedRoundForPanel}
                            onValueChange={(v) => setRoundSelections(prev => ({ ...prev, [panel.id]: v }))}
                          >
                            <SelectTrigger className="h-8 text-xs bg-white border-gray-300">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: Math.max(company?.totalRounds || 0, 3) }, (_, i) => i + 1).map((r) => (
                                <SelectItem key={r} value={r.toString()}>Round {r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button size="sm" className="text-xs bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => {
                              const newRound = parseInt(selectedRoundForPanel, 10);
                              if (!isNaN(newRound)) {
                                setPanels(prev => prev.map(p => p.id === panel.id ? { ...p, currentRound: newRound } : p));
                                cocoApi.updatePanel(panel.id, { roundNumber: newRound }).catch(() => toast.error("Failed to update round"));
                              }
                            }}>
                            Update Round
                          </Button>
                        </div>
                      </div>

                      {/* Currently Interviewing — always rendered, fixed height */}
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        {isOccupied && panel.currentStudent ? (
                          <>
                            <div className="flex items-center mb-1">
                              <CircleDot className="h-4 w-4 text-blue-600 mr-2 animate-pulse" />
                              <span className="text-sm font-medium text-gray-700">Currently Interviewing:</span>
                            </div>
                            <p className="text-sm font-semibold text-gray-900">{panel.currentStudent.name}</p>
                            <p className="text-xs text-gray-600">{panel.currentStudent.rollNumber}</p>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center mb-1">
                              <UserX className="h-4 w-4 text-gray-400 mr-2" />
                              <span className="text-sm font-medium text-gray-400">Currently Interviewing:</span>
                            </div>
                            <p className="text-sm text-gray-400">Panel is currently unoccupied</p>
                            <p className="text-xs text-transparent select-none">&nbsp;</p>
                          </>
                        )}
                      </div>

                      {/* Panel Members — editable inline */}
                      <div className="text-sm text-gray-600 pt-3 border-t border-gray-100">
                        <p className="font-medium mb-1 text-gray-700">Panel Members:</p>
                        {panel.members.length > 0
                          ? panel.members.map((member, idx) => (
                            <div key={idx} className="flex items-center gap-1 group">
                              {editingMember?.panelId === panel.id && editingMember.memberIdx === idx ? (
                                <Input
                                  className="h-6 text-xs flex-1 my-0.5"
                                  autoFocus
                                  value={editingMemberValue}
                                  onChange={(e) => setEditingMemberValue(e.target.value)}
                                  onBlur={() => {
                                    setPanels(prev => prev.map(p => {
                                      if (p.id !== panel.id) return p;
                                      const newMembers = [...p.members];
                                      newMembers[idx] = editingMemberValue;
                                      return { ...p, members: newMembers };
                                    }));
                                    setEditingMember(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      setPanels(prev => prev.map(p => {
                                        if (p.id !== panel.id) return p;
                                        const newMembers = [...p.members];
                                        newMembers[idx] = editingMemberValue;
                                        return { ...p, members: newMembers };
                                      }));
                                      setEditingMember(null);
                                    }
                                  }}
                                />
                              ) : (
                                <>
                                  <span className="text-xs text-gray-500">• {member}</span>
                                  <button
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-100"
                                    onClick={() => { setEditingMember({ panelId: panel.id, memberIdx: idx }); setEditingMemberValue(member); }}
                                  >
                                    <Pencil className="h-3 w-3 text-gray-400" />
                                  </button>
                                </>
                              )}
                            </div>
                          ))
                          : <p className="text-xs text-gray-400">—</p>
                        }
                      </div>

                      {/* Action buttons — pushed to bottom */}
                      <div className="pt-1 mt-auto">
                        {panel.status === "unoccupied" ? (
                          <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={() => handleAssignNextToPanel(panel)}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Assign Next from Queue
                          </Button>
                        ) : (
                          <Button className="w-full" variant="destructive" onClick={() => handleClearPanel(panel.id)}>
                            <XCircle className="h-4 w-4 mr-2" />
                            End (Mark Unoccupied)
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {panels.length === 0 && (
              <div className="col-span-1 md:col-span-2 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-500 bg-gray-50">
                <Users className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                <p>No panels configured yet.</p>
                <p className="text-xs mt-1 text-gray-400">Click &quot;Add Panel&quot; to get started.</p>
              </div>
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
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Target Round</label>
              <Select value={editPanelRound} onValueChange={setEditPanelRound}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Round" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: Math.max(company?.totalRounds || 0, 3) }, (_, i) => i + 1).map((r) => (
                    <SelectItem key={r} value={r.toString()}>Round {r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={handleEditPanelSave}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Venue Dialog */}
      <Dialog open={isVenueDialogOpen} onOpenChange={setIsVenueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Venue</DialogTitle>
            <DialogDescription>Update the venue for {company.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              placeholder="Enter new venue (e.g. RM101)"
              value={newVenue}
              onChange={(e) => setNewVenue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleChangeVenue(); }}
            />
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={handleChangeVenue}
              disabled={savingVenue}
            >
              {savingVenue ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Venue"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════  STUDENTS LIST  ═══════════════ */}
      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <CardHeader className="p-5 md:p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-lg">
              <Users className="h-5 w-5 mr-2 text-green-600" />
              Shortlisted Students
            </CardTitle>
            <Dialog open={isAddQueueOpen} onOpenChange={setIsAddQueueOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add to Queue
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Add Student to Round Queue</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">Student Name / Roll Number</label>
                      <Input placeholder="Search name or roll number..." value={studentSearchQuery} onChange={(e) => setStudentSearchQuery(e.target.value)} />
                    </div>
                    <div className="w-32">
                      <label className="text-xs text-gray-500 mb-1 block">Round</label>
                      <Select value={queueRoundInput} onValueChange={setQueueRoundInput}>
                        <SelectTrigger>
                          <SelectValue placeholder="Round" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: Math.max(company?.totalRounds || 0, 3) }, (_, i) => i + 1).map((r) => (
                            <SelectItem key={r} value={String(r)}>
                              Round {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {searchResults.map((s: any) => (
                      <div key={s._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div><p className="font-semibold text-gray-900">{s.name}</p><p className="text-xs text-gray-500">{s.rollNumber}</p></div>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleAddStudentToQueue(s._id, s.name)} disabled={addingStudentId === s._id}>
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
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 md:px-6 md:pb-6 pt-0 space-y-4">
          {/* Search + Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Search by name or roll number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-gray-300"
              />
            </div>
            <Select value={selectedRound} onValueChange={setSelectedRound}>
              <SelectTrigger className="w-full md:w-40 bg-white border-gray-300">
                <SelectValue placeholder="All Rounds" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rounds</SelectItem>
                {[...Array(Math.max(company?.totalRounds || 0, 3))].map((_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>Round {i + 1}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48 bg-white border-gray-300">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                <SelectItem value="in-queue">In Queue</SelectItem>
                <SelectItem value="in-interview">In Interview</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Student Cards */}
          <div className="space-y-3">
            {filteredStudents.map((student) => (
              <Card key={student.id} className="bg-white border border-gray-200 shadow-sm rounded-2xl">
                <CardContent className="px-6 py-5 space-y-3">
                  {/* Header row */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{student.name}</h3>
                      <p className="text-sm text-gray-500">{student.rollNo}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {getStatusBadge(student.status)}
                      {student.status !== "unassigned" && (
                        <Badge variant="outline" className="text-xs border-gray-300 text-gray-600">
                          Round {student.round}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Location status bar — full-width single-line pill */}
                  {getLocationBadge(student.locationStatus, student.currentCompany)}

                  {/* Contact row */}
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center text-gray-500">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      {student.contact}
                    </div>
                    <div className="flex items-center text-gray-500">
                      <AlertCircle className="h-4 w-4 mr-2 text-red-400" />
                      Emergency: {student.emergencyContact}
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="flex flex-wrap items-center gap-2 border-t pt-3 mt-1">
                    {student.status === "unassigned" ? (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => { setIsAddQueueOpen(true); setStudentSearchQuery(student.name); handleSearchStudents(); }}
                      >
                        <UserPlus className="h-3.5 w-3.5 mr-1" />
                        Add to Queue
                      </Button>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" className="border-gray-300" onClick={() => { setSelectedStudentForNotification(student); setIsNotificationModalOpen(true); }}>
                          <Mail className="h-3.5 w-3.5 mr-1" />
                          Send Notification
                        </Button>
                        <Select value={student.status} onValueChange={(v) => openForceAction(student, v as any)}>
                          <SelectTrigger className="w-40 h-8 text-xs bg-white border-gray-300">
                            <SelectValue placeholder="Update Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="in-queue">Force In Queue</SelectItem>
                            <SelectItem value="in-interview">Force Interviewing</SelectItem>
                            <SelectItem value="completed">Force Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-12 text-gray-500 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No students found matching the filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Dialog */}
      <Dialog open={isNotificationModalOpen} onOpenChange={setIsNotificationModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Notification</DialogTitle>
            <DialogDescription>
              Select a predefined message to send to {selectedStudentForNotification?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            {PREDEFINED_MESSAGES.map((msg, idx) => (
              <Button
                key={idx}
                variant="outline"
                className="justify-start h-auto py-3 px-4 text-left font-normal whitespace-normal w-full"
                onClick={() => handleSendPredefinedNotification(msg)}
                disabled={notifyLoading}
              >
                <div className="flex gap-2 w-full">
                  <span className="text-gray-500 font-medium shrink-0">{idx + 1}.</span>
                  <span className="text-gray-800 flex-1">{msg}</span>
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!forceActionType && !!forceActionStudent} onOpenChange={(open) => !open && resetForceAction()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {forceActionType === "in-interview" ? "Force Interviewing" : "Force In Queue"}
            </DialogTitle>
            <DialogDescription>
              {forceActionType === "in-interview"
                ? `Choose an available panel for ${forceActionStudent?.name}.`
                : `Choose which round queue ${forceActionStudent?.name} should be added to.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {forceActionType === "in-interview" ? (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Available Panel</label>
                <Select value={forcePanelSelection} onValueChange={(value) => {
                  setForcePanelSelection(value);
                  const selectedPanel = panels.find((panel) => panel.id === value);
                  if (selectedPanel) setForceRoundSelection(String(selectedPanel.currentRound || 1));
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a panel" />
                  </SelectTrigger>
                  <SelectContent>
                    {panels.filter((panel) => panel.status === "unoccupied").map((panel) => (
                      <SelectItem key={panel.id} value={panel.id}>
                        {panel.name} • Round {panel.currentRound} • {panel.room}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Round Queue</label>
                <Select value={forceRoundSelection} onValueChange={setForceRoundSelection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Round" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: Math.max(company?.totalRounds || 0, 3) }, (_, i) => i + 1).map((r) => (
                      <SelectItem key={r} value={r.toString()}>Round {r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={handleConfirmForceAction} disabled={forceActionLoading}>
              {forceActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
