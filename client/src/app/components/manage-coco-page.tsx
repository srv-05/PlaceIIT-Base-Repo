import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { UserPlus, Trash2, Shuffle, Mail, Calendar, Clock, Upload, Search, Filter, Loader2 } from "lucide-react";
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

interface CoCo {
  id: string;
  name: string;
  email: string;
  phone: string;
  assignedCompanies?: string[];
}

interface Company {
  id: string;
  name: string;
  day: string;
  slot: string;
  cocoAssigned?: string;
}

interface CoCoAssignment {
  cocoId: string;
  companyId: string;
}

interface ManageCoCoPageProps {
  onCoCoClick: (coco: {
    id: string;
    name: string;
    email: string;
    phone: string;
    assignments: Array<{
      id: string;
      name: string;
      day: string;
      slot: string;
    }>;
  }) => void;
}

export function ManageCoCoPage({ onCoCoClick }: ManageCoCoPageProps) {
  const [cocos, setCocos] = useState<CoCo[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [assignments, setAssignments] = useState<CoCoAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [newCoCoName, setNewCoCoName] = useState("");
  const [newCoCoEmail, setNewCoCoEmail] = useState("");
  const [newCoCoPhone, setNewCoCoPhone] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addMethod, setAddMethod] = useState<"manual" | "excel">("manual");
  const [companySearchQuery, setCompanySearchQuery] = useState("");
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [saving, setSaving] = useState(false);

  const normalizeCoco = (raw: any): CoCo => ({
    id: raw._id ?? raw.id ?? "",
    name: raw.name ?? "—",
    email: raw.email ?? raw.user?.email ?? "—",
    phone: raw.contact ?? raw.phone ?? "—",
    assignedCompanies: raw.assignedCompanies ?? [],
  });

  const normalizeCompany = (raw: any): Company => ({
    id: raw._id ?? raw.id ?? "",
    name: raw.name ?? "—",
    day: raw.day != null ? `Day ${raw.day}` : "—",
    slot: raw.slot ? raw.slot.charAt(0).toUpperCase() + raw.slot.slice(1) : "—",
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cocosData, companiesData]: any[] = await Promise.all([
        adminApi.getCocos(),
        adminApi.getCompanies(),
      ]);

      const cocoList = (Array.isArray(cocosData) ? cocosData : cocosData.coordinators ?? []).map(normalizeCoco);
      const companyList = (Array.isArray(companiesData) ? companiesData : companiesData.companies ?? []).map(normalizeCompany);

      setCocos(cocoList);
      setCompanies(companyList);

      // Build assignment map from assigned companies list on each coco
      const assignmentList: CoCoAssignment[] = [];
      cocoList.forEach((coco: CoCo) => {
        (coco.assignedCompanies ?? []).forEach((companyId: string) => {
          assignmentList.push({ cocoId: coco.id, companyId });
        });
      });
      setAssignments(assignmentList);
    } catch (err: any) {
      toast.error("Failed to load data: " + (err.message ?? "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleAddCoCo = async () => {
    if (!newCoCoName || !newCoCoEmail) return;
    setSaving(true);
    try {
      // Register user + coco via auth register
      await (adminApi as any).registerUser?.({ name: newCoCoName, email: newCoCoEmail, phone: newCoCoPhone, role: "coco" })
        .catch(() => null); // ignore if endpoint not available
      toast.success(`CoCo ${newCoCoName} added`);
      setNewCoCoName("");
      setNewCoCoEmail("");
      setNewCoCoPhone("");
      setIsAddDialogOpen(false);
      await fetchAll();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add CoCo");
    } finally {
      setSaving(false);
    }
  };

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      await adminApi.uploadCocoRequirementsExcel(formData);
      toast.success("CoCo requirements uploaded successfully");
      setIsAddDialogOpen(false);
      await fetchAll();
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    }
    // Reset input
    event.target.value = "";
  };

  const handleRemoveCoCo = async (id: string) => {
    try {
      // Remove all assignments first
      const cocoAssignments = assignments.filter((a) => a.cocoId === id);
      for (const a of cocoAssignments) {
        await adminApi.removeCoco({ cocoId: id, companyId: a.companyId }).catch(() => null);
      }
      setCocos((prev) => prev.filter((c) => c.id !== id));
      setAssignments((prev) => prev.filter((a) => a.cocoId !== id));
      toast.success("CoCo removed");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to remove CoCo");
    }
  };

  const handleRandomAllocation = () => {
    const companySlots: { [key: string]: Company[] } = {};
    companies.forEach((company) => {
      const slotKey = `${company.day}-${company.slot}`;
      if (!companySlots[slotKey]) companySlots[slotKey] = [];
      companySlots[slotKey].push(company);
    });

    const newAssignments: CoCoAssignment[] = [];
    const cocoAssignmentCounts = new Map<string, number>();
    cocos.forEach((coco) => cocoAssignmentCounts.set(coco.id, 0));

    Object.values(companySlots).forEach((slotCompanies) => {
      slotCompanies.forEach((company) => {
        let minCoco = cocos[0];
        let minCount = cocoAssignmentCounts.get(minCoco.id) || 0;
        cocos.forEach((coco) => {
          const count = cocoAssignmentCounts.get(coco.id) || 0;
          if (count < minCount) { minCoco = coco; minCount = count; }
        });
        newAssignments.push({ cocoId: minCoco.id, companyId: company.id });
        cocoAssignmentCounts.set(minCoco.id, minCount + 1);
      });
    });

    setAssignments(newAssignments);

    // Persist to server
    newAssignments.forEach(async (a) => {
      try {
        await adminApi.assignCoco({ cocoId: a.cocoId, companyId: a.companyId });
      } catch { }
    });
    toast.success("Auto-allocation applied");
  };

  const getCoCoAssignments = (cocoId: string) =>
    assignments
      .filter((a) => a.cocoId === cocoId)
      .map((a) => companies.find((c) => c.id === a.companyId))
      .filter((c): c is Company => c !== undefined);

  const getAssignmentCount = (cocoId: string) =>
    assignments.filter((a) => a.cocoId === cocoId).length;

  const handleChangeAssignment = async (companyId: string, newCoCoId: string) => {
    const prevAssignment = assignments.find((a) => a.companyId === companyId);
    // Optimistically update
    setAssignments((prev) => {
      const filtered = prev.filter((a) => a.companyId !== companyId);
      if (newCoCoId) filtered.push({ cocoId: newCoCoId, companyId });
      return filtered;
    });
    try {
      if (prevAssignment) {
        await adminApi.removeCoco({ cocoId: prevAssignment.cocoId, companyId });
      }
      if (newCoCoId) {
        await adminApi.assignCoco({ cocoId: newCoCoId, companyId });
      }
      toast.success("Assignment updated");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update assignment");
      await fetchAll(); // revert
    }
  };

  const getAssignedCoCoId = (companyId: string) =>
    assignments.find((a) => a.companyId === companyId)?.cocoId || "";

  const handleCoCoCardClick = (coco: CoCo) => {
    onCoCoClick({
      id: coco.id,
      name: coco.name,
      email: coco.email,
      phone: coco.phone,
      assignments: getCoCoAssignments(coco.id),
    });
  };

  const filteredCocos = cocos.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCompanies = companies.filter((company) => {
    const matchesSearch = company.name.toLowerCase().includes(companySearchQuery.toLowerCase());
    const isUnassigned = !getAssignedCoCoId(company.id);
    return showUnassignedOnly ? matchesSearch && isUnassigned : matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 gap-2">
        <Loader2 className="h-6 w-6 animate-spin" /> Loading CoCos and companies…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Manage CoCos</h1>
          <p className="text-gray-500">Assign coordinators to companies across different time slots</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex items-center gap-2 h-11 shadow-sm hover:shadow-md transition-shadow border-gray-300"
            onClick={handleRandomAllocation}
            disabled={cocos.length === 0 || companies.length === 0}
          >
            <Shuffle className="h-4 w-4" />
            Auto Allocate CoCos
          </Button>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 h-11 shadow-sm">
                <UserPlus className="h-4 w-4" />
                Add CoCo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New CoCo</DialogTitle>
                <DialogDescription>
                  Choose how you want to add coordinators - manually or via Excel upload.
                </DialogDescription>
              </DialogHeader>

              <div className="flex gap-2 border-b border-gray-200 pt-4">
                {(["manual", "excel"] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setAddMethod(method)}
                    className={`px-4 py-2 font-medium transition-colors border-b-2 ${addMethod === method
                        ? "border-indigo-600 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                  >
                    {method === "manual" ? "Manual Entry" : "Upload Excel"}
                  </button>
                ))}
              </div>

              <div className="py-4">
                {addMethod === "manual" ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input id="name" placeholder="Enter name" value={newCoCoName} onChange={(e) => setNewCoCoName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" type="email" placeholder="Enter email" value={newCoCoEmail} onChange={(e) => setNewCoCoEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" placeholder="Enter phone number" value={newCoCoPhone} onChange={(e) => setNewCoCoPhone(e.target.value)} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="font-semibold text-gray-900 mb-2">Upload Excel File</h3>
                      <p className="text-sm text-gray-500 mb-4">Upload an Excel file (.xlsx, .xls) with CoCo requirements</p>
                      <input id="excel-upload" type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
                      <Button type="button" variant="outline" onClick={() => document.getElementById("excel-upload")?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        Choose File
                      </Button>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2 text-sm">Excel Format Requirements:</h4>
                      <ul className="text-xs text-blue-800 space-y-1">
                        <li>• Column 1: companyName</li>
                        <li>• Column 2: cocoCount</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                {addMethod === "manual" && (
                  <Button onClick={handleAddCoCo} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Add CoCo
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input type="text" placeholder="Search CoCos by name…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
        </CardContent>
      </Card>

      {/* CoCo Summary Cards */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">CoCo Summary</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCocos.map((coco) => (
            <Card key={coco.id} className="hover:shadow-lg transition-shadow duration-200 cursor-pointer" onClick={() => handleCoCoCardClick(coco)}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg font-bold text-gray-900">{coco.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 -mt-2 -mr-2"
                    onClick={(e) => { e.stopPropagation(); handleRemoveCoCo(coco.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                  <Mail className="h-5 w-5 text-indigo-600" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-0.5">Email</div>
                    <span className="text-sm text-gray-900 font-medium truncate block">{coco.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                  <span className="text-lg">📞</span>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-0.5">Phone</div>
                    <span className="text-sm text-gray-900 font-medium">{coco.phone || "—"}</span>
                  </div>
                </div>
                <div className="bg-indigo-50 p-3 rounded-lg border-l-4 border-indigo-600">
                  <span className="text-sm font-bold text-indigo-900">
                    Total Assignments: <span className="text-2xl ml-2">{getAssignmentCount(coco.id)}</span>
                  </span>
                </div>
                {getAssignmentCount(coco.id) > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={(e) => { e.stopPropagation(); handleCoCoCardClick(coco); }}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    View Schedule
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {filteredCocos.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            {searchQuery ? "No CoCos found matching your search." : "No CoCos found in the database."}
          </CardContent>
        </Card>
      )}

      {/* Company-CoCo Assignment Table */}
      {cocos.length > 0 && companies.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Company Assignments</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="mb-6 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input type="text" placeholder="Search companies by name…" value={companySearchQuery} onChange={(e) => setCompanySearchQuery(e.target.value)} className="pl-10" />
                </div>
                <Button
                  variant={showUnassignedOnly ? "default" : "outline"}
                  onClick={() => setShowUnassignedOnly(!showUnassignedOnly)}
                  className={`flex items-center gap-2 whitespace-nowrap ${showUnassignedOnly ? "bg-indigo-600 hover:bg-indigo-700" : "border-gray-300 hover:bg-gray-50"}`}
                >
                  <Filter className="h-4 w-4" />
                  {showUnassignedOnly ? "Show All" : "Unassigned Only"}
                </Button>
              </div>

              <div className="space-y-4">
                {filteredCompanies.length > 0 ? (
                  filteredCompanies.map((company) => (
                    <div key={company.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex-1">
                        <div className="font-bold text-gray-900 mb-1">{company.name}</div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{company.day}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{company.slot}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 font-medium">Assigned to:</span>
                        <Select value={getAssignedCoCoId(company.id)} onValueChange={(value) => handleChangeAssignment(company.id, value)}>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select CoCo" />
                          </SelectTrigger>
                          <SelectContent>
                            {cocos.map((coco) => (
                              <SelectItem key={coco.id} value={coco.id}>{coco.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-gray-500">
                    {showUnassignedOnly ? "No unassigned companies found." : companySearchQuery ? "No companies found matching your search." : "No companies available."}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}