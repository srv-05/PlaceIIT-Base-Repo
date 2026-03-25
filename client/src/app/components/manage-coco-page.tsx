import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Badge } from "@/app/components/ui/badge";
import {
  Users, UserPlus, Search, Building2, Calendar, Clock,
  MapPin, CheckCircle2, Circle, AlertCircle, Trash2, Shuffle, Check, ChevronsUpDown, Loader2, Upload, Mail, Filter
} from "lucide-react";
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
import { formatSlotLabel } from "@/app/lib/format";

interface CoCo {
  id: string;
  instituteId?: string;
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
  venue?: string;
  requiredCocosCount?: number;
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
      venue?: string;
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
  const [newCoCoRollNumber, setNewCoCoRollNumber] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addMethod, setAddMethod] = useState<"manual" | "excel">("manual");
  const [companySearchQuery, setCompanySearchQuery] = useState("");
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unallotted, setUnallotted] = useState<any[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningCompanyId, setAssigningCompanyId] = useState<string | null>(null);
  const [selectedCocos, setSelectedCocos] = useState<string[]>([]);

  const normalizeCoco = (raw: any): CoCo => ({
    id: raw._id ?? raw.id ?? "",
    instituteId: raw.instituteId,
    name: raw.name ?? "—",
    email: raw.email ?? raw.user?.email ?? "—",
    phone: raw.contact ?? raw.phone ?? "—",
    assignedCompanies: raw.assignedCompanies ?? [],
  });

  const normalizeCompany = (raw: any): Company => ({
    id: raw._id ?? raw.id ?? "",
    name: raw.name ?? "—",
    day: raw.day != null ? `Day ${raw.day}` : "—",
    slot: formatSlotLabel(raw.slot),
    venue: raw.venue ?? "Not Assigned",
    requiredCocosCount: raw.requiredCocosCount ?? 1,
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
      cocoList.forEach((coco: any) => {
        (coco.assignedCompanies ?? []).forEach((comp: any) => {
          const compId = typeof comp === "object" ? (comp._id || comp.id) : comp;
          if (compId) {
            assignmentList.push({ cocoId: coco.id, companyId: compId.toString() });
          }
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
    if (!newCoCoName || !newCoCoEmail || !newCoCoRollNumber || !newCoCoPhone) {
      toast.error("Please fill all required fields");
      return;
    }
    setSaving(true);
    try {
      const res: any = await adminApi.addCoco({
        name: newCoCoName,
        email: newCoCoEmail,
        rollNumber: newCoCoRollNumber,
        contact: newCoCoPhone,
      });
      toast.success(res.message || `CoCo ${newCoCoName} added! Credentials: ID=${res.credentials?.instituteId}, Password=${res.credentials?.password}`);
      setNewCoCoName("");
      setNewCoCoEmail("");
      setNewCoCoPhone("");
      setNewCoCoRollNumber("");
      setIsAddDialogOpen(false);
      await fetchAll();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add CoCo");
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const selected = Array.from(event.target.files);
      setFiles((prev) => [...prev, ...selected]);
    }
    event.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    let errorCount = 0;
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const res: any = await adminApi.uploadCocoExcel(formData);
        if (res.errors?.length > 0) {
          errorCount += res.errors.length;
          console.warn(`Excel import errors in ${file.name}:`, res.errors);
        }
      }
      
      toast.success("Co-Cos uploaded successfully");
      if (errorCount > 0) {
        toast.warning(`${errorCount} row(s) had issues across files. Check console.`);
      }
      
      setIsAddDialogOpen(false);
      setFiles([]);
      await fetchAll();
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
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

  const handleRandomAllocation = async () => {
    setLoading(true);
    try {
      const res: any = await adminApi.autoAllocateCocos();
      toast.success(`Auto-allocation completed! ${res.totalAllocated} companies allocated.`);
      if (res.warning) {
        toast.warning(res.warning, { duration: 8000 });
      }
      if (res.unallottedCompanies?.length > 0) {
        setUnallotted(res.unallottedCompanies);
      } else {
        setUnallotted([]);
      }
      await fetchAll();
    } catch (err: any) {
      toast.error(err.message ?? "Auto-allocation failed");
    } finally {
      setLoading(false);
    }
  };

  const getCoCoAssignments = (cocoId: string) =>
    assignments
      .filter((a) => a.cocoId === cocoId)
      .map((a) => companies.find((c) => c.id === a.companyId))
      .filter((c): c is Company => c !== undefined);

  const getAssignmentCount = (cocoId: string) =>
    assignments.filter((a) => a.cocoId === cocoId).length;

  const handleChangeAssignment = async (companyId: string, newCoCoId: string) => {
    // left for legacy support if needed
  };

  const handleUpdateRequiredCocosCount = async (companyId: string, count: number) => {
    try {
      await adminApi.updateCompany(companyId, { requiredCocosCount: count });
      setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, requiredCocosCount: count } : c));
      toast.success("Updated required CoCos count");
    } catch(err: any) {
      toast.error(err.message ?? "Failed to update required CoCos count");
    }
  };

  const getCoCosAssignedToCompany = (companyId: string) =>
    assignments
      .filter((a) => a.companyId === companyId)
      .map((a) => cocos.find((c) => c.id === a.cocoId))
      .filter((c): c is CoCo => c !== undefined);

  const openAssignDialog = (companyId: string) => {
    const comp = companies.find((c) => c.id === companyId);
    if (!comp) return;
    setAssigningCompanyId(companyId);
    setAssignDialogOpen(true);
    const currAssigned = assignments.filter((a) => a.companyId === companyId).map((a) => a.cocoId);
    const req = comp.requiredCocosCount || 1;
    const initialArr = [...currAssigned];
    while (initialArr.length < req) {
      initialArr.push("");
    }
    initialArr.length = req;
    setSelectedCocos(initialArr);
  };

  const handleConfirmAssignmentDialog = async () => {
    if (!assigningCompanyId) return;
    const comp = companies.find((c) => c.id === assigningCompanyId);
    if (!comp) return;

    const req = comp.requiredCocosCount || 1;
    const valid = selectedCocos.filter((id) => id.trim() !== "");
    if (valid.length < req) {
      toast.warning(`Warning: Assigned less than the required ${req} CoCo(s). Company is set to yellow.`);
    }

    try {
      const oldAssigned = assignments.filter((a) => a.companyId === assigningCompanyId).map((a) => a.cocoId);
      const added = valid.filter((id) => !oldAssigned.includes(id));
      const removed = oldAssigned.filter((id) => !valid.includes(id));

      for (const id of removed) {
        await adminApi.removeCoco({ cocoId: id, companyId: assigningCompanyId });
      }

      for (const id of added) {
        await adminApi.assignCoco({ cocoId: id, companyId: assigningCompanyId });
      }
      
      toast.success("Assignments updated successfully!");
      setAssignDialogOpen(false);
      await fetchAll();
    } catch (err: any) {
      toast.error(err.message ?? "Assignment failed");
      await fetchAll();
    }
  };

  const handleRemoveOneCoco = async (companyId: string, cocoId: string) => {
    try {
      await adminApi.removeCoco({ cocoId, companyId });
      toast.success("CoCo removed successfully");
      await fetchAll();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to remove CoCo");
    }
  };

  const getAssignedCoCoId = (companyId: string) =>
    assignments.find((a) => a.companyId === companyId)?.cocoId || "";

  const isCocoBusy = (cocoId: string, day: string, slot: string) => {
    const cocoAssignments = assignments
      .filter((a) => a.cocoId === cocoId)
      .map((a) => companies.find((c) => c.id === a.companyId))
      .filter((c): c is Company => c !== undefined);
    return cocoAssignments.some((c) => c.day === day && c.slot === slot);
  };

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
                      <Label htmlFor="rollNumber">Roll Number *</Label>
                      <Input id="rollNumber" placeholder="Enter roll number" value={newCoCoRollNumber} onChange={(e) => setNewCoCoRollNumber(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" type="email" placeholder="Enter email" value={newCoCoEmail} onChange={(e) => setNewCoCoEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone *</Label>
                      <Input id="phone" placeholder="Enter 10-digit phone number" value={newCoCoPhone} onChange={(e) => setNewCoCoPhone(e.target.value)} />
                    </div>
                    <p className="text-xs text-gray-500 mt-4">Username (cocoX) and random password will be auto-generated and sent via email.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors relative">
                      {uploading && (
                        <div className="absolute inset-0 bg-white/50 z-10 flex flex-col items-center justify-center rounded-lg">
                          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
                          <span className="text-sm font-medium text-indigo-900">Uploading...</span>
                        </div>
                      )}
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="font-semibold text-gray-900 mb-2">Upload Excel File</h3>
                      <p className="text-sm text-gray-500 mb-4">Upload an Excel file (.xlsx, .xls) with CoCo requirements</p>
                      <input id="excel-upload" type="file" multiple accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />
                      <Button type="button" variant="outline" onClick={() => document.getElementById("excel-upload")?.click()} disabled={uploading}>
                        <Upload className="h-4 w-4 mr-2" />
                        Choose Files
                      </Button>
                    </div>

                    {files.length > 0 && (
                      <div className="bg-white border rounded-lg p-4 space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700">Selected Files:</h4>
                        {files.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm text-gray-600 border">
                            <span className="truncate">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => removeFile(idx)}
                              className="text-red-500 hover:text-red-700 p-1"
                              disabled={uploading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2 text-sm">Excel Format Requirements:</h4>
                      <p className="text-xs text-blue-800 mb-2">Columns must be exactly in this order with these names:</p>
                      <ul className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                        <li><strong>Name</strong> (required)</li>
                        <li><strong>Email</strong> (required, unique)</li>
                        <li><strong>Roll Number</strong> (required, unique)</li>
                        <li><strong>Phone Number</strong> (required, 10 digits)</li>
                      </ul>
                      <p className="text-xs text-blue-700 mt-2 font-semibold">Usernames and secure passwords will be automatically generated and emailed to all Co-Cos.</p>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setIsAddDialogOpen(false);
                  setFiles([]);
                }} disabled={uploading}>Cancel</Button>
                {addMethod === "manual" && (
                  <Button onClick={handleAddCoCo} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Add CoCo
                  </Button>
                )}
                {addMethod === "excel" && (
                  <Button onClick={handleConfirmUpload} disabled={files.length === 0 || uploading}>
                    {uploading ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Uploading...</>
                    ) : (
                      "Add Co-Cos"
                    )}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {unallotted.length > 0 && (
        <Card className="border-2 border-red-200 shadow-md bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Unallotted Companies ({unallotted.length})
            </CardTitle>
            <p className="text-sm text-red-600">
              These companies were not allotted any CoCos (More companies than CoCos). Please allocate manually or add more CoCos.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {unallotted.map((comp: any) => (
                <Badge key={comp.id || comp._id} variant="outline" className="bg-white border-red-200 text-red-700">
                  {comp.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                  <CardTitle className="text-lg font-bold text-gray-900">
                    {coco.name} {coco.instituteId ? <span className="text-sm font-normal text-gray-500">({coco.instituteId})</span> : null}
                  </CardTitle>
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
                  filteredCompanies.map((company) => {
                    const assignedCount = getCoCosAssignedToCompany(company.id).length;
                    const requiredCount = company.requiredCocosCount || 1;
                    
                    let bgColorClass = "bg-gray-50 hover:bg-gray-100";
                    if (assignedCount === 0) {
                      bgColorClass = "bg-red-50 hover:bg-red-100 border border-red-200";
                    } else if (assignedCount < requiredCount) {
                      bgColorClass = "bg-yellow-50 hover:bg-yellow-100 border border-yellow-200";
                    } else {
                      bgColorClass = "bg-green-50 hover:bg-green-100 border border-green-200";
                    }

                    return (
                    <div key={company.id} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg transition-colors ${bgColorClass}`}>
                      <div className="flex-1 w-full mb-4 sm:mb-0">
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
                            {cocos.map((coco) => {
                              const alreadyAssigned = isCocoBusy(coco.id, company.day, company.slot);
                              const isCurrentAssignment = getAssignedCoCoId(company.id) === coco.id;
                              const disabled = alreadyAssigned && !isCurrentAssignment;
                              return (
                                <SelectItem key={coco.id} value={coco.id} disabled={disabled}>
                                  {coco.name} {coco.instituteId ? `(${coco.instituteId})` : ""} {disabled ? "(Busy)" : ""}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })
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
      {/* Assign CoCos Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign CoCos</DialogTitle>
            <DialogDescription>
              Please fulfill exactly {companies.find(c => c.id === assigningCompanyId)?.requiredCocosCount || 1} required CoCo slot(s).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedCocos.map((sc, idx) => (
              <div key={idx} className="space-y-1">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Slot {idx + 1}</Label>
                <Select
                  value={sc || "unassigned"}
                  onValueChange={(val) => {
                    const next = [...selectedCocos];
                    next[idx] = val === "unassigned" ? "" : val;
                    setSelectedCocos(next);
                  }}
                >
                  <SelectTrigger>
                     <SelectValue placeholder="Select a CoCo..." />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectItem value="unassigned" className="text-gray-400 italic">Unassigned</SelectItem>
                     {cocos.map(coco => {
                        const isSelectedElsewhere = selectedCocos.some((v, i) => v === coco.id && i !== idx);
                        // Prevent selecting the same Coco multiple times
                        if (isSelectedElsewhere) return null;
                        return (
                          <SelectItem key={coco.id} value={coco.id}>
                            {coco.name} {coco.instituteId ? `(${coco.instituteId})` : ""}
                          </SelectItem>
                        );
                     })}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmAssignmentDialog}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}