import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/app/components/ui/dialog";
import { Label } from "@/app/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { ArrowLeft, UserPlus, Users, Clock, CheckCircle, AlertCircle, Upload, Loader2 } from "lucide-react";
import { cocoApi } from "@/app/lib/api";
import { toast } from "sonner";

interface Student {
  id: string;
  name: string;
  rollNo: string;
  status: "in-queue" | "yet-to-interview" | "completed";
  round: number;
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
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [addMethod, setAddMethod] = useState<"manual" | "excel">("manual");
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState("");
  const [totalRounds, setTotalRounds] = useState(3);
  const [studentsByRound, setStudentsByRound] = useState<Record<number, Student[]>>({});
  const [panelsByRound, setPanelsByRound] = useState<Record<number, Panel[]>>({});

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
      const rounds = companyObj.totalRounds ?? 3;
      setTotalRounds(rounds);

      if (cid) {
        const roundsData: any = await cocoApi.getRounds(cid).catch(() => null);
        const byRound: Record<number, Student[]> = {};
        const panelsRoundMap: Record<number, Panel[]> = {};
        
        for (let r = 1; r <= rounds; r++) {
          byRound[r] = [];
          panelsRoundMap[r] = [];
        }

        if (roundsData) {
          const roundsList = Array.isArray(roundsData) ? roundsData : roundsData.rounds ?? [];
          roundsList.forEach((rd: any) => {
            const rn = rd.roundNumber ?? rd.round ?? 1;
            const studs = rd.students ?? rd.shortlistedStudents ?? [];
            byRound[rn] = studs.map((s: any, i: number) => normalizeStudent(s, i, rn));
            
            if (rd.panels && Array.isArray(rd.panels)) {
              panelsRoundMap[rn] = rd.panels;
            }
          });
        }

        // Fallback: use shortlisted students for round 1 if rounds API didn't return data
        if (Object.values(byRound).every((arr) => arr.length === 0)) {
          const studentsData: any = await cocoApi.getShortlistedStudents(cid).catch(() => []);
          const sList = Array.isArray(studentsData) ? studentsData : studentsData.students ?? [];
          byRound[1] = sList.map((s: any, i: number) => normalizeStudent(s, i, 1));
        }

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in-queue":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs"><Clock className="h-3 w-3 mr-1" />In Queue</Badge>;
      case "yet-to-interview":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs"><AlertCircle className="h-3 w-3 mr-1" />Yet to Interview</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800 border-green-200 text-xs"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      default: return null;
    }
  };

  const renderStudentCard = (student: Student) => (
    <Card key={student.id} className="mb-3">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-medium text-gray-900">{student.name}</p>
            <p className="text-sm text-gray-600">{student.rollNo}</p>
          </div>
          {getStatusBadge(student.status)}
        </div>
      </CardContent>
    </Card>
  );

  const renderRoundColumn = (round: number) => {
    const students = studentsByRound[round] || [];
    const panels = panelsByRound[round] || [];
    
    const inQueue = students.filter((s) => s.status === "in-queue");
    const yetToInterview = students.filter((s) => s.status === "yet-to-interview");
    const completed = students.filter((s) => s.status === "completed");

    return (
      <Card className="h-full">
        <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
          <CardTitle className="flex items-center justify-between">
            <span>Round {round}</span>
            <Badge variant="outline">{students.length} Students</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {panels.length > 0 && (
            <div className="mb-6 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
              <h3 className="text-sm font-semibold text-indigo-800 mb-2 flex items-center">
                Interview Panels
              </h3>
              <div className="space-y-2">
                {panels.map(panel => (
                  <div key={panel._id} className="bg-white p-2 rounded border border-indigo-50 shadow-sm text-sm">
                    <div className="font-semibold text-indigo-900">{panel.panelName}</div>
                    {panel.interviewers && panel.interviewers.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        By: {panel.interviewers.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {inQueue.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-blue-700 mb-3 flex items-center"><Clock className="h-4 w-4 mr-2" />In Queue ({inQueue.length})</h3>
              {inQueue.map(renderStudentCard)}
            </div>
          )}
          {yetToInterview.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-yellow-700 mb-3 flex items-center"><AlertCircle className="h-4 w-4 mr-2" />Yet to Interview ({yetToInterview.length})</h3>
              {yetToInterview.map(renderStudentCard)}
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-green-700 mb-3 flex items-center"><CheckCircle className="h-4 w-4 mr-2" />Completed ({completed.length})</h3>
              {completed.map(renderStudentCard)}
            </div>
          )}
          {students.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No students in this round</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 gap-2">
        <Loader2 className="h-6 w-6 animate-spin" /> Loading round data…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Round Tracking</h1>
            <p className="text-gray-600">{companyName}</p>
          </div>
        </div>
        <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700"><UserPlus className="h-4 w-4 mr-2" />Add Students</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Students to Round</DialogTitle>
              <DialogDescription>Add students manually or upload an Excel file</DialogDescription>
            </DialogHeader>
            <Tabs value={addMethod} onValueChange={(v) => setAddMethod(v as "manual" | "excel")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                <TabsTrigger value="excel">Excel Upload</TabsTrigger>
              </TabsList>
              <TabsContent value="manual" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Round</Label>
                  <Input type="number" min="1" max={totalRounds} defaultValue="1" />
                </div>
                <div className="space-y-2">
                  <Label>Student Name or Roll Number</Label>
                  <Input placeholder="Enter name or roll number" />
                </div>
                <Button className="w-full bg-green-600 hover:bg-green-700">Add Student</Button>
              </TabsContent>
              <TabsContent value="excel" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Round</Label>
                  <Input type="number" min="1" max={totalRounds} defaultValue="1" />
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600 mb-2">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-500">Excel file with student details</p>
                  <input type="file" className="hidden" accept=".xlsx,.xls" />
                  <Button variant="outline" className="mt-3">Choose File</Button>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg text-xs text-gray-700">
                  <strong>Format:</strong> Excel file should have columns: Name, Roll Number
                </div>
                <Button className="w-full bg-green-600 hover:bg-green-700">Upload & Add Students</Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {Array.from({ length: Math.min(totalRounds, 5) }, (_, i) => i + 1).map((round) => (
          <div key={round}>{renderRoundColumn(round)}</div>
        ))}
      </div>
    </div>
  );
}