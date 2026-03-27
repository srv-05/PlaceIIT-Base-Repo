import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { Label } from "@/app/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { ArrowLeft, UserPlus, Users, Clock, CheckCircle, AlertCircle, Upload, Loader2, Flag, PlayCircle, Bell, XCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { cocoApi } from "@/app/lib/api";
import { useSocket } from "@/app/socket-context";
import { toast } from "sonner";

interface Student {
  id: string;
  name: string;
  rollNo: string;
  status: "in-queue" | "yet-to-interview" | "in-interview" | "completed" | "on-hold";
  round: number;
  position: number;
}

interface Panel {
  _id: string;
  panelName: string;
  interviewers: string[];
  venue?: string;
}

interface RoundTrackingPageProps {
  companyName: string;
  onBack: () => void;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "in-queue":
      return <Badge className="bg-blue-50 text-blue-600 border-blue-200 font-normal"><Clock className="h-3 w-3 mr-1" />In Queue</Badge>;
    case "yet-to-interview":
      return <Badge className="bg-purple-50 text-purple-600 border-purple-200 font-normal"><Clock className="h-3 w-3 mr-1" />Yet to be Interview</Badge>;
    case "in-interview":
      return <Badge className="bg-yellow-50 text-yellow-600 border-yellow-200 font-normal"><AlertCircle className="h-3 w-3 mr-1" />In Interview</Badge>;
    case "completed":
      return <Badge className="bg-green-50 text-green-600 border-green-200 font-normal"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
    case "on-hold":
      return <Badge className="bg-gray-100 text-gray-500 border-gray-200 font-normal"><Flag className="h-3 w-3 mr-1" />Flagged</Badge>;
    default: return null;
  }
};

const StudentCard = ({
  student,
  index,
  isFlagged = false,
  onFlag,
  onResume,
  onComplete,
}: {
  student: Student;
  index?: number;
  isFlagged?: boolean;
  onFlag?: (id: string) => void;
  onResume?: (id: string) => void;
  onComplete?: (id: string) => void;
}) => {
  return (
    <Card className={`mb-3 border-gray-200 transition-all ${isFlagged ? "bg-gray-50/50" : "hover:border-gray-300"}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 flex items-start gap-3">
            {index !== undefined && !isFlagged ? (
              <span className="text-gray-900 font-semibold text-sm pt-0.5 w-5 shrink-0">#{index + 1}</span>
            ) : isFlagged ? (
              <span className="text-gray-400 font-bold text-sm pt-0.5 w-5 shrink-0">—</span>
            ) : null}
            <div>
              <p className={`font-semibold text-sm ${isFlagged ? "text-gray-400 line-through" : "text-gray-900"}`}>
                {student.name}
              </p>
              <p className="text-xs text-gray-500 mt-1">{student.rollNo}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {getStatusBadge(isFlagged ? "on-hold" : student.status)}

            {student.status === "in-queue" && !isFlagged && onFlag && (
              <Button size="sm" variant="ghost" className="h-6 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 mt-1" onClick={() => onFlag(student.id)}>
                <Flag className="h-3 w-3 mr-1" /> Flag Absent
              </Button>
            )}

            {student.status === "in-queue" && !isFlagged && onComplete && (
              <Button size="sm" variant="ghost" className="h-6 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 px-2 mt-1" onClick={() => onComplete(student.id)}>
                <CheckCircle className="h-3 w-3 mr-1" /> Mark Done
              </Button>
            )}

            {isFlagged && onResume && (
              <Button size="sm" variant="outline" className="h-6 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200 px-2 mt-1" onClick={() => onResume(student.id)}>
                <PlayCircle className="h-3 w-3 mr-1" /> Resume
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export function RoundTrackingPage({ companyName, onBack }: RoundTrackingPageProps) {
  const { socket } = useSocket();
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState("");
  const [totalRounds, setTotalRounds] = useState(3);
  const [shortlisted, setShortlisted] = useState<Student[]>([]);
  const [studentsByRound, setStudentsByRound] = useState<Record<number, Student[]>>({});
  const [panelsByRound, setPanelsByRound] = useState<Record<number, Panel[]>>({});
  const [roundIds, setRoundIds] = useState<Record<number, string>>({});

  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [excelRound, setExcelRound] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pending requests state
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [pendingActionLoading, setPendingActionLoading] = useState<string | null>(null);

  // Manual Add states
  const [manualStatus, setManualStatus] = useState("yet-to-interview");
  const [manualStudentInput, setManualStudentInput] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  const deriveRoundNumber = (raw: any, fallbackRound = 1) => {
    const roundIdValue = raw.roundId ?? raw.queueEntry?.roundId;
    const roundNumberFromId = typeof roundIdValue === "object" ? roundIdValue?.roundNumber : undefined;
    if (typeof roundNumberFromId === "number") return roundNumberFromId;

    const roundLabel = raw.round ?? raw.queueEntry?.round;
    if (typeof roundLabel === "number") return roundLabel;
    if (typeof roundLabel === "string") {
      const match = roundLabel.match(/(\d+)/);
      if (match) return Number(match[1]);
    }

    return fallbackRound;
  };

  useEffect(() => {
    if (!manualStudentInput || selectedStudent?.name === manualStudentInput || selectedStudent?.rollNumber === manualStudentInput) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res: any = await cocoApi.searchStudents(manualStudentInput);
        const arr = Array.isArray(res) ? res : res.students ?? [];
        setSearchResults(arr);
        setShowDropdown(true);
      } catch (err) {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [manualStudentInput, selectedStudent]);

  const normalizeStudent = (raw: any, i: number, round: number): Student => {
    const statusRaw: string = raw.status ?? raw.queueEntry?.status ?? "in-queue";
    const statusMap: Record<string, Student["status"]> = {
      in_queue: "in-queue", waiting: "in-queue", "in-queue": "in-queue",
      not_joined: "yet-to-interview", "yet-to-interview": "yet-to-interview",
      in_interview: "in-interview", upcoming: "in-interview", "in-interview": "in-interview",
      completed: "completed", done: "completed",
      on_hold: "on-hold"
    };
    return {
      id: raw._id ?? raw.id ?? raw.student?._id ?? String(i),
      name: raw.name ?? raw.student?.name ?? "—",
      rollNo: raw.rollNumber ?? raw.student?.rollNumber ?? "—",
      status: statusMap[statusRaw] ?? "in-queue",
      round,
      position: raw.position ?? raw.queueEntry?.position ?? 0,
    };
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const companyRes: any = await cocoApi.getAssignedCompany();
      const arr = Array.isArray(companyRes) ? companyRes : (companyRes.companies || (companyRes.company ? [companyRes.company] : []));
      const companyObj = companyName
        ? arr.find((c: any) => (c.name ?? "").toLowerCase() === (companyName || "").toLowerCase()) ?? arr[0]
        : arr[0];

      if (!companyObj) {
        setLoading(false);
        return;
      }

      const cid = companyObj._id ?? companyObj.id ?? "";
      setCompanyId(cid);
      const rounds = Math.max(3, companyObj.totalRounds || 3);
      setTotalRounds(rounds);

      if (cid) {
        const shortlistedData: any = await cocoApi.getShortlistedStudents(cid).catch(() => []);
        const sListRaw = Array.isArray(shortlistedData) ? shortlistedData : shortlistedData.students ?? [];
        setShortlisted(sListRaw.map((s: any, i: number) => normalizeStudent(s, i, 0)));

        const roundsData: any = await cocoApi.getRounds(cid).catch(() => null);
        const byRound: Record<number, Student[]> = {};
        const panelsRoundMap: Record<number, Panel[]> = {};
        const rIds: Record<number, string> = {};

        for (let r = 1; r <= rounds; r++) {
          byRound[r] = [];
          panelsRoundMap[r] = [];
        }

        if (roundsData) {
          const roundsList = Array.isArray(roundsData) ? roundsData : roundsData.rounds ?? [];
          roundsList.forEach((rd: any) => {
            const rn = rd.roundNumber ?? rd.round ?? 1;
            const studs = (rd.students ?? []).filter((student: any) => {
              const queueStatus = student.status ?? student.queueEntry?.status;
              return !["pending", "rejected", "exited"].includes(queueStatus);
            });
            byRound[rn] = studs.map((s: any, i: number) => normalizeStudent(s, i, rn));

            if (rd.panels && Array.isArray(rd.panels)) {
              panelsRoundMap[rn] = rd.panels;
            }
            if (rd._id) rIds[rn] = rd._id;
          });
        }

        const seenStudentIds = new Set(
          Object.values(byRound)
            .flat()
            .map((student) => `${student.id}-${student.round}`)
        );

        sListRaw.forEach((studentRaw: any, index: number) => {
          const queueStatus = studentRaw.queueEntry?.status;
          if (!queueStatus || queueStatus === "pending" || queueStatus === "rejected" || queueStatus === "exited") {
            return;
          }

          const inferredRound = deriveRoundNumber(studentRaw, 1);
          if (!byRound[inferredRound]) {
            byRound[inferredRound] = [];
          }

          const dedupeKey = `${studentRaw._id ?? studentRaw.id ?? studentRaw.student?._id ?? String(index)}-${inferredRound}`;
          if (seenStudentIds.has(dedupeKey)) {
            return;
          }

          byRound[inferredRound].push(normalizeStudent(studentRaw, index, inferredRound));
          seenStudentIds.add(dedupeKey);
        });

        Object.keys(byRound).forEach((roundKey) => {
          const roundNumber = Number(roundKey);
          byRound[roundNumber] = byRound[roundNumber].sort((a, b) => {
            if (a.status !== b.status) {
              const statusOrder = ["yet-to-interview", "in-queue", "on-hold", "in-interview", "completed"];
              return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
            }
            return a.position - b.position;
          });
        });

        setRoundIds(rIds);
        setStudentsByRound(byRound);
        setPanelsByRound(panelsRoundMap);
      }
    } catch {
      toast.error("Failed to load round data");
    } finally {
      setLoading(false);
    }
  }, [companyName]);

  const fetchPendingRequests = useCallback(async (cid: string) => {
    if (!cid) return;
    try {
      const data: any = await cocoApi.getPendingRequests(cid);
      setPendingRequests(Array.isArray(data) ? data : []);
    } catch {
      setPendingRequests([]);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Fetch pending requests whenever companyId is resolved
  useEffect(() => {
    if (companyId) fetchPendingRequests(companyId);
  }, [companyId, fetchPendingRequests]);

  useEffect(() => {
    if (!socket || !companyId) return;
    socket.emit("join:company", companyId);
    const refresh = () => fetchData();

    const handleQueueUpdated = (payload: any) => {
      if (payload?.action === "pending_request") {
        // Show COCO popup notification for incoming join request
        toast.info(`New queue request from ${payload.studentName ?? "a student"}`, {
          description: "Check the Pending Requests section to accept or reject.",
          duration: 6000,
        });
      }
      refresh();
      fetchPendingRequests(companyId);
    };

    socket.on("status:updated", refresh);
    socket.on("round:updated", refresh);
    socket.on("queue:updated", handleQueueUpdated);
    return () => {
      socket.off("status:updated", refresh);
      socket.off("round:updated", refresh);
      socket.off("queue:updated", handleQueueUpdated);
    };
  }, [socket, companyId, fetchData, fetchPendingRequests]);

  const handleManualAdd = async () => {
    if (!selectedStudent) return toast.error("Please explicitly select a student from the dropdown list");
    setUploadingExcel(true);
    try {
      const student = selectedStudent;

      await cocoApi.addStudentToRound({
        studentId: student._id || student.id,
        companyId,
        roundNumber: excelRound,
        ...(roundIds[excelRound] ? { roundId: roundIds[excelRound] } : {}),
      });

      if (manualStatus !== "in-queue") {
        await cocoApi.updateStudentStatus({
          studentId: student._id || student.id,
          companyId,
          status: manualStatus === 'yet-to-interview' ? 'not_joined' : (manualStatus === 'on-hold' ? 'on_hold' : manualStatus),
          round: `Round ${excelRound}`
        });
      }

      toast.success(`${student.name} added successfully!`);
      setManualStudentInput("");
      setSelectedStudent(null);
      setIsAddStudentOpen(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add student", {
        description: err.data?.conflictCompanyName
          ? `${selectedStudent?.name ?? "Student"} is already in ${err.data.conflictCompanyName}'s queue.`
          : undefined,
      });
    } finally {
      setUploadingExcel(false);
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingExcel(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("companyId", companyId);
      formData.append("roundNumber", String(excelRound));
      const result: any = await cocoApi.uploadRoundExcel(formData);
      toast.success(result.message || "Students uploaded!");
      if (result.notFound?.length > 0) {
        toast.warning(`Not found: ${result.notFound.join(", ")}`);
      }
      setIsAddStudentOpen(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to upload Excel");
    } finally {
      setUploadingExcel(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFlagAbsent = async (student: Student) => {
    try {
      await cocoApi.updateStudentStatus({ studentId: student.id, companyId, status: 'on_hold', round: `Round ${student.round}` });
      toast.success("Student flagged as absent.", { description: "They have been temporarily skipped." });
      fetchData();
    } catch {
      toast.error("Failed to flag student.");
    }
  };

  const handleResumeQueue = async (student: Student) => {
    try {
      await cocoApi.updateStudentStatus({ studentId: student.id, companyId, status: 'in_queue', round: `Round ${student.round}` });
      toast.success("Student resumed in queue!", { description: "Their original queue order has been restored." });
      fetchData();
    } catch {
      toast.error("Failed to resume student.");
    }
  };

  const handleMarkCompleted = async (student: Student) => {
    try {
      await cocoApi.markCompleted({ studentId: student.id, companyId, round: `Round ${student.round}` });
      toast.success("Student marked as completed!");
      fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to mark as completed");
    }
  };

  const handleAcceptRequest = async (entry: any) => {
    const studentId = entry.studentId?._id ?? entry.studentId;
    setPendingActionLoading(studentId);
    try {
      await cocoApi.acceptStudent({ studentId, companyId, round: entry.round });
      toast.success("Student accepted into the queue!");
      await fetchPendingRequests(companyId);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to accept student");
    } finally {
      setPendingActionLoading(null);
    }
  };

  const handleRejectRequest = async (entry: any) => {
    const studentId = entry.studentId?._id ?? entry.studentId;
    setPendingActionLoading(studentId);
    try {
      await cocoApi.rejectStudent({ studentId, companyId, round: entry.round });
      toast.success("Request rejected.");
      await fetchPendingRequests(companyId);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to reject student");
    } finally {
      setPendingActionLoading(null);
    }
  };

  const renderRoundColumn = (round: number) => {
    const students = studentsByRound[round] || [];

    const yetToInterview = students.filter((s) => s.status === "yet-to-interview").sort((a, b) => a.position - b.position);
    const inQueueActive = students.filter((s) => s.status === "in-queue").sort((a, b) => a.position - b.position);
    const inQueueFlagged = students.filter((s) => s.status === "on-hold").sort((a, b) => a.position - b.position);
    const inInterview = students.filter((s) => s.status === "in-interview").sort((a, b) => a.position - b.position);
    const completed = students.filter((s) => s.status === "completed").sort((a, b) => a.position - b.position);

    return (
      <Card className="flex-1 min-h-0 min-w-[350px] overflow-hidden flex flex-col bg-gray-50/10 border shadow-sm ring-1 ring-gray-100 h-full">
        <CardHeader className="bg-[#f8fafc] border-b shrink-0 py-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="font-bold text-gray-800">Round {round}</span>
            <Badge variant="secondary" className="bg-white border text-gray-700 font-medium px-3 flex items-center shadow-sm">
              <Users className="h-3 w-3 mr-1.5 text-gray-400" />
              {students.length} Students
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 min-h-0 overflow-y-auto flex flex-col p-5 pb-12 custom-scrollbar space-y-2">

          {/* In Queue */}
          <h3 className="text-sm font-semibold text-blue-600 flex items-center mb-2 mt-1">
            <Clock className="h-4 w-4 mr-1.5" /> In Queue ({inQueueActive.length + inQueueFlagged.length})
          </h3>
          {inQueueActive.length === 0 && inQueueFlagged.length === 0 && (
            <div className="text-center py-5 text-xs text-gray-400 border border-dashed rounded-lg bg-gray-50/50">Empty</div>
          )}
          {inQueueActive.map((s, idx) => (
            <StudentCard key={s.id} student={s} index={idx} onFlag={() => handleFlagAbsent(s)} onComplete={() => handleMarkCompleted(s)} />
          ))}
          {inQueueFlagged.map((s) => (
            <StudentCard key={s.id} student={s} isFlagged onResume={() => handleResumeQueue(s)} />
          ))}

          {/* In Interview */}
          <h3 className="text-sm font-semibold text-yellow-600 flex items-center mt-6 mb-2">
            <AlertCircle className="h-4 w-4 mr-1.5" /> In Interview ({inInterview.length})
          </h3>
          {inInterview.length === 0 && (
            <div className="text-center py-5 text-xs text-gray-400 border border-dashed rounded-lg bg-gray-50/50">Empty</div>
          )}
          {inInterview.map((s) => (
            <StudentCard key={s.id} student={s} />
          ))}

          {/* Completed */}
          <h3 className="text-sm font-semibold text-green-600 flex items-center mt-6 mb-2">
            <CheckCircle className="h-4 w-4 mr-1.5" /> Completed ({completed.length})
          </h3>
          {completed.length === 0 && (
            <div className="text-center py-5 text-xs text-gray-400 border border-dashed rounded-lg bg-gray-50/50">Empty</div>
          )}
          {completed.map((s) => (
            <StudentCard key={s.id} student={s} />
          ))}

          {/* Yet to be Interviewed (Unassigned) */}
          <h3 className="text-sm font-semibold text-purple-600 flex items-center mt-6 mb-2">
            <Clock className="h-4 w-4 mr-1.5" /> Yet to be Interviewed ({yetToInterview.length})
          </h3>
          {yetToInterview.length === 0 && (
            <div className="text-center py-5 text-xs text-gray-400 border border-dashed rounded-lg bg-gray-50/50">Empty</div>
          )}
          {yetToInterview.map((s) => (
            <StudentCard key={s.id} student={s} index={undefined} />
          ))}

        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 gap-3">
        <Loader2 className="h-6 w-6 animate-spin" /> <span className="font-medium">Loading tracking board…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" className="hover:bg-gray-100" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Round Tracking</h1>
            <p className="text-sm font-medium text-gray-500 mt-1">{companyName}</p>
          </div>
        </div>
        <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700 shadow-sm"><UserPlus className="h-4 w-4 mr-2" />Add Students</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Students to Round</DialogTitle>
              <DialogDescription>Add students manually or upload an Excel file</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="manual" className="w-full pt-4">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                <TabsTrigger value="excel">Excel Upload</TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-4">
                <div className="space-y-2">
                  <Label>Round</Label>
                  <Select value={String(excelRound)} onValueChange={(v) => setExcelRound(parseInt(v))}>
                    <SelectTrigger className="bg-gray-50"><SelectValue placeholder="Select Round" /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: totalRounds }, (_, i) => i + 1).map((r) => (
                        <SelectItem key={r} value={String(r)}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-500">Status</Label>
                  <Select value={manualStatus} onValueChange={setManualStatus} disabled>
                    <SelectTrigger className="bg-gray-100 cursor-not-allowed text-gray-500">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yet-to-interview">Yet to be Interviewed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 relative">
                  <Label>Student Name or Roll Number</Label>
                  <Input
                    placeholder="Search by name or roll number"
                    className="bg-gray-50"
                    value={manualStudentInput}
                    onChange={(e) => {
                      setManualStudentInput(e.target.value);
                      setSelectedStudent(null);
                    }}
                    onFocus={() => {
                      if (searchResults.length > 0) setShowDropdown(true);
                    }}
                    onBlur={() => {
                      // Delay hiding dropdown so click can register
                      setTimeout(() => setShowDropdown(false), 200);
                    }}
                  />
                  {showDropdown && searchResults.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1 top-[60px]">
                      {searchResults.map((s) => (
                        <div
                          key={s._id}
                          className="px-4 py-2 hover:bg-green-50 cursor-pointer border-b last:border-0"
                          onClick={() => {
                            setSelectedStudent(s);
                            setManualStudentInput(`${s.name} (${s.rollNumber})`);
                            setShowDropdown(false);
                          }}
                        >
                          <div className="font-medium text-gray-900">{s.name}</div>
                          <div className="text-xs text-gray-500">{s.rollNumber} • {s.email || "No email"}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={handleManualAdd}
                  disabled={uploadingExcel}
                >
                  {uploadingExcel ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Add Student
                </Button>
              </TabsContent>

              <TabsContent value="excel" className="space-y-4">
                <div className="space-y-2">
                  <Label>Round</Label>
                  <Select value={String(excelRound)} onValueChange={(v) => setExcelRound(parseInt(v))}>
                    <SelectTrigger className="bg-gray-50">
                      <SelectValue placeholder="Select Round" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: totalRounds }, (_, i) => i + 1).map((r) => (
                        <SelectItem key={r} value={String(r)}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors bg-gray-50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700 mb-1">Click to browse or drag and drop</p>
                  <p className="text-xs text-gray-500">Excel file (.xlsx or .xls)</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls"
                    onChange={handleExcelUpload}
                  />
                </div>
                <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-800 border border-blue-100">
                  <strong>Format requirement:</strong> The Excel file must contain a column named exactly <code>Roll Number</code>.
                </div>
                {uploadingExcel && (
                  <div className="flex items-center justify-center gap-2 text-indigo-600 font-medium text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" /> Uploading securely…
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pending Requests Panel */}
      {pendingRequests.length > 0 && (
        <Card className="bg-yellow-50 border-yellow-200 shrink-0">
          <CardHeader className="py-3 border-b border-yellow-200">
            <CardTitle className="text-base flex items-center gap-2 text-yellow-800">
              <Bell className="h-4 w-4" />
              Pending Join Requests ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pendingRequests.map((entry: any) => {
                const student = entry.studentId ?? {};
                const sid = student._id ?? entry.studentId;
                const isActioning = pendingActionLoading === String(sid);
                return (
                  <div key={entry._id} className="flex items-center justify-between bg-white rounded-lg border border-yellow-200 px-4 py-3 shadow-sm">
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{student.name ?? "—"}</p>
                      <p className="text-xs text-gray-500">{student.rollNumber ?? ""}</p>
                      {entry.isWalkIn && <span className="text-xs text-green-600 font-medium">Walk-in</span>}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 h-7 px-2 text-xs"
                        onClick={() => handleAcceptRequest(entry)}
                        disabled={isActioning}
                      >
                        {isActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-300 hover:bg-red-50 h-7 px-2 text-xs"
                        onClick={() => handleRejectRequest(entry)}
                        disabled={isActioning}
                      >
                        {isActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3 mr-1" />}
                        Reject
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-1 overflow-x-auto min-h-0 pt-2 pb-4 scroll-smooth">
        <div className="flex flex-1 w-full gap-6">
          {Array.from({ length: Math.min(totalRounds, 5) }, (_, i) => i + 1).map((round) => (
            <div key={round} className="flex-1 h-full min-h-0 flex flex-col">{renderRoundColumn(round)}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
