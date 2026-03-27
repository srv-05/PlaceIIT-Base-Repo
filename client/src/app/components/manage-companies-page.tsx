import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Search, Plus, Upload, MapPin, UserCog, Users, Calendar, Clock, Eye, Loader2, X, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/app/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { adminApi } from "@/app/lib/api";
import { toast } from "sonner";

interface Company {
  id: string;
  name: string;
  cocoAssigned: string;
  venue: string;
  day: string;
  slot: string;
  shortlistedCount: number;
}

interface ManageCompaniesPageProps {
  onCompanyClick: (company: Company) => void;
}

export function ManageCompaniesPage({ onCompanyClick }: ManageCompaniesPageProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterDay, setFilterDay] = useState("all");
  const [filterSlot, setFilterSlot] = useState("all");
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [isUploadCompanyOpen, setIsUploadCompanyOpen] = useState(false);
  const [isAddStudentsOpen, setIsAddStudentsOpen] = useState(false);
  const [isUploadShortlistOpen, setIsUploadShortlistOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // Form states
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyDay, setNewCompanyDay] = useState("");
  const [newCompanySlot, setNewCompanySlot] = useState("");
  const [newCompanyVenue, setNewCompanyVenue] = useState("");

  // Manual student addition states
  const [manualStudentList, setManualStudentList] = useState("");
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [studentSuggestions, setStudentSuggestions] = useState<any[]>([]);
  const [selectedStudentsForShortlist, setSelectedStudentsForShortlist] = useState<any[]>([]);
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);

  const normalizeCompany = (raw: any): Company => ({
    id: raw._id ?? raw.id ?? "",
    name: raw.name ?? "—",
    cocoAssigned: raw.assignedCocos?.length
      ? raw.assignedCocos.map((c: any) => {
        const idStr = c.userId?.instituteId ? ` (${c.userId.instituteId})` : "";
        return `${c.name ?? c}${idStr}`;
      }).join(", ")
      : "Not Assigned",
    venue: raw.venue ?? "Not Assigned",
    day: raw.day != null ? `Day ${raw.day}` : "—",
    slot: raw.slot ? raw.slot.charAt(0).toUpperCase() + raw.slot.slice(1) : "—",
    shortlistedCount: raw.shortlistedStudents?.length ?? raw.shortlistedCount ?? 0,
  });

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const data: any = await adminApi.getCompanies();
      const list = Array.isArray(data) ? data : data.companies ?? [];
      setCompanies(list.map(normalizeCompany));
    } catch (err: any) {
      toast.error("Failed to load companies: " + (err.message ?? "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const dayParts = [...new Set(companies.map((c) => c.day))].sort();
  const slotParts = [...new Set(companies.map((c) => c.slot))].sort();

  const slotOrder: Record<string, number> = { Morning: 1, Afternoon: 2 };

  const filteredCompanies = companies
    .filter((company) => {
      const matchesSearch = company.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDay = filterDay === "all" || company.day === filterDay;
      const matchesSlot = filterSlot === "all" || company.slot === filterSlot;
      return matchesSearch && matchesDay && matchesSlot;
    })
    .sort((a, b) => {
      const dayA = parseInt(a.day.replace(/\D/g, "")) || 0;
      const dayB = parseInt(b.day.replace(/\D/g, "")) || 0;
      if (dayA !== dayB) return dayA - dayB;
      return (slotOrder[a.slot] ?? 99) - (slotOrder[b.slot] ?? 99);
    });

  const handleAddCompany = async () => {
    if (!newCompanyName || !newCompanyDay || !newCompanySlot || !newCompanyVenue) return;
    setSaving(true);
    try {
      const dayNum = parseInt(newCompanyDay.replace("Day ", ""), 10);
      await adminApi.addCompany({
        name: newCompanyName,
        day: dayNum,
        slot: newCompanySlot.toLowerCase(),
        venue: newCompanyVenue,
        mode: "offline",
        totalRounds: 1,
      });
      toast.success(`Company "${newCompanyName}" added`);
      setNewCompanyName("");
      setNewCompanyDay("");
      setNewCompanySlot("");
      setNewCompanyVenue("");
      setIsAddCompanyOpen(false);
      await fetchCompanies();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add company");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateVenue = async (companyId: string, newVenue: string) => {
    // Optimistic local update
    setCompanies((prev) =>
      prev.map((c) => (c.id === companyId ? { ...c, venue: newVenue } : c))
    );
  };

  const handleVenueBlur = async (company: Company) => {
    try {
      await adminApi.updateCompany(company.id, { venue: company.venue });
    } catch (err: any) {
      toast.error("Failed to save venue: " + (err.message ?? ""));
    }
  };

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res: any = await adminApi.uploadCompanyExcel(formData);
      toast.success(res.message || "Companies uploaded from Excel successfully");
      if (res.errors?.length > 0) {
        toast.warning(`${res.errors.length} row(s) had issues. Check console for details.`);
        console.warn("Company Excel errors:", res.errors);
      }
      setIsUploadCompanyOpen(false);
      await fetchCompanies();
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    }
    event.target.value = "";
  };


  const handleShortlistExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>, companyId: string) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("companyId", companyId);
    try {
      const res: any = await adminApi.uploadShortlistExcel(formData);
      const { successCount = 0, failedCount = 0, errors = [] } = res;
      if (successCount > 0) {
        toast.success(`${successCount} student(s) shortlisted successfully!`);
      }
      if (failedCount > 0) {
        toast.warning(`${failedCount} row(s) failed. Check details below.`);
        errors.forEach((e: any) => {
          toast.error(`Row ${e.row}: ${e.reason}`, { duration: 8000 });
        });
      }
      if (successCount === 0 && failedCount === 0) {
        toast.info("No new students were added (file may be empty or all students already shortlisted).");
      }
      await fetchCompanies();
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    }
    event.target.value = "";
  };

  useEffect(() => {
    if (!studentSearchTerm || studentSearchTerm.length < 2) {
      setStudentSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingStudents(true);
      try {
        const data: any = await adminApi.searchStudents(studentSearchTerm);
        setStudentSuggestions(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to search students", err);
      } finally {
        setIsSearchingStudents(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [studentSearchTerm]);

  const toggleStudentSelection = (student: any) => {
    setSelectedStudentsForShortlist(prev => {
      const exists = prev.find(s => s._id === student._id);
      if (exists) {
        return prev.filter(s => s._id !== student._id);
      } else {
        return [...prev, student];
      }
    });
  };

  const handleAddStudentsManually = async () => {
    if (!selectedCompanyId || selectedStudentsForShortlist.length === 0) return;
    const rollNumbers = selectedStudentsForShortlist.map(s => s.rollNumber);
    setSaving(true);
    try {
      const res: any = await adminApi.shortlistStudents(selectedCompanyId, rollNumbers);
      const count = res.shortlisted?.length ?? rollNumbers.length;
      toast.success(`${count} student(s) shortlisted successfully!`);

      setSelectedStudentsForShortlist([]);
      setStudentSearchTerm("");
      setIsAddStudentsOpen(false);
      await fetchCompanies();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to shortlist students");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 gap-2">
        <Loader2 className="h-6 w-6 animate-spin" /> Loading companies…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Manage Companies</h1>
          <p className="text-gray-500">Add companies and manage interview details</p>
        </div>

        <div className="flex gap-2">
          {/* Excel Upload for Companies */}
          <Dialog open={isUploadCompanyOpen} onOpenChange={setIsUploadCompanyOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 h-11 border-gray-300">
                <Upload className="h-4 w-4" /> Upload Companies
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Companies Excel</DialogTitle>
                <DialogDescription>
                  Excel must have columns EXACTLY in this order:
                  <br />
                  <strong className="text-gray-900 mt-2 block">Company Name | Day | Slot | Venue</strong>
                  <br />
                  Example:
                  <span className="font-mono text-xs bg-gray-100 p-2 block mt-1 rounded text-gray-800">
                    Google | Day 1 | Morning | Seminar Hall A
                  </span>
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center py-6 gap-4">
                <input id="company-excel-upload" type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
                <Button onClick={() => document.getElementById("company-excel-upload")?.click()} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Upload className="h-4 w-4 mr-2" /> Select Excel File
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddCompanyOpen} onOpenChange={setIsAddCompanyOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white h-11 shadow-sm">
                <Plus className="h-4 w-4" />
                Add Company
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Company</DialogTitle>
                <DialogDescription>Enter the company details for placement interviews.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name *</Label>
                  <Input id="company-name" placeholder="Enter company name" value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="day">Day *</Label>
                    <Select value={newCompanyDay} onValueChange={setNewCompanyDay}>
                      <SelectTrigger><SelectValue placeholder="Select day" /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3].map((d) => (
                          <SelectItem key={d} value={`Day ${d}`}>Day {d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slot">Slot *</Label>
                    <Select value={newCompanySlot} onValueChange={setNewCompanySlot}>
                      <SelectTrigger><SelectValue placeholder="Select slot" /></SelectTrigger>
                      <SelectContent>
                        {["Morning", "Afternoon"].map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="venue">Venue *</Label>
                  <Input id="venue" placeholder="Enter venue (e.g., Seminar Hall A)" value={newCompanyVenue} onChange={(e) => setNewCompanyVenue(e.target.value)} />
                </div>
                <p className="text-sm text-gray-500 mt-2">CoCo can be assigned after adding the company.</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddCompanyOpen(false)}>Cancel</Button>
                <Button onClick={handleAddCompany} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Add Company
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input type="text" placeholder="Search companies…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
            </div>
            <div>
              <Select value={filterDay} onValueChange={setFilterDay}>
                <SelectTrigger><SelectValue placeholder="Filter by day" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Days</SelectItem>
                  {dayParts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={filterSlot} onValueChange={setFilterSlot}>
                <SelectTrigger><SelectValue placeholder="Filter by slot" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Slots</SelectItem>
                  {slotParts.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company List */}
      <div className="space-y-4">
        {filteredCompanies.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              {searchQuery || filterDay !== "all" || filterSlot !== "all"
                ? "No companies found matching your filters."
                : "No companies added yet. Click \"Add Company\" to get started."}
            </CardContent>
          </Card>
        ) : (
          filteredCompanies.map((company) => (
            <Card key={company.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold text-gray-900">{company.name}</CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        <span>{company.day}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        <span>{company.slot}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-semibold">
                    {company.shortlistedCount} Students
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg">
                    <UserCog className="h-5 w-5 text-indigo-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">CoCo Assigned</div>
                      <div className="font-semibold text-gray-900">{company.cocoAssigned}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg">
                    <MapPin className="h-5 w-5 text-indigo-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Venue</div>
                      <Input
                        value={company.venue}
                        onChange={(e) => handleUpdateVenue(company.id, e.target.value)}
                        onBlur={() => handleVenueBlur(company)}
                        className="h-9 bg-white border-gray-300 font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" size="sm" onClick={() => onCompanyClick(company)}>
                    <Eye className="h-4 w-4" /> View Details
                  </Button>

                  {/* Add Students Manually */}
                  <Dialog
                    open={isAddStudentsOpen && selectedCompanyId === company.id}
                    onOpenChange={(open) => { setIsAddStudentsOpen(open); if (open) setSelectedCompanyId(company.id); }}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex items-center gap-2 border-gray-300">
                        <Plus className="h-4 w-4" /> Add Students Manually
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add Shortlisted Students</DialogTitle>
                        <DialogDescription>Search for students by roll number or name to add them to the shortlist.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Search Students</Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Type roll no (e.g. 241...)"
                              value={studentSearchTerm}
                              onChange={(e) => setStudentSearchTerm(e.target.value)}
                              className="pl-9"
                            />
                            {isSearchingStudents && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />}
                          </div>

                          {/* Suggestions Dropdown */}
                          {studentSuggestions.length > 0 && (
                            <div className="absolute z-50 mt-1 w-[calc(100%-48px)] max-h-60 overflow-auto bg-white border border-gray-200 rounded-md shadow-lg">
                              {studentSuggestions.map((s) => {
                                const isSelected = selectedStudentsForShortlist.some(sel => sel._id === s._id);
                                return (
                                  <div
                                    key={s._id}
                                    className="px-4 py-2 hover:bg-indigo-50 cursor-pointer flex items-center justify-between border-b last:border-0"
                                    onClick={() => toggleStudentSelection(s)}
                                  >
                                    <div>
                                      <div className="font-medium text-sm text-gray-900">{s.name}</div>
                                      <div className="text-xs text-gray-500">{s.rollNumber} • {s.branch}</div>
                                    </div>
                                    {isSelected && <Check className="h-4 w-4 text-indigo-600" />}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Selected Students List */}
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-gray-500 uppercase">Selected Students ({selectedStudentsForShortlist.length})</Label>
                          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                            {selectedStudentsForShortlist.length === 0 ? (
                              <p className="text-sm text-gray-400 italic">No students selected yet.</p>
                            ) : (
                              selectedStudentsForShortlist.map((s) => (
                                <div key={s._id} className="flex items-center gap-1.5 bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md text-sm">
                                  <span>{s.rollNumber}</span>
                                  <button onClick={() => toggleStudentSelection(s)} className="hover:text-indigo-900">
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => {
                          setIsAddStudentsOpen(false);
                          setSelectedStudentsForShortlist([]);
                          setStudentSearchTerm("");
                        }}>Cancel</Button>
                        <Button
                          onClick={handleAddStudentsManually}
                          disabled={saving || selectedStudentsForShortlist.length === 0}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Add {selectedStudentsForShortlist.length} Student{selectedStudentsForShortlist.length !== 1 ? 's' : ''}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Upload Shortlist Excel (with template preview) */}
                  <Dialog
                    open={isUploadShortlistOpen && selectedCompanyId === company.id}
                    onOpenChange={(open) => { setIsUploadShortlistOpen(open); if (open) setSelectedCompanyId(company.id); }}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex items-center gap-2 border-gray-300">
                        <Upload className="h-4 w-4" /> Upload Shortlist
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Upload Shortlist Excel</DialogTitle>
                        <DialogDescription>Your Excel file must follow this exact template format:</DialogDescription>
                      </DialogHeader>
                      <div className="py-4 space-y-4">
                        {/* Template Preview Table */}
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-4 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Roll Number</th>
                                <th className="px-4 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Email ID</th>
                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Name</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="text-gray-500 italic">
                                <td className="px-4 py-2 border-t border-r border-gray-200">2021CS101</td>
                                <td className="px-4 py-2 border-t border-r border-gray-200">student@iitk.ac.in</td>
                                <td className="px-4 py-2 border-t border-gray-200">John Doe</td>
                              </tr>
                              <tr className="text-gray-400 italic">
                                <td className="px-4 py-2 border-t border-r border-gray-200">2021EE202</td>
                                <td className="px-4 py-2 border-t border-r border-gray-200">another@iitk.ac.in</td>
                                <td className="px-4 py-2 border-t border-gray-200">Jane Smith</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <p className="text-xs text-gray-500">Roll Number and Email ID are used to match students. Name is optional.</p>
                        <input
                          id={`student-excel-${company.id}`}
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={(e) => { handleShortlistExcelUpload(e, company.id); setIsUploadShortlistOpen(false); }}
                          className="hidden"
                        />
                        <Button
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                          onClick={() => document.getElementById(`student-excel-${company.id}`)?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" /> Select Excel File
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}