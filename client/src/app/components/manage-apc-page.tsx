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
import { adminApi } from "@/app/lib/api";
import { toast } from "sonner";

interface Apc {
  id: string;
  instituteId?: string;
  name: string;
  email: string;
  phone: string;
}

export function ManageApcPage() {
  const [apcs, setApcs] = useState<Apc[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [newApcName, setNewApcName] = useState("");
  const [newApcEmail, setNewApcEmail] = useState("");
  const [newApcPhone, setNewApcPhone] = useState("");
  const [newApcInstituteId, setNewApcInstituteId] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addMethod, setAddMethod] = useState<"manual" | "excel">("manual");
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const normalizeApc = (raw: any): Apc => ({
    id: raw._id ?? raw.id ?? "",
    instituteId: raw.instituteId,
    name: raw.name ?? "—",
    email: raw.email ?? raw.user?.email ?? "—",
    phone: raw.contact ?? raw.phone ?? "—",
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const data: any = await adminApi.getApcs();
      const apcList = (Array.isArray(data) ? data : data.apcs ?? []).map(normalizeApc);
      setApcs(apcList);
    } catch (err: any) {
      toast.error("Failed to load data: " + (err.message ?? "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleAddApc = async () => {
    if (!newApcName || !newApcEmail || !newApcInstituteId || !newApcPhone) {
      toast.error("Please fill all required fields");
      return;
    }
    setSaving(true);
    try {
      const res: any = await adminApi.addApc({
        name: newApcName,
        email: newApcEmail,
        rollNumber: newApcInstituteId, // rollNumber is processed as instituteId/roll in service
        contact: newApcPhone,
      });
      toast.success(res.message || `APC ${newApcName} added! Credentials: ID=${res.credentials?.instituteId}, Password=${res.credentials?.password}`);
      setNewApcName("");
      setNewApcEmail("");
      setNewApcPhone("");
      setNewApcInstituteId("");
      setIsAddDialogOpen(false);
      await fetchAll();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add APC");
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
        const res: any = await adminApi.uploadApcExcel(formData);
        if (res.errors?.length > 0) {
          errorCount += res.errors.length;
          console.warn(`Excel import errors in ${file.name}:`, res.errors);
        }
      }
      toast.success("APCs uploaded successfully");
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

  const handleRemoveApc = async (id: string) => {
    try {
      await adminApi.removeApc({ apcId: id });
      setApcs((prev) => prev.filter((c) => c.id !== id));
      toast.success("APC removed");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to remove APC");
    }
  };

  const filteredApcs = apcs.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.instituteId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 gap-2">
        <Loader2 className="h-6 w-6 animate-spin" /> Loading APCs…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Manage APCs</h1>
          <p className="text-gray-500">Create and manage Sub-Admins / APCs</p>
        </div>
        <div className="flex gap-3">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 h-11 shadow-sm">
                <UserPlus className="h-4 w-4" />
                Add APC
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New APC</DialogTitle>
                <DialogDescription>
                  Choose how you want to add an APC - manually or via Excel upload.
                </DialogDescription>
              </DialogHeader>

              <div className="flex gap-2 border-b border-gray-200 pt-4">
                {(["manual", "excel"] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setAddMethod(method)}
                    className={`px-4 py-2 font-medium transition-colors border-b-2 ${addMethod === method
                        ? "border-emerald-600 text-emerald-600"
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
                      <Input id="name" placeholder="Enter name" value={newApcName} onChange={(e) => setNewApcName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="instId">Institute ID *</Label>
                      <Input id="instId" placeholder="Enter institute ID" value={newApcInstituteId} onChange={(e) => setNewApcInstituteId(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" type="email" placeholder="Enter email" value={newApcEmail} onChange={(e) => setNewApcEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone *</Label>
                      <Input id="phone" placeholder="Enter 10-digit phone number" value={newApcPhone} onChange={(e) => setNewApcPhone(e.target.value)} />
                    </div>
                    <p className="text-xs text-gray-500 mt-4">Username and random password will be auto-generated and sent via email.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-emerald-400 transition-colors relative">
                      {uploading && (
                        <div className="absolute inset-0 bg-white/50 z-10 flex flex-col items-center justify-center rounded-lg">
                          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-2" />
                          <span className="text-sm font-medium text-emerald-900">Uploading...</span>
                        </div>
                      )}
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="font-semibold text-gray-900 mb-2">Upload Excel File</h3>
                      <p className="text-sm text-gray-500 mb-4">Upload an Excel file (.xlsx, .xls) with APC details</p>
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
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <h4 className="font-semibold text-emerald-900 mb-2 text-sm">Excel Format Requirements:</h4>
                      <p className="text-xs text-emerald-800 mb-2">Columns must be exactly in this order with these names:</p>
                      <ul className="text-xs text-emerald-800 space-y-1 list-decimal list-inside">
                        <li><strong>Name</strong> (required)</li>
                        <li><strong>Email</strong> (required, unique)</li>
                        <li><strong>Institute ID</strong> (required, unique)</li>
                        <li><strong>Phone Number</strong> (required, 10 digits)</li>
                      </ul>
                      <p className="text-xs text-emerald-700 mt-2 font-semibold">Usernames and secure passwords will be automatically generated and emailed to all APCs.</p>
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
                  <Button onClick={handleAddApc} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Add APC
                  </Button>
                )}
                {addMethod === "excel" && (
                  <Button onClick={handleConfirmUpload} disabled={files.length === 0 || uploading} className="bg-emerald-600 hover:bg-emerald-700">
                    {uploading ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Uploading...</>
                    ) : (
                      "Add APCs"
                    )}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input type="text" placeholder="Search APCs by name or ID…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">APC Summary</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredApcs.map((apc) => (
            <Card key={apc.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg font-bold text-gray-900">
                    {apc.name} {apc.instituteId ? <span className="text-sm font-normal text-gray-500">({apc.instituteId})</span> : null}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 -mt-2 -mr-2"
                    onClick={(e) => { e.stopPropagation(); handleRemoveApc(apc.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                  <Mail className="h-5 w-5 text-emerald-600" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-0.5">Email</div>
                    <span className="text-sm text-gray-900 font-medium truncate block">{apc.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                  <span className="text-lg">📞</span>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-0.5">Phone</div>
                    <span className="text-sm text-gray-900 font-medium">{apc.phone || "—"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {filteredApcs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            {searchQuery ? "No APCs found matching your search." : "No APCs found in the database. Add one to get started!"}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
