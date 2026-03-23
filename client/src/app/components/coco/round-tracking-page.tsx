import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/app/components/ui/dialog";
import { Label } from "@/app/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { ArrowLeft, UserPlus, Users, Clock, CheckCircle, AlertCircle, Upload, Loader2, Plus, Search } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/app/components/ui/select";
import { cocoApi } from "@/app/lib/api";
import { useSocket } from "@/app/socket-context";
import { toast } from "sonner";

interface Student {
  id: string;
  name: string;
  rollNo: string;
  status: "in-queue" | "yet-to-interview" | "completed";
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
  
  // Search states for Not In Queue per round
  const [searchByRound, setSearchByRound] = useState<Record<number, string>>({});
  
  const [addingStudent, setAddingStudent] = useState<string | null>(null);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [excelRound, setExcelRound] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const normalizeStudent = (raw: any, i: number, round: number): Student => {
    const statusRaw: string = raw.status ?? raw.queueEntry?.status ?? "in-queue";
    const statusMap: Record<string, Student["status"]> = {
      in_queue: "in-queue", waiting: "in-queue", "in-queue": "in-queue",
      in_interview: "yet-to-interview", upcoming: "yet-to-interview", "yet-to-interview": "yet-to-interview",
      completed: "completed", done: "completed",
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
      const companyObj = Array.isArray(companyRes)
        ? companyRes.find((c: any) => (c.name ?? "").toLowerCase() === companyName.toLowerCase()) ?? companyRes[0]
        : companyRes.company ?? companyRes;

      if (!companyObj) {
        setLoading(false);
        return;
      }

      const cid = companyObj._id ?? companyObj.id ?? "";
      setCompanyId(cid);
      const rounds = Math.max(companyObj.totalRounds || 3, 3); // Force minimum 3 rounds visually
      setTotalRounds(rounds);

      if (cid) {
        // Fetch all shortlisted students to compute "Not in queue" logic
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
            // Remove the shortlisted fallback; explicitly map only Queue entries (rd.students).
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

  // ── Real-time updates ─────────────────────────────────────────────────────
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
  // ─────────────────────────────────────────────────────────────────────────

  const handleAddStudentToRound = async (studentId: string, specificRound: number) => {
    setAddingStudent(studentId);
    try {
      await cocoApi.addStudentToRound({
        studentId,
        companyId,
        roundNumber: specificRound,
        ...(roundIds[specificRound] ? { roundId: roundIds[specificRound] } : {}),
      });
      toast.success(`Student added to Round ${specificRound}!`);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add student to round");
    } finally {
      setAddingStudent(null);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in-queue":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs"><Clock className="h-3 w-3 mr-1" />In Queue</Badge>;
      case "yet-to-interview":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs"><AlertCircle className="h-3 w-3 mr-1" />Interviewing</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800 border-green-200 text-xs"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      default: return null;
    }
  };

  const renderStudentCard = (student: Student, isNotInQueue = false, targetRound = 1, displayIndex?: number) => (
    <Card key={student.id} className="mb-3 border-gray-200 transition-all hover:border-gray-300">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-medium text-gray-900 text-sm">
              {!isNotInQueue && (displayIndex || student.position > 0) && (
                <span className="text-indigo-600 font-bold mr-2 text-xs">#{displayIndex ?? student.position}</span>
              )}
              {student.name}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{student.rollNo}</p>
          </div>
          {isNotInQueue ? (
            <Button 
               size="sm" 
               variant="outline" 
               className="h-7 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
               onClick={() => handleAddStudentToRound(student.id, targetRound)}
               disabled={addingStudent === student.id}
            >
               {addingStudent === student.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Plus className="h-3 w-3 mr-1" />Add</>}
            </Button>
          ) : getStatusBadge(student.status)}
        </div>
      </CardContent>
    </Card>
  );

  const getNotInQueue = (round: number) => {
    const queuedHere = studentsByRound[round] || [];
    
    if (round === 1) {
      // For round 1, anyone shortlisted who isn't physically in round 1's queue
      return shortlisted.filter(s => !queuedHere.find(q => q.id === s.id));
    } else {
      // Auto-promotion UI is intentionally disabled per user request. 
      // Coordinators will manually dispatch valid candidates to downstream rounds explicitly.
      return [];
    }
  };

  const renderRoundColumn = (round: number) => {
    const students = studentsByRound[round] || [];
    const panels = panelsByRound[round] || [];

    const inQueue = students.filter((s) => s.status === "in-queue" || s.status === "yet-to-interview").sort((a, b) => a.position - b.position);
    const completed = students.filter((s) => s.status === "completed").sort((a, b) => a.position - b.position);
    
    let notInQueue = getNotInQueue(round);
    const currentSearch = searchByRound[round] || "";
    if (currentSearch.trim()) {
      const lowerQ = currentSearch.toLowerCase();
      notInQueue = notInQueue.filter(s => s.name.toLowerCase().includes(lowerQ) || s.rollNo.toLowerCase().includes(lowerQ));
    }

    return (
      <Card className="h-full flex flex-col bg-gray-50/30 border-0 shadow-sm ring-1 ring-gray-200">
        <CardHeader className="bg-white border-b shrink-0 pb-4">
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="font-bold text-gray-800">Round {round}</span>
            <Badge variant="secondary" className="bg-gray-100 text-gray-700">{students.length} Queued</Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {panels.length > 0 && (
            <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 shadow-sm">
              <h3 className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-2">Active Panels</h3>
              <div className="space-y-2">
                {panels.map(panel => (
                  <div key={panel._id} className="bg-white p-2 rounded border border-indigo-50 shadow-[0_1px_2px_rgba(0,0,0,0.02)] text-sm">
                    <div className="font-semibold text-indigo-900">{panel.panelName}</div>
                    {panel.venue && <div className="text-xs text-gray-500">{panel.venue}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Not In Queue Section */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3">
            <div className="flex items-center justify-between mb-3 border-b pb-2">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                 <Users className="h-4 w-4 mr-1.5 text-gray-400" />
                 Unassigned ({getNotInQueue(round).length})
              </h3>
            </div>
            
            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 h-3.5 w-3.5" />
                <Input 
                   placeholder="Search unassigned..." 
                   className="h-8 pl-8 text-xs bg-gray-50 border-gray-200"
                   value={searchByRound[round] || ""}
                   onChange={(e) => setSearchByRound(prev => ({...prev, [round]: e.target.value}))}
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              {notInQueue.map(s => renderStudentCard(s, true, round))}
              {notInQueue.length === 0 && (
                 <div className="text-center py-4 text-xs text-gray-400 bg-gray-50 rounded">
                    {currentSearch ? "No matches found." : "Everyone is assigned!"}
                 </div>
              )}
            </div>
          </div>

          {/* In Queue Section */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3">
            <div className="flex items-center justify-between mb-3 border-b pb-2">
              <h3 className="text-sm font-semibold text-blue-800 flex items-center">
                <Clock className="h-4 w-4 mr-1.5" />
                Live Queue ({inQueue.length})
              </h3>
            </div>
            <div className="space-y-1.5">
               {inQueue.map((s, idx) => renderStudentCard(s, false, round, idx + 1))}
               {inQueue.length === 0 && <div className="text-center py-6 text-xs text-gray-400 bg-gray-50 rounded border border-dashed border-gray-200">Queue is empty.</div>}
            </div>
          </div>

          {/* Completed Section */}
          {completed.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3">
               <div className="flex items-center justify-between mb-3 border-b pb-2">
                 <h3 className="text-sm font-semibold text-green-700 flex items-center">
                   <CheckCircle className="h-4 w-4 mr-1.5" />
                   Completed ({completed.length})
                 </h3>
               </div>
               <div className="space-y-1.5 opacity-75 hover:opacity-100 transition-opacity">
                 {completed.map((s, idx) => renderStudentCard(s, false, round, idx + 1))}
               </div>
            </div>
          )}
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
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Round Tracker</h1>
            <p className="text-sm font-medium text-gray-500 mt-1">{companyName} • Tracking {totalRounds} Rounds</p>
          </div>
        </div>
        <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-sm"><Upload className="h-4 w-4 mr-2" />External Upload</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Bulk Import to Queue</DialogTitle>
              <DialogDescription>Upload an Excel file to dump directly to a Round</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Destination Round</Label>
                <Select
                  value={String(excelRound)}
                  onValueChange={(v) => setExcelRound(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Round" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: totalRounds }, (_, i) => i + 1).map((r) => (
                      <SelectItem key={r} value={String(r)}>Round {r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto mb-3 text-indigo-400" />
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
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-3 flex-1 overflow-hidden min-h-0 pl-1 pb-2 scroll-smooth">
        {Array.from({ length: Math.max(totalRounds, 3) }, (_, i) => i + 1).map((round) => (
          <div key={round} className="h-full min-h-0">{renderRoundColumn(round)}</div>
        ))}
      </div>
    </div>
  );
}