import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/app/components/ui/dialog";
import {
  Building2, MapPin, Clock, CheckCircle, AlertCircle, Calendar,
  Search, Loader2, Users, Mic, LogIn, LogOut, Clock3, XCircle, Flag,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { studentApi } from "@/app/lib/api";
import { useSocket } from "@/app/socket-context";
import { toast } from "sonner";
import { useEffect as useDriveEffect } from "react";

interface Company {
  id: string;
  name: string;
  logo: string;
  role: string;
  venue: string;
  day: string;
  slot: string;
  queueStatus: string | null;
  queuePosition: number | null;
  priority: number;
  interviewDate: string;
  round: string;
  isWalkIn: boolean;
}

// Statuses that allow clicking Join Queue
const CAN_JOIN = [null, "not_joined", "exited", "rejected"];
// Statuses that show Exit Queue button
const CAN_EXIT = ["in_queue", "in_interview", "on_hold"];

export function StudentMyCompaniesPage() {
  const { socket } = useSocket();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDay, setSelectedDay] = useState("all");
  const [selectedSlot, setSelectedSlot] = useState("all");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  // companyId-round currently being actioned (shows spinner)
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ── Active Drive State ──
  const [driveDay, setDriveDay] = useState<number | null>(null);
  const [driveSlot, setDriveSlot] = useState<string | null>(null);

  // Queue switch confirmation modal
  const [switchModal, setSwitchModal] = useState<{
    fromCompanyId: string;
    fromCompanyName: string;
    fromRound: string;
    toCompanyId: string;
    toCompanyName: string;
    toRound: string;
    isWalkIn: boolean;
  } | null>(null);

  const normalizeCompany = (raw: any, i: number): Company => ({
    id: raw._id ?? raw.id ?? String(i),
    name: raw.name ?? "—",
    logo: raw.logo ?? "",
    role: raw.role ?? "",
    venue: raw.venue ?? "TBA",
    day: raw.day != null ? `Day ${raw.day}` : "—",
    slot: raw.slot ?? "—",
    queueStatus: raw.queueEntry?.status ?? null,
    queuePosition: raw.queueEntry?.position ?? null,
    priority: raw.priorityOrder ?? raw.order ?? i + 1,
    interviewDate: raw.interviewDate ?? "",
    round: raw.round ?? "Round 1",
    isWalkIn: !!raw.isWalkInEnabled,
  });

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const data: any = await studentApi.getMyCompanies();
      const list = Array.isArray(data) ? data : data.companies ?? data.shortlistedCompanies ?? [];
      setCompanies(list.map(normalizeCompany));
    } catch {
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  // ── Fetch drive state on mount ──
  useDriveEffect(() => {
    studentApi.getDriveState().then((ds: any) => {
      if (ds) { setDriveDay(ds.currentDay ?? null); setDriveSlot(ds.currentSlot ?? null); }
    }).catch(() => {});
  }, []);

  // Real-time refresh when status changes (COCO accepts/rejects)
  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchCompanies();
    socket.on("status:updated", refresh);
    socket.on("queue:updated", refresh);
    // Listen for drive state updates
    const handleDriveUpdate = (ds: any) => {
      if (ds) { setDriveDay(ds.currentDay ?? null); setDriveSlot(ds.currentSlot ?? null); }
    };
    socket.on("driveState:updated", handleDriveUpdate);
    return () => {
      socket.off("status:updated", refresh);
      socket.off("queue:updated", refresh);
      socket.off("driveState:updated", handleDriveUpdate);
    };
  }, [socket, fetchCompanies]);

  /* ─── Optimistic status update helper ─── */
  const optimisticUpdate = (companyId: string, round: string, newStatus: string | null) => {
    setCompanies(prev =>
      prev.map(c => (c.id === companyId && c.round === round) ? { ...c, queueStatus: newStatus } : c)
    );
  };

  /* ─── Join Queue ─── */
  const handleJoinQueue = async (company: Company) => {
    setActionLoading(`${company.id}-${company.round}`);
    // Optimistic: show pending immediately
    optimisticUpdate(company.id, company.round, "pending");
    try {
      await studentApi.joinQueue(company.id, company.round);
      toast.success(`Join request sent to ${company.name} (${company.round})!`, {
        description: "Waiting for COCO to accept your request.",
      });
    } catch (err: any) {
      const errData = (err as any).data;
      if (errData?.code === "QUEUE_CONFLICT" || (err as any).status === 409) {
        // Revert optimistic update
        optimisticUpdate(company.id, company.round, company.queueStatus);
        setSwitchModal({
          fromCompanyId: errData?.conflictCompanyId ?? "",
          fromCompanyName: errData?.conflictCompanyName ?? "another company",
          fromRound: errData?.conflictRound ?? "Round 1",
          toCompanyId: company.id,
          toCompanyName: company.name,
          toRound: company.round,
          isWalkIn: company.isWalkIn,
        });
      } else {
        // Revert and show friendly message
        optimisticUpdate(company.id, company.round, company.queueStatus);
        toast.error("Could not send join request", {
          description: err.message ?? "Please try again.",
        });
      }
    } finally {
      setActionLoading(null);
    }
  };

  /* ─── Exit Queue ─── */
  const handleLeaveQueue = async (company: Company) => {
    setActionLoading(`${company.id}-${company.round}`);
    const prevStatus = company.queueStatus;
    optimisticUpdate(company.id, company.round, "exited");
    try {
      await studentApi.leaveQueue(company.id, company.round);
      toast.success(`You have left the queue for ${company.name} (${company.round}).`);
    } catch (err: any) {
      optimisticUpdate(company.id, company.round, prevStatus);
      toast.error("Could not exit queue", { description: err.message ?? "Please try again." });
    } finally {
      setActionLoading(null);
    }
  };

  /* ─── Confirm Queue Switch ─── */
  const handleConfirmSwitch = async () => {
    if (!switchModal) return;
    const { fromCompanyId, fromRound, toCompanyId, toCompanyName, toRound, isWalkIn } = switchModal;
    setSwitchModal(null);
    setActionLoading(`${toCompanyId}-${toRound}`);
    // Optimistic: mark new as pending, old as exited
    optimisticUpdate(toCompanyId, toRound, "pending");
    optimisticUpdate(fromCompanyId, fromRound, "exited");
    try {
      await studentApi.confirmSwitch(fromCompanyId, toCompanyId, isWalkIn, fromRound, toRound);
      toast.success(`Switched to ${toCompanyName} (${toRound})!`, {
        description: "Waiting for COCO to accept your new request.",
      });
    } catch (err: any) {
      // Revert: re-fetch authoritative state
      await fetchCompanies();
      toast.error("Could not switch queues", { description: err.message ?? "Please try again." });
    } finally {
      setActionLoading(null);
    }
  };

  /* ─── Filters ─── */
  const uniqueDays = [...new Set(companies.map(c => c.day))].filter(Boolean);
  const filtered = companies.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      (c.name.toLowerCase().includes(q) || c.day.toLowerCase().includes(q) || (c.slot && c.slot.toLowerCase().includes(q))) &&
      (selectedDay === "all" || c.day === selectedDay) &&
      (selectedSlot === "all" || (c.slot && c.slot.toLowerCase() === selectedSlot))
    );
  });

  /* ─── Status Badge ─── */
  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "not_joined":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200"><Clock3 className="h-3 w-3 mr-1" />Yet to be Interviewed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock3 className="h-3 w-3 mr-1" />Requested</Badge>;
      case "in_queue":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><Users className="h-3 w-3 mr-1" />In Queue</Badge>;
      case "on_hold":
        return <Badge className="bg-red-100 text-red-800 border-red-200"><Flag className="h-3 w-3 mr-1" />Flagged</Badge>;
      case "in_interview":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200"><Mic className="h-3 w-3 mr-1" />Interviewing</Badge>;
      case "completed":
      case "offer_given":
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case "exited":
        return <Badge className="bg-gray-100 text-gray-600 border-gray-200"><LogOut className="h-3 w-3 mr-1" />Exited</Badge>;
      default:
        return null;
    }
  };

  /* ─── Action Button ─── */
  const getActionButton = (company: Company) => {
    const busy = actionLoading === `${company.id}-${company.round}`;
    const s = company.queueStatus;

    if (CAN_JOIN.includes(s)) {
      // STRICT: Only show Join Queue if BOTH day AND slot match active drive state
      // If drive state is not loaded yet, hide the button (fail-safe)
      if (driveDay == null || !driveSlot) return null;

      const companyDayNum = parseInt(company.day.replace("Day ", ""), 10);
      const isActiveDay = !isNaN(companyDayNum) && companyDayNum === driveDay;
      const isActiveSlot = company.slot.toLowerCase() === driveSlot.toLowerCase();

      if (!isActiveDay || !isActiveSlot) return null;

      return (
        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[110px]"
          onClick={() => handleJoinQueue(company)} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogIn className="h-4 w-4 mr-1" />Join Queue</>}
        </Button>
      );
    }
    if (s === "pending") {
      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center text-sm font-medium text-yellow-700 bg-yellow-50 border border-yellow-300 rounded-md h-9 px-3">
            <Clock3 className="h-4 w-4 mr-1" />Requested
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50 h-9 px-3"
                disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                Cancel
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel Queue Request?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to cancel your queue request for {company.name}?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>No, keep it</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleLeaveQueue(company)} className="bg-red-600 focus:ring-red-600 hover:bg-red-700">
                  Yes, cancel request
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
    }
    if (s === "in_queue" || s === "on_hold") {
      return (
        <div className="flex items-center gap-3">
          <div className={`flex flex-col items-center rounded-md px-3 py-1 mr-2 ${
            s === "on_hold" ? "bg-red-50 border border-red-200" : "bg-blue-50 border border-blue-200"
          }`}>
            <span className={`text-[10px] uppercase font-bold tracking-wider ${
              s === "on_hold" ? "text-red-600" : "text-blue-600"
            }`}>
              {s === "on_hold" ? "Flagged" : "Position"}
            </span>
            <span className={`text-lg font-black leading-none mt-0.5 ${
              s === "on_hold" ? "text-red-900" : "text-blue-900"
            }`}>
              {company.queuePosition ? `#${company.queuePosition}` : "—"}
            </span>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50 min-w-[110px] h-10"
                disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogOut className="h-4 w-4 mr-1" />Exit Queue</>}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Exit Queue?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to leave the queue for {company.name}? You will lose your current position.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleLeaveQueue(company)} className="bg-red-600 focus:ring-red-600 hover:bg-red-700">
                  Yes, leave queue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
    }
    if (s === "in_interview") {
      return (
        <div className="flex items-center text-sm font-medium text-orange-700 bg-orange-50 border border-orange-300 rounded-md h-9 px-3">
          <Mic className="h-4 w-4 mr-1" />In Interview (Locked)
        </div>
      );
    }
    if (CAN_EXIT.includes(s ?? "")) {
      return (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50 min-w-[110px]"
              disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogOut className="h-4 w-4 mr-1" />Exit Queue</>}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Exit Queue?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to leave the queue for {company.name}? You will lose your current position.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleLeaveQueue(company)} className="bg-red-600 focus:ring-red-600 hover:bg-red-700">
                Yes, leave queue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    }
    return null;
  };

  /* ─── Card highlight ─── */
  const getCardClass = (status: string | null) => {
    switch (status) {
      case "pending":
        return "border-yellow-300 bg-yellow-50/40 shadow-sm";
      case "in_queue":
        return "border-blue-300 bg-blue-50/40 shadow-sm";
      case "on_hold":
        return "border-red-300 bg-red-50/40 shadow-sm";
      case "in_interview":
        return "border-orange-300 bg-orange-50/30 shadow-sm";
      case "completed":
      case "offer_given":
        return "border-green-300 bg-green-50/30 shadow-sm";
      default:
        return "hover:shadow-md";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 gap-2">
        <Loader2 className="h-6 w-6 animate-spin" /> Loading your companies…
      </div>
    );
  }

  const flaggedCompanies = companies.filter(c => c.queueStatus === "on_hold");

  return (
    <div className="space-y-6">
      {flaggedCompanies.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4 flex items-start gap-3 shadow-sm">
          <AlertCircle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-red-800 font-bold text-lg mb-1">Queue Action Required: You have been flagged!</h3>
            <p className="text-red-700">
              The coordinator has flagged your absence for: <strong>{flaggedCompanies.map(c => c.name).join(", ")}</strong>. Please report to the venue immediately.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Building2 className="h-8 w-8 mr-3 text-indigo-600" />
          My Companies
        </h1>
        <Badge className="bg-indigo-100 text-indigo-800 text-sm px-4 py-2">
          {companies.length} Shortlisted
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input placeholder="Search by company name, day or slot…" value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={selectedDay} onValueChange={setSelectedDay}>
              <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="All Days" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Days</SelectItem>
                {uniqueDays.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedSlot} onValueChange={setSelectedSlot}>
              <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="All Slots" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Slots</SelectItem>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="afternoon">Afternoon</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Info note */}
      {companies.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Click <em>Join Queue</em> to send a request — the COCO will accept or reject it.
              You can only be active in one queue at a time.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Company Cards */}
      <div className="space-y-4">
        {filtered.map(company => (
          <Card key={`${company.id}-${company.round}`} className={`transition-all ${getCardClass(company.queueStatus)}`}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start space-x-3 flex-1">
                  {/* Logo */}
                  <div className="h-12 w-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                    {company.logo ? (
                      <img src={company.logo} alt={company.name} className="h-8 w-8 object-contain"
                        onError={e => {
                          const t = e.currentTarget; t.style.display = "none";
                          const s = document.createElement("span");
                          s.className = "text-lg font-bold text-gray-700";
                          s.textContent = company.name.charAt(0);
                          t.parentElement?.appendChild(s);
                        }} />
                    ) : (
                      <span className="text-lg font-bold text-gray-700">{company.name.charAt(0)}</span>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <CardTitle className="text-xl text-gray-900">{company.name}</CardTitle>
                      <Badge variant="outline" className="text-xs">{company.round}</Badge>
                      {company.isWalkIn && <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Walk-in</Badge>}
                      {getStatusBadge(company.queueStatus)}
                    </div>
                    {company.role && <p className="text-sm text-gray-500">{company.role}</p>}
                  </div>
                </div>
                {/* Action button */}
                <div className="shrink-0">
                  {getActionButton(company)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-3 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                  {company.venue}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                  {company.day} — {company.slot.charAt(0).toUpperCase() + company.slot.slice(1)}
                </div>
                {company.interviewDate && (
                  <div className="flex items-center gap-2 md:col-span-2">
                    <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                    {new Date(company.interviewDate).toLocaleDateString("en-IN", {
                      weekday: "long", year: "numeric", month: "long", day: "numeric",
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card className="bg-gray-50">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {companies.length === 0
                ? "You haven't been shortlisted for any companies yet."
                : "No companies match your search."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Queue Switch Confirmation Modal */}
      <Dialog open={!!switchModal} onOpenChange={() => setSwitchModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch Your Queue Request?</DialogTitle>
            <DialogDescription className="text-base leading-relaxed pt-2">
              You already have an active request for{" "}
              <strong className="text-gray-900">{switchModal?.fromCompanyName} ({switchModal?.fromRound})</strong>.
              <br /><br />
              Joining <strong className="text-gray-900">{switchModal?.toCompanyName} ({switchModal?.toRound})</strong> will
              cancel your previous request. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSwitchModal(null)}>
              Keep Current
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleConfirmSwitch}
              disabled={actionLoading !== null}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Yes, Switch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
