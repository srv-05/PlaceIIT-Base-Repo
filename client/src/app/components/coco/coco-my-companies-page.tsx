import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Building2, MapPin, Clock, Users, Calendar, ChevronDown, Loader2 } from "lucide-react";
import { cocoApi } from "@/app/lib/api";
import { formatSlotLabel } from "@/app/lib/format";

interface Company {
  id: string;
  name: string;
  role: string;
  venue: string;
  day: string;
  slot: string;
  studentsShortlisted: number;
  date: string;
}

export function CoCoMyCompaniesPage({ onCompanySelect }: { onCompanySelect: (companyName: string) => void }) {
  const [selectedDay, setSelectedDay] = useState("all");
  const [selectedSlot, setSelectedSlot] = useState("all");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const normalizeCompany = (raw: any, i: number): Company => ({
    id: raw._id ?? raw.id ?? String(i),
    name: raw.name ?? "—",
    role: raw.role ?? "",
    venue: raw.venue ?? "TBA",
    day: raw.day != null ? `Day ${raw.day}` : "—",
    slot: formatSlotLabel(raw.slot),
    studentsShortlisted: raw.shortlistedStudents?.length ?? 0,
    date: raw.interviewDate ?? "",
  });

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const data: any = await cocoApi.getAssignedCompany();
      // The API might return a single company or an array
      const raw = Array.isArray(data) ? data : data.companies ?? (data.company ? [data.company] : []);
      setCompanies(raw.map(normalizeCompany));
    } catch {
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const uniqueDays = [...new Set(companies.map((c) => c.day))].sort();
  const uniqueSlots = [...new Set(companies.map((c) => c.slot))].sort();

  const filteredCompanies = companies.filter((company) => {
    const matchesDay = selectedDay === "all" || company.day === selectedDay;
    const matchesSlot = selectedSlot === "all" || company.slot.includes(selectedSlot);
    return matchesDay && matchesSlot;
  });

  const groupedByDay = filteredCompanies.reduce((acc, company) => {
    if (!acc[company.day]) acc[company.day] = {};
    const slotKey = company.slot;
    if (!acc[company.day][slotKey]) acc[company.day][slotKey] = [];
    acc[company.day][slotKey].push(company);
    return acc;
  }, {} as Record<string, Record<string, Company[]>>);

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
          <Building2 className="h-8 w-8 mr-3 text-green-600" />
          My Companies
        </h1>
        <Badge className="bg-green-100 text-green-800 text-sm px-4 py-2">
          {companies.length} Companies Assigned
        </Badge>
      </div>

      {companies.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <Select value={selectedDay} onValueChange={setSelectedDay}>
                <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Select Day" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Days</SelectItem>
                  {uniqueDays.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedSlot} onValueChange={setSelectedSlot}>
                <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Select Slot" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Slots</SelectItem>
                  {uniqueSlots.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {Object.entries(groupedByDay).map(([day, slots]) => (
        <div key={day}>
          <div className="flex items-center mb-4">
            <Calendar className="h-5 w-5 mr-2 text-green-600" />
            <h2 className="text-2xl font-semibold text-gray-900">{day}</h2>
          </div>

          {Object.entries(slots).map(([slot, slotCompanies]) => (
            <div key={slot} className="mb-6">
              <div className="flex items-center mb-3 ml-7">
                <Clock className="h-4 w-4 mr-2 text-gray-600" />
                <h3 className="text-lg font-medium text-gray-700">{slot}</h3>
                <ChevronDown className="h-4 w-4 ml-1 text-gray-400" />
              </div>

              <div className="grid md:grid-cols-2 gap-4 ml-7">
                {slotCompanies.map((company) => (
                  <Card
                    key={company.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer border-2"
                    onClick={() => onCompanySelect(company.name)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl text-gray-900 mb-2">{company.name}</CardTitle>
                          {company.role && <p className="text-sm text-gray-600">{company.role}</p>}
                        </div>
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          <Users className="h-3 w-3 mr-1" />
                          {company.studentsShortlisted}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2 text-gray-400" /> {company.venue}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-2 text-gray-400" /> {company.slot}
                      </div>
                      {company.date && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          {new Date(company.date).toLocaleDateString("en-IN", {
                            weekday: "long", year: "numeric", month: "long", day: "numeric",
                          })}
                        </div>
                      )}
                      <Button
                        className="w-full mt-2 bg-green-600 hover:bg-green-700"
                        onClick={(e) => { e.stopPropagation(); onCompanySelect(company.name); }}
                      >
                        Manage Company
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      {filteredCompanies.length === 0 && (
        <Card className="bg-gray-50">
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">
              {companies.length === 0
                ? "No companies assigned to you yet."
                : "No companies found for the selected filters."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
