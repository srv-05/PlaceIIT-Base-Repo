import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Search, Building2, MapPin, Clock, Users, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
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
  status: "upcoming" | "in-queue" | "completed" | "rejected" | "offer_given";
  queuePosition?: number;
  totalInQueue?: number;
  currentQueue?: number;
  priority: number;
  round: number;
  isWalkin?: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  "upcoming": "Upcoming",
  "in-queue": "In Queue",
  "in_queue": "In Queue",
  "completed": "Completed",
  "rejected": "Rejected",
  "offer_given": "Offer Given",
};

export function StudentHomePage() {
  const { socket } = useSocket();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("all");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [walkinCompanies, setWalkinCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const walkinRef = useRef<HTMLDivElement>(null);

  const normalizeCompany = (raw: any, index: number, isWalkin = false): Company => {
    const queueEntry = raw.queueEntry ?? raw.queue ?? null;
    const statusRaw: string = queueEntry?.status ?? raw.status ?? "upcoming";
    const status = (statusRaw === "in_queue" ? "in-queue" : statusRaw) as Company["status"];

    return {
      id: raw._id ?? raw.id ?? raw.company?._id ?? String(index),
      name: raw.name ?? raw.company?.name ?? "—",
      logo: raw.logo ?? raw.company?.logo ?? "",
      role: raw.role ?? "",
      venue: raw.venue ?? raw.company?.venue ?? "TBA",
      day: raw.day != null ? `Day ${raw.day}` : raw.company?.day != null ? `Day ${raw.company.day}` : "—",
      slot: raw.slot ?? raw.company?.slot ?? "—",
      status,
      queuePosition: queueEntry?.position ?? undefined,
      totalInQueue: raw.totalInQueue ?? undefined,
      currentQueue: raw.currentQueue ?? undefined,
      priority: raw.priorityOrder ?? raw.order ?? index + 1,
      round: raw.currentRound ?? raw.company?.currentRound ?? 1,
      isWalkin,
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
      toast.error("Failed to load companies: " + (err.message ?? ""));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Real-time updates ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = ({ companyId }: { companyId?: string }) => {
      fetchData();
      toast.info("Your interview status was updated.");
      // Also join the specific company room if we know it
      if (companyId) socket.emit("join:company", companyId);
    };

    const handleQueueUpdate = ({ companyId }: { companyId?: string }) => {
      fetchData();
      if (companyId) socket.emit("join:company", companyId);
    };

    socket.on("status:updated", handleStatusUpdate);
    socket.on("queue:updated", handleQueueUpdate);
    socket.on("walkin:updated", handleQueueUpdate);

    return () => {
      socket.off("status:updated", handleStatusUpdate);
      socket.off("queue:updated", handleQueueUpdate);
      socket.off("walkin:updated", handleQueueUpdate);
    };
  }, [socket, fetchData]);

  // Join company rooms once companies are loaded
  useEffect(() => {
    if (!socket) return;
    const inQueueCompanies = companies.filter((c) =>
      c.status === "in-queue" || (c.status as any) === "in_queue"
    );
    inQueueCompanies.forEach((c) => socket.emit("join:company", c.id));
  }, [socket, companies]);
  // ─────────────────────────────────────────────────────────────────────────

  const currentDay = companies.length > 0
    ? [...new Set(companies.map((c) => c.day))][0]
    : "Today";

  const handleJoinQueue = async (companyId: string) => {
    try {
      await studentApi.joinQueue(companyId);
      toast.success("Joined queue successfully!");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to join queue");
    }
  };

  const handleJoinWalkin = async (companyId: string) => {
    try {
      await studentApi.joinWalkInQueue(companyId);
      toast.success("Joined walk-in queue!");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to join walk-in queue");
    }
  };

  const scrollToWalkin = () => walkinRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const sortedCompanies = [...companies].sort((a, b) => {
    const order: Record<string, number> = { "in-queue": 0, "upcoming": 1, "completed": 2, "offer_given": 3, "rejected": 3 };
    const diff = (order[a.status] ?? 9) - (order[b.status] ?? 9);
    return diff !== 0 ? diff : a.priority - b.priority;
  });

  const filteredCompanies = sortedCompanies.filter((company) => {
    const matchesSearch =
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSlot = selectedSlot === "all" || company.slot === selectedSlot;
    return matchesSearch && matchesSlot;
  });

  const uniqueSlots = [...new Set([...companies, ...walkinCompanies].map((c) => c.slot))].filter(Boolean);

  const renderCompanyCard = (company: Company) => (
    <Card key={company.id} className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="h-12 w-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
              {company.logo ? (
                <img
                  src={company.logo}
                  alt={company.name}
                  className="h-8 w-8 object-contain"
                  onError={(e) => {
                    const t = e.currentTarget;
                    t.style.display = "none";
                    const span = document.createElement("span");
                    span.className = "text-lg font-bold text-gray-700";
                    span.textContent = company.name.charAt(0);
                    t.parentElement?.appendChild(span);
                  }}
                />
              ) : (
                <span className="text-lg font-bold text-gray-700">{company.name.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl text-gray-900 mb-2">{company.name}</CardTitle>
              {company.role && <p className="text-sm text-gray-600 mb-1">{company.role}</p>}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">Round {company.round}</Badge>
                {!company.isWalkin && (
                  <Badge variant="outline" className="text-xs">Priority {company.priority}</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2">
            {company.status === "completed" && (
              <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>
            )}
            {company.status === "offer_given" && (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">🎉 Offer Given</Badge>
            )}
            {company.status === "rejected" && (
              <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>
            )}
            {(company.status === "in-queue" || company.status === "in_queue" as any) && (
              <Badge className="bg-blue-100 text-blue-800 border-blue-200"><Clock className="h-3 w-3 mr-1" />In Queue</Badge>
            )}
            {company.status === "upcoming" && (
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><AlertCircle className="h-3 w-3 mr-1" />Upcoming</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center text-sm text-gray-600">
          <MapPin className="h-4 w-4 mr-2 text-gray-400" /> Venue: {company.venue}
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Clock className="h-4 w-4 mr-2 text-gray-400" /> {company.day} — {company.slot}
        </div>

        {(company.status === "in-queue" || (company.status as any) === "in_queue") && company.queuePosition && (
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm">
                <Users className="h-4 w-4 mr-2 text-blue-600" />
                <span className="text-gray-700">Queue Position:</span>
              </div>
              <span className="font-semibold text-blue-700">
                {company.queuePosition}{company.totalInQueue ? ` of ${company.totalInQueue}` : ""}
              </span>
            </div>
          </div>
        )}

        {company.status === "upcoming" && company.currentQueue !== undefined && (
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm">
                <Users className="h-4 w-4 mr-2 text-gray-600" />
                <span className="text-gray-700">Current Queue:</span>
              </div>
              <span className="font-semibold text-gray-700">{company.currentQueue} students</span>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {company.status === "upcoming" && !company.isWalkin && (
            <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={() => handleJoinQueue(company.id)}>
              <Users className="h-4 w-4 mr-2" /> Join Queue
            </Button>
          )}
          {company.status === "upcoming" && company.isWalkin && (
            <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleJoinWalkin(company.id)}>
              <Users className="h-4 w-4 mr-2" /> Join Walk-in Queue
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
          <Building2 className="h-6 w-6 mr-2 text-indigo-600" /> {currentDay}
        </h2>
        <Button variant="outline" onClick={scrollToWalkin} className="border-green-600 text-green-600 hover:bg-green-50">
          <Building2 className="h-4 w-4 mr-2" /> Walk-in Companies
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input placeholder="Search by company name or role…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={selectedSlot} onValueChange={setSelectedSlot}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Select Slot" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Slots</SelectItem>
                {uniqueSlots.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
          <Loader2 className="h-6 w-6 animate-spin" /> Loading your companies…
        </div>
      ) : (
        <>
          <div>
            <div className="grid gap-6 md:grid-cols-2">
              {filteredCompanies.map(renderCompanyCard)}
            </div>
            {filteredCompanies.length === 0 && (
              <Card className="bg-gray-50">
                <CardContent className="py-12 text-center">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">
                    {companies.length === 0
                      ? "You have not been shortlisted for any companies yet."
                      : "No companies found for the selected filters."}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Walk-in Companies */}
          <div ref={walkinRef} className="scroll-mt-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
              <Building2 className="h-6 w-6 mr-2 text-green-600" />
              Walk-in Companies
              <Badge className="ml-3 bg-green-100 text-green-800">Open for All</Badge>
            </h2>
            {walkinCompanies.length === 0 ? (
              <Card className="bg-gray-50">
                <CardContent className="py-8 text-center text-gray-500">No walk-in companies available right now.</CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {walkinCompanies.map(renderCompanyCard)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}