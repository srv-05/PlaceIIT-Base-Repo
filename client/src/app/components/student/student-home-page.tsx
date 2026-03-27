import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/app/components/ui/dialog";

import {
  Search, Building2, MapPin, Clock, Users, CheckCircle,
  AlertCircle, Loader2, Mic, LogIn, LogOut, Clock3, XCircle, Flag
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
  totalInQueue?: number;
  currentQueue?: number;
  priority: number;
  round: string;
  isWalkin: boolean;
  isWalkinEligible: boolean;
}

const CAN_JOIN = [null, "not_joined", "exited", "rejected", "upcoming"];
const CAN_EXIT = ["in_queue", "in-queue", "in_interview", "on_hold"];

export function StudentHomePage() {
  const { socket } = useSocket();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRound, setSelectedRound] = useState("all");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [walkinCompanies, setWalkinCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const walkinRef = useRef<HTMLDivElement>(null);

  // Drive state
  const [driveDay, setDriveDay] = useState<number | null>(null);
  const [driveSlot, setDriveSlot] = useState<string | null>(null);

  const [switchModal, setSwitchModal] = useState<{
    fromCompanyId: string;
    fromCompanyName: string;
    fromRound: string;
    toCompanyId: string;
    toCompanyName: string;
    toRound: string;
    isWalkIn: boolean;
  } | null>(null);

  const normalizeCompany = (raw: any, index: number, isWalkin = false): Company => {
    const queueEntry = raw.queueEntry ?? raw.queue ?? null;
    let statusRaw = queueEntry?.status ?? raw.status ?? null;
    if (statusRaw === "upcoming") statusRaw = null;

    return {
      id: raw._id ?? raw.id ?? raw.company?._id ?? String(index),
      name: raw.name ?? raw.company?.name ?? "—",
      logo: raw.logo ?? raw.company?.logo ?? "",
      role: raw.role ?? "",
      venue: raw.venue ?? raw.company?.venue ?? "TBA",
      day: raw.day != null ? `Day ${raw.day}` : raw.company?.day != null ? `Day ${raw.company.day}` : "—",
      slot: raw.slot ?? raw.company?.slot ?? "—",
      queueStatus: statusRaw,
      queuePosition: queueEntry?.position ?? undefined,
      totalInQueue: raw.totalInQueue ?? undefined,
      currentQueue: raw.currentQueue ?? undefined,
      priority: raw.priorityOrder ?? raw.order ?? index + 1,
      round: raw.round ?? "Round 1",
      isWalkin,
      isWalkinEligible: raw.walkInEligible ?? true,
    };
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [companiesData, walkinData]: any[] = await Promise.all([
        studentApi.getCompanies(),
        studentApi.getWalkIns().catch(() => []),
      ]);

      const companyList = Array.isArray(companiesData)
        ? companiesData
        : companiesData.companies ?? companiesData.shortlistedCompanies ?? [];

      const walkinList = Array.isArray(walkinData)
        ? walkinData
        : walkinData.companies ?? [];

      setCompanies(companyList.map((c: any, i: number) => normalizeCompany(c, i, false)));
      setWalkinCompanies(walkinList.map((c: any, i: number) => normalizeCompany(c, i, true)));
    } catch (err: any) {
      toast.error("Failed to load companies", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Fetch drive state
  useEffect(() => {
    studentApi.getDriveState().then((data: any) => {
      setDriveDay(data.currentDay ?? null);
      setDriveSlot(data.currentSlot ?? null);
    }).catch(() => { });
  }, []);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchData();
    socket.on("status:updated", refresh);
    socket.on("queue:updated", refresh);
    socket.on("walkin:updated", refresh);
    return () => {
      socket.off("status:updated", refresh);
      socket.off("queue:updated", refresh);
      socket.off("walkin:updated", refresh);
    };
  }, [socket, fetchData]);

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

  const optimisticUpdate = (companyId: string, round: string, newStatus: string | null) => {
    setCompanies(prev => prev.map(c => (c.id === companyId && c.round === round) ? { ...c, queueStatus: newStatus } : c));
    setWalkinCompanies(prev => prev.map(c => (c.id === companyId && c.round === round) ? { ...c, queueStatus: newStatus } : c));
  };

  const handleJoinQueue = async (company: Company) => {
    if (company.isWalkin && !company.isWalkinEligible) {
      toast.error("You have already interviewed for this company and cannot join its walk-in queue again.");
      return;
    }

    setActionLoading(`${company.id}-${company.round}`);
    optimisticUpdate(company.id, company.round, "pending");
    try {
      if (company.isWalkin) {
        await studentApi.joinWalkInQueue(company.id, company.round);
      } else {
        await studentApi.joinQueue(company.id, company.round);
      }
      toast.success(`Join request sent to ${company.name} (${company.round})!`, { description: "Waiting for COCO to accept." });
    } catch (err: any) {
      const errData = err.data;
      if (errData?.code === "QUEUE_CONFLICT" || err.status === 409) {
        optimisticUpdate(company.id, company.round, company.queueStatus);
        setSwitchModal({
          fromCompanyId: errData?.conflictCompanyId ?? "",
          fromCompanyName: errData?.conflictCompanyName ?? "another company",
          fromRound: errData?.conflictRound ?? "Round 1",
          toCompanyId: company.id,
          toCompanyName: company.name,
          toRound: company.round,
          isWalkIn: company.isWalkin,
        });
      } else {
        optimisticUpdate(company.id, company.round, company.queueStatus);
        toast.error("Could not send join request", { description: err.message });
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeaveQueue = async (company: Company) => {
    setActionLoading(`${company.id}-${company.round}`);
    const prevStatus = company.queueStatus;
    optimisticUpdate(company.id, company.round, "exited");
    try {
      await studentApi.leaveQueue(company.id, company.round);
      toast.success(`You have left the queue for ${company.name} (${company.round}).`);
    } catch (err: any) {
      optimisticUpdate(company.id, company.round, prevStatus);
      toast.error("Could not exit queue", { description: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmSwitch = async () => {
    if (!switchModal) return;
    const { fromCompanyId, fromRound, toCompanyId, toCompanyName, toRound, isWalkIn } = switchModal;
    setSwitchModal(null);
    setActionLoading(`${toCompanyId}-${toRound}`);
    optimisticUpdate(toCompanyId, toRound, "pending");
    optimisticUpdate(fromCompanyId, fromRound, "exited");
    try {
      await studentApi.confirmSwitch(fromCompanyId, toCompanyId, isWalkIn, fromRound, toRound);
      toast.success(`Switched to ${toCompanyName} (${toRound})!`, { description: "Waiting for COCO to accept." });
    } catch (err: any) {
      await fetchData();
      toast.error("Could not switch queues", { description: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const scrollToWalkin = () => walkinRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "pending": return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock3 className="h-3 w-3 mr-1" />Requested</Badge>;
      case "in_queue":
      case "in-queue":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><Users className="h-3 w-3 mr-1" />In Queue</Badge>;
      case "on_hold":
        return <Badge className="bg-red-100 text-red-800 border-red-200"><Flag className="h-3 w-3 mr-1" />Flagged</Badge>;
      case "in_interview": return <Badge className="bg-orange-100 text-orange-800 border-orange-200"><Mic className="h-3 w-3 mr-1" />Interviewing</Badge>;
      case "completed":
      case "offer_given": return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case "rejected": return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case "exited": return <Badge className="bg-gray-100 text-gray-600 border-gray-200"><LogOut className="h-3 w-3 mr-1" />Exited</Badge>;
      default: return null;
    }
  };

  const getCardClass = (status: string | null) => {
    switch (status) {
      case "pending": return "border-yellow-300 bg-yellow-50/40 shadow-sm";
      case "in_queue":
      case "in-queue":
        return "border-blue-300 bg-blue-50/40 shadow-sm";
      case "on_hold":
        return "border-red-300 bg-red-50/40 shadow-sm";
      case "in_interview": return "border-orange-300 bg-orange-50/30 shadow-sm";
      case "completed":
      case "offer_given": return "border-green-300 bg-green-50/30 shadow-sm";
      default: return "hover:shadow-md";
    }
  };

  const renderCompanyCard = (company: Company) => {
    const s = company.queueStatus;
    const busy = actionLoading === `${company.id}-${company.round}`;
    const canJoin = CAN_JOIN.includes(s) && (!company.isWalkin || company.isWalkinEligible);

    return (
      <Card key={`${company.id}-${company.round}`} className={`transition-all ${getCardClass(s)}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start space-x-3 flex-1">
              <div className="h-12 w-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                {company.logo ? (
                  <img src={company.logo} alt={company.name} className="h-8 w-8 object-contain"
                    onError={(e) => {
                      const t = e.currentTarget; t.style.display = "none";
                      const span = document.createElement("span");
                      span.className = "text-lg font-bold text-gray-700";
                      span.textContent = company.name.charAt(0);
                      t.parentElement?.appendChild(span);
                    }} />
                ) : <span className="text-lg font-bold text-gray-700">{company.name.charAt(0)}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <CardTitle className="text-xl text-gray-900">{company.name}</CardTitle>
                  {!company.isWalkin && <Badge variant="outline" className="text-xs">{company.round}</Badge>}
                  {!company.isWalkin && <Badge variant="outline" className="text-xs">Priority {company.priority}</Badge>}
                  {getStatusBadge(s)}
                </div>
                {company.role && <p className="text-sm text-gray-600 mb-1">{company.role}</p>}
              </div>
            </div>
            {/* Header Action Button */}
            <div className="shrink-0 flex flex-col items-end gap-2">
              {canJoin && (
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[110px]"
                  onClick={() => handleJoinQueue(company)} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogIn className="h-4 w-4 mr-1" />Join Queue</>}
                </Button>
              )}
              {s === "pending" && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center text-sm font-medium text-yellow-700 bg-yellow-50 border border-yellow-300 rounded-md h-9 px-3">
                    <Clock3 className="h-4 w-4 mr-1" />Requested
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 h-9 px-3" disabled={busy}>
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
              )}
              {(s === "in_queue" || s === "in-queue" || s === "on_hold") && (
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
                      <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 min-w-[110px] h-10" disabled={busy}>
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
              )}
              {s === "in_interview" && (
                <div className="flex items-center text-sm font-medium text-orange-700 bg-orange-50 border border-orange-300 rounded-md h-9 px-3">
                  <Mic className="h-4 w-4 mr-1" />In Interview (Locked)
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm text-gray-600 w-full">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-400 shrink-0" /> {company.venue}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400 shrink-0" /> {company.day} — {company.slot.charAt(0).toUpperCase() + company.slot.slice(1)}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 mt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm">
                <Users className="h-4 w-4 mr-2 text-gray-600" />
                <span className="text-gray-700">Current Queue Count:</span>
              </div>
              <span className="font-semibold text-gray-700">{company.totalInQueue ?? 0} students</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const currentDay = driveDay ? `Day ${driveDay}` : (companies.length > 0 ? [...new Set(companies.map((c) => c.day))][0] : "Today");
  const slotOrder: Record<string, number> = { morning: 1, afternoon: 2 };
  const sortedCompanies = [...companies].sort((a, b) => {
    const dayA = parseInt(a.day.replace(/\D/g, "")) || 0;
    const dayB = parseInt(b.day.replace(/\D/g, "")) || 0;
    if (dayA !== dayB) return dayA - dayB;
    const slotA = slotOrder[a.slot.toLowerCase()] ?? 99;
    const slotB = slotOrder[b.slot.toLowerCase()] ?? 99;
    if (slotA !== slotB) return slotA - slotB;
    return a.priority - b.priority;
  });

  // Filter by active drive state day/slot
  const activeCompanies = sortedCompanies.filter((c) => {
    if (driveDay != null && c.day !== `Day ${driveDay}`) return false;
    if (driveSlot && c.slot !== driveSlot) return false;
    return true;
  });

  const filteredCompanies = activeCompanies.filter((c) => (
    (c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.role.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (selectedRound === "all" || c.round === selectedRound)
  ));
  const uniqueRounds = [...new Set([...companies, ...walkinCompanies].map((c) => c.round))].filter(Boolean).sort((a, b) => a.localeCompare(b));
  const flaggedCompanies = [...companies, ...walkinCompanies].filter(c => c.queueStatus === "on_hold");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
        <Loader2 className="h-6 w-6 animate-spin" /> Loading your companies…
      </div>
    );
  }

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

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
          <Building2 className="h-6 w-6 text-indigo-600" />
          {currentDay}
          {driveSlot && (
            <Badge className="bg-indigo-100 text-indigo-700 border border-indigo-200 text-sm font-medium">
              {driveSlot.charAt(0).toUpperCase() + driveSlot.slice(1)} Slot
            </Badge>
          )}
        </h2>
        <Button variant="outline" onClick={scrollToWalkin} className="border-green-600 text-green-600 hover:bg-green-50">
          <Building2 className="h-4 w-4 mr-2" /> Walk-in Companies
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input placeholder="Search by company name or role…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={selectedRound} onValueChange={setSelectedRound}>
              <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Select Round" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rounds</SelectItem>
                {uniqueRounds.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="grid gap-6 md:grid-cols-2">
          {filteredCompanies.map(renderCompanyCard)}
        </div>
        {filteredCompanies.length === 0 && (
          <Card className="bg-gray-50">
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No companies found for the selected filters.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div ref={walkinRef} className="scroll-mt-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
          <Building2 className="h-6 w-6 mr-2 text-green-600" />
          Walk-in Companies
          <Badge className="ml-3 bg-green-100 text-green-800">Open for All</Badge>
        </h2>
        {(() => {
          const visibleCompanyKeys = new Set(companies.map((c) => `${c.id}-${c.round}`));
          const activeWalkins = walkinCompanies.filter((c) => {
            if (visibleCompanyKeys.has(`${c.id}-${c.round}`)) return false;
            if (driveDay != null && c.day !== `Day ${driveDay}`) return false;
            if (driveSlot && c.slot !== driveSlot) return false;
            return true;
          });
          return activeWalkins.length === 0 ? (
            <Card className="bg-gray-50">
              <CardContent className="py-8 text-center text-gray-500">No walk-in companies available right now.</CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {activeWalkins.map(renderCompanyCard)}
            </div>
          );
        })()}
      </div>

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
            <Button variant="outline" onClick={() => setSwitchModal(null)}>Keep Current</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleConfirmSwitch} disabled={actionLoading !== null}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Yes, Switch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
