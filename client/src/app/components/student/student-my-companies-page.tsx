import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Building2, MapPin, Clock, CheckCircle, AlertCircle, Calendar, Search, Loader2 } from "lucide-react";
import { studentApi } from "@/app/lib/api";

interface Company {
  id: string;
  name: string;
  logo: string;
  role: string;
  venue: string;
  day: string;
  slot: string;
  status: "upcoming" | "completed" | "in-progress" | string;
  priority: number;
  interviewDate: string;
  round: number;
}

export function StudentMyCompaniesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const normalizeCompany = (raw: any, i: number): Company => ({
    id: raw._id ?? raw.id ?? raw.company?._id ?? String(i),
    name: raw.name ?? raw.company?.name ?? "—",
    logo: raw.logo ?? raw.company?.logo ?? "",
    role: raw.role ?? raw.company?.role ?? "",
    venue: raw.venue ?? raw.company?.venue ?? "TBA",
    day: raw.day != null ? `Day ${raw.day}` : raw.company?.day != null ? `Day ${raw.company.day}` : "—",
    slot: raw.slot ?? raw.company?.slot ?? "—",
    status: raw.status ?? "upcoming",
    priority: raw.priorityOrder ?? raw.order ?? i + 1,
    interviewDate: raw.interviewDate ?? raw.company?.interviewDate ?? "",
    round: raw.currentRound ?? raw.company?.currentRound ?? 1,
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

  const filteredCompanies = companies.filter((company) => {
    const query = searchQuery.toLowerCase();
    return (
      company.name.toLowerCase().includes(query) ||
      company.day.toLowerCase().includes(query) ||
      company.slot.toLowerCase().includes(query) ||
      company.round.toString().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case "in-progress":
      case "in_queue":
      case "in-queue":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><Clock className="h-3 w-3 mr-1" />In Progress</Badge>;
      case "upcoming":
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><AlertCircle className="h-3 w-3 mr-1" />Upcoming</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 gap-2">
        <Loader2 className="h-6 w-6 animate-spin" /> Loading your companies…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Building2 className="h-8 w-8 mr-3 text-indigo-600" />
          My Companies
        </h1>
        <Badge className="bg-indigo-100 text-indigo-800 text-sm px-4 py-2">
          {companies.length} Companies Shortlisted
        </Badge>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Search by company name, day, slot, or round…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {companies.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm text-gray-700">
              <strong>Note:</strong> Companies are sorted according to your priority order.
              Make sure to join the queue before your slot begins.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {filteredCompanies.map((company) => (
          <Card key={company.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
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
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <CardTitle className="text-xl text-gray-900">{company.name}</CardTitle>
                      <Badge variant="outline" className="text-xs">Priority {company.priority}</Badge>
                      <Badge variant="outline" className="text-xs">Round {company.round}</Badge>
                      {getStatusBadge(company.status)}
                    </div>
                    {company.role && <p className="text-sm text-gray-600">{company.role}</p>}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                    {company.venue}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-2 text-gray-400" />
                    {company.day} — {company.slot}
                  </div>
                </div>
                {company.interviewDate && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
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

      {filteredCompanies.length === 0 && (
        <Card className="bg-gray-50">
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">
              {companies.length === 0
                ? "You haven't been shortlisted for any companies yet."
                : "No companies found matching your search."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}