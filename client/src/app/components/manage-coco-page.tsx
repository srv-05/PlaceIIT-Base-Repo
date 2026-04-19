import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Badge } from "@/app/components/ui/badge";
import {
  Users, UserPlus, Search, Building2, Calendar, Clock,
  MapPin, CheckCircle2, Circle, AlertCircle, Trash2, Shuffle, Check, ChevronsUpDown, Loader2, Upload, Mail, Filter,
  Plus, Minus
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
  rawSlot: string;
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
  const [cocoStatusFilter, setCocoStatusFilter] = useState<"all" | "assigned" | "unassigned">("all");
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

  // Confirmation dialog for single-slot assignment changes
  const [confirmAssignOpen, setConfirmAssignOpen] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState<{ companyId: string; slotIdx: number; newCocoId: string; oldCocoId: string } | null>(null);

  // Confirmation dialog for slot count changes
  const [confirmSlotCountOpen, setConfirmSlotCountOpen] = useState(false);
  const [pendingSlotCount, setPendingSlotCount] = useState<{ companyId: string; newCount: number; oldCount: number } | null>(null);

  // Drive state for filtering
  const [driveDay, setDriveDay] = useState<number | null>(null);
  const [driveSlot, setDriveSlot] = useState<string | null>(null);

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
    rawSlot: raw.slot ?? "",
    venue: raw.venue ?? "Not Assigned",
    requiredCocosCount: raw.requiredCocosCount ?? 1,
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // Pass drive state filters to backend so assignedCompanies is pre-filtered
      const cocoParams: { day?: number; slot?: string } = {};
      if (driveDay != null) cocoParams.day = driveDay;
      if (driveSlot) cocoParams.slot = driveSlot;

      const [cocosData, companiesData]: any[] = await Promise.all([
        adminApi.getCocos(Object.keys(cocoParams).length > 0 ? cocoParams : undefined),
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
  }, [driveDay, driveSlot]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Fetch drive state
  useEffect(() => {
    adminApi.getDriveState().then((data: any) => {
      setDriveDay(data.currentDay ?? null);
      setDriveSlot(data.currentSlot ?? null);
    }).catch(() => { });
  }, []);

  const handleAddCoCo = async () => {
    if (!newCoCoName || !newCoCoEmail || !newCoCoRollNumber || !newCoCoPhone) {
      toast.error("Please fill all required fields");
      return;
    }
    if (!/^\d+$/.test(newCoCoRollNumber.trim())) {
      toast.error("Roll number can only contain digits");
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
      await adminApi.deleteCoco(id);
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
      const params: { day?: number; slot?: string } = {};
      if (driveDay != null) params.day = driveDay;
      if (driveSlot) params.slot = driveSlot;
      const res: any = await adminApi.autoAllocateCocos(params);
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

  // Helper: get companies matching the active drive day/slot
  const isDriveMatch = (company: Company) => {
    if (driveDay != null && company.day !== `Day ${driveDay}`) return false;
    if (driveSlot && company.rawSlot !== driveSlot) return false;
    return true;
  };

  const getCoCoAssignments = (cocoId: string) =>
    assignments
      .filter((a) => a.cocoId === cocoId)
      .map((a) => companies.find((c) => c.id === a.companyId))
      .filter((c): c is Company => c !== undefined)
      .filter(isDriveMatch);

  const getAssignmentCount = (cocoId: string) =>
    getCoCoAssignments(cocoId).length;

  const isCocoAssigned = (cocoId: string) =>
    getAssignmentCount(cocoId) > 0;

  // Get cocos unassigned within the current drive day/slot
  const getUnassignedCocos = () =>
    cocos.filter((c) => !isCocoAssigned(c.id));

  const handleRequestAssignmentChange = (companyId: string, slotIdx: number, newCocoId: string, oldCocoId: string) => {
    setPendingAssignment({ companyId, slotIdx, newCocoId, oldCocoId });
    setConfirmAssignOpen(true);
  };

  const handleConfirmSingleAssignment = async () => {
    if (!pendingAssignment) return;
    const { companyId, newCocoId, oldCocoId } = pendingAssignment;
    try {
      // Remove old assignment if exists
      if (oldCocoId) {
        await adminApi.removeCoco({ cocoId: oldCocoId, companyId });
      }
      // Add new assignment if not "none"
      if (newCocoId && newCocoId !== "none") {
        await adminApi.assignCoco({ cocoId: newCocoId, companyId });
      }
      toast.success("Assignment updated successfully");
      await fetchAll();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update assignment");
      await fetchAll();
    } finally {
      setConfirmAssignOpen(false);
      setPendingAssignment(null);
    }
  };

  const handleCancelSingleAssignment = () => {
    setConfirmAssignOpen(false);
    setPendingAssignment(null);
  };

  const handleRequestSlotCountChange = (companyId: string, newCount: number, oldCount: number) => {
    setPendingSlotCount({ companyId, newCount, oldCount });
    setConfirmSlotCountOpen(true);
  };

  const handleConfirmSlotCountChange = async () => {
    if (!pendingSlotCount) return;
    const { companyId, newCount, oldCount } = pendingSlotCount;
    try {
      // If decreasing, deallocate cocos from removed slots
      if (newCount < oldCount) {
        const currentlyAssigned = getCoCosAssignedToCompany(companyId);
        const cocosToRemove = currentlyAssigned.slice(newCount);
        for (const coco of cocosToRemove) {
          await adminApi.removeCoco({ cocoId: coco.id, companyId });
        }
      }
      await adminApi.updateCompany(companyId, { requiredCocosCount: newCount });
      setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, requiredCocosCount: newCount } : c));
      toast.success(`Updated required CoCo slots to ${newCount}`);
      await fetchAll();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update slot count");
      await fetchAll();
    } finally {
      setConfirmSlotCountOpen(false);
      setPendingSlotCount(null);
    }
  };

  const handleCancelSlotCountChange = () => {
    setConfirmSlotCountOpen(false);
    setPendingSlotCount(null);
  };

  const handleUpdateRequiredCocosCount = async (companyId: string, count: number) => {
    try {
      await adminApi.updateCompany(companyId, { requiredCocosCount: count });
      setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, requiredCocosCount: count } : c));
      toast.success("Updated required CoCos count");
    } catch (err: any) {
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

  const filteredCocos = cocos.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const assigned = isCocoAssigned(c.id);
    const matchesStatus =
      cocoStatusFilter === "all" ||
      (cocoStatusFilter === "assigned" && assigned) ||
      (cocoStatusFilter === "unassigned" && !assigned);
    return matchesSearch && matchesStatus;
  });

  const filteredCompanies = companies.filter((company) => {
    const matchesSearch = company.name.toLowerCase().includes(companySearchQuery.toLowerCase());
    const isUnassigned = !getAssignedCoCoId(company.id);
    // Filter by active drive state day/slot
    if (driveDay != null && company.day !== `Day ${driveDay}`) return false;
    if (driveSlot && company.rawSlot !== driveSlot) return false;
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                      <Input id="phone" placeholder="Enter 10-digit phone number" inputMode="numeric" maxLength={10} value={newCoCoPhone} onChange={(e) => setNewCoCoPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} />
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

      {/* Search Bar + Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input type="text" placeholder="Search CoCos by name…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={cocoStatusFilter} onValueChange={(v: "all" | "assigned" | "unassigned") => setCocoStatusFilter(v)}>
              <SelectTrigger className="w-44">
                <Filter className="h-4 w-4 mr-2 text-gray-400" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* CoCo Summary Cards */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">CoCo Summary</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCocos.map((coco) => {
            const assigned = isCocoAssigned(coco.id);
            return (
              <Card key={coco.id} className="hover:shadow-lg transition-shadow duration-200 cursor-pointer relative" onClick={() => handleCoCoCardClick(coco)}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-bold text-gray-900">
                      {coco.name} {coco.instituteId ? <span className="text-sm font-normal text-gray-500">({coco.instituteId})</span> : null}
                    </CardTitle>
                    <div className="flex items-center gap-2 -mt-1 -mr-1">
                      <Badge className={assigned
                        ? "bg-green-100 text-green-800 border border-green-300 text-xs"
                        : "bg-gray-100 text-gray-600 border border-gray-300 text-xs"
                      }>
                        {assigned ? "Assigned" : "Unassigned"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => { e.stopPropagation(); handleRemoveCoCo(coco.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
            );
          })}
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

                    const assignedCocosList = getCoCosAssignedToCompany(company.id);
                    // Build slot array: assigned cocos first, then empty slots
                    const slots: string[] = assignedCocosList.map(c => c.id);
                    while (slots.length < requiredCount) slots.push("");
                    // Only show up to requiredCount slots
                    slots.length = requiredCount;

                    return (
                      <div key={company.id} className={`p-4 rounded-lg transition-colors ${bgColorClass}`}>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3">
                          <div className="flex-1 w-full mb-2 sm:mb-0">
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
                          {/* Slot count selector */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 font-medium">CoCo Slots:</span>
                            <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg px-1 py-0.5">
                              <button
                                className="p-0.5 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30"
                                disabled={requiredCount <= 1}
                                onClick={() => handleRequestSlotCountChange(company.id, requiredCount - 1, requiredCount)}
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="text-sm font-bold text-gray-800 w-6 text-center">{requiredCount}</span>
                              <button
                                className="p-0.5 rounded hover:bg-gray-100 text-gray-500"
                                onClick={() => handleRequestSlotCountChange(company.id, requiredCount + 1, requiredCount)}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                        {/* Assignment slots */}
                        <div className="space-y-2">
                          {slots.map((slotCocoId, slotIdx) => {
                            const assignedCoco = cocos.find(c => c.id === slotCocoId);
                            // Available cocos: only globally unassigned + the one currently in this slot
                            const availableCocos = cocos.filter(c => {
                              if (c.id === slotCocoId) return true; // current assignment
                              // Check day/slot conflict
                              if (isCocoBusy(c.id, company.day, company.slot)) return false;
                              return true;
                            });
                            return (
                              <div key={slotIdx} className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 font-medium w-14 shrink-0">CoCo {slotIdx + 1}:</span>
                                <Select
                                  value={slotCocoId || "none"}
                                  onValueChange={(value) => {
                                    const newId = value === "none" ? "" : value;
                                    handleRequestAssignmentChange(company.id, slotIdx, newId, slotCocoId);
                                  }}
                                >
                                  <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Select CoCo" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none" className="text-gray-400 italic">No Assignment</SelectItem>
                                    {availableCocos.map((coco) => (
                                      <SelectItem key={coco.id} value={coco.id}>
                                        {coco.name} {coco.instituteId ? `(${coco.instituteId})` : ""}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {assignedCoco && (
                                  <Badge className="bg-green-100 text-green-700 border border-green-300 text-xs shrink-0">Assigned</Badge>
                                )}
                                {!assignedCoco && (
                                  <Badge className="bg-gray-100 text-gray-500 border border-gray-300 text-xs shrink-0">Unassigned</Badge>
                                )}
                              </div>
                            );
                          })}
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
      {/* Assign CoCos Dialog (legacy — kept for openAssignDialog callers) */}
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
                      if (isSelectedElsewhere) return null;

                      const comp = companies.find(c => c.id === assigningCompanyId);
                      if (comp && isCocoBusy(coco.id, comp.day, comp.slot) && !selectedCocos.includes(coco.id)) return null;
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

      {/* Confirmation dialog for single assignment change */}
      <Dialog open={confirmAssignOpen} onOpenChange={(open) => { if (!open) handleCancelSingleAssignment(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Assignment Change</DialogTitle>
            <DialogDescription>
              {pendingAssignment && (
                pendingAssignment.newCocoId
                  ? `Are you sure you want to assign ${cocos.find(c => c.id === pendingAssignment.newCocoId)?.name ?? "this CoCo"} to ${companies.find(c => c.id === pendingAssignment.companyId)?.name ?? "this company"}?`
                  : `Are you sure you want to clear the assignment for ${companies.find(c => c.id === pendingAssignment.companyId)?.name ?? "this company"}?`
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelSingleAssignment}>Cancel</Button>
            <Button onClick={handleConfirmSingleAssignment}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog for slot count change */}
      <Dialog open={confirmSlotCountOpen} onOpenChange={(open) => { if (!open) handleCancelSlotCountChange(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Slot Count Change</DialogTitle>
            <DialogDescription>
              {pendingSlotCount && (
                pendingSlotCount.newCount > pendingSlotCount.oldCount
                  ? `Increase CoCo slots from ${pendingSlotCount.oldCount} to ${pendingSlotCount.newCount} for ${companies.find(c => c.id === pendingSlotCount.companyId)?.name ?? "this company"}?`
                  : `Decrease CoCo slots from ${pendingSlotCount.oldCount} to ${pendingSlotCount.newCount}? Any assigned CoCos in removed slots will be automatically deallocated.`
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelSlotCountChange}>Cancel</Button>
            <Button onClick={handleConfirmSlotCountChange}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}