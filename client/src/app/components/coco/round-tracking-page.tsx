import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { Label } from "@/app/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { ArrowLeft, UserPlus, Users, Clock, CheckCircle, AlertCircle, Upload, Loader2, Flag, PlayCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { cocoApi } from "@/app/lib/api";
import { useSocket } from "@/app/socket-context";
import { toast } from "sonner";

interface Student {
  id: string;
  name: string;
  rollNo: string;
  status: "in-queue" | "yet-to-interview" | "completed" | "on-hold";
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
      return <Badge className="bg-yellow-50 text-yellow-600 border-yellow-200 font-normal"><AlertCircle className="h-3 w-3 mr-1" />Yet to Interview</Badge>;
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
  onResume
}: {
  student: Student;
  index?: number;
  isFlagged?: boolean;
  onFlag?: (id: string) => void;
  onResume?: (id: string) => void;
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

  // Manual Add states
  const [manualStatus, setManualStatus] = useState("yet-to-interview");
  const [manualStudentInput, setManualStudentInput] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

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
      not_joined: "yet-to-interview", in_interview: "yet-to-interview", upcoming: "yet-to-interview", "yet-to-interview": "yet-to-interview",
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
            const studs = rd.students ?? [];
            byRound[rn] = studs.map((s: any, i: number) => normalizeStudent(s, i, rn));

            if (rd.panels && Array.isArray(rd.panels)) {
              panelsRoundMap[rn] = rd.panels;
            }
            if (rd._id) rIds[rn] = rd._id;
          });
        }
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

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!socket || !companyId) return;
    socket.emit("join:company", companyId);
    const refresh = () => fetchData();
    socket.on("status:updated", refresh);
    socket.on("round:updated", refresh);
    socket.on("queue:updated", refresh);
    return () => {
      socket.off("status:updated", refresh);
      socket.off("round:updated", refresh);
      socket.off("queue:updated", refresh);
    };
  }, [socket, companyId, fetchData]);

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
          status: manualStatus === 'yet-to-interview' ? 'in_interview' : (manualStatus === 'on-hold' ? 'on_hold' : manualStatus)
        });
      }

      toast.success(`${student.name} added successfully!`);
      setManualStudentInput("");
      setSelectedStudent(null);
      setIsAddStudentOpen(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add student");
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

  const handleFlagAbsent = async (studentId: string) => {
    try {
      await cocoApi.updateStudentStatus({
        studentId,
        companyId,
        status: 'on_hold'
      });
      toast.success("Student flagged as absent.", { description: "They have been temporarily skipped." });
      fetchData();
    } catch {
      toast.error("Failed to flag student.");
    }
  };

  const handleResumeQueue = async (studentId: string) => {
    try {
      await cocoApi.updateStudentStatus({
        studentId,
        companyId,
        status: 'in_queue'
      });
      toast.success("Student resumed in queue!", { description: "Their original queue order has been restored." });
      fetchData();
    } catch {
      toast.error("Failed to resume student.");
    }
  };

  const renderRoundColumn = (round: number) => {
    const students = studentsByRound[round] || [];

    const inQueueActive = students.filter((s) => s.status === "in-queue").sort((a, b) => a.position - b.position);
    const inQueueFlagged = students.filter((s) => s.status === "on-hold").sort((a, b) => a.position - b.position);
    const yetToInterview = students.filter((s) => s.status === "yet-to-interview").sort((a, b) => a.position - b.position);
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
            <StudentCard key={s.id} student={s} index={idx} onFlag={handleFlagAbsent} />
          ))}
          {inQueueFlagged.map((s) => (
            <StudentCard key={s.id} student={s} isFlagged onResume={handleResumeQueue} />
          ))}

          {/* Yet to Interview */}
          <h3 className="text-sm font-semibold text-yellow-600 flex items-center mt-6 mb-2">
            <AlertCircle className="h-4 w-4 mr-1.5" /> Yet to Interview ({yetToInterview.length})
          </h3>
          {yetToInterview.length === 0 && (
            <div className="text-center py-5 text-xs text-gray-400 border border-dashed rounded-lg bg-gray-50/50">Empty</div>
          )}
          {yetToInterview.map((s) => (
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
                      <SelectItem value="yet-to-interview">Yet to Interview</SelectItem>
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