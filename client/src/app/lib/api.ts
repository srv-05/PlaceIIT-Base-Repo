/**
 * API Service Layer — centralised HTTP client for the PlaceIIT backend.
 * All requests go through the Vite proxy (/api → http://localhost:5001/api).
 */

const API_BASE = "/api";

/* ──────────────────── token helpers ──────────────────── */
export function getToken(): string | null {
    return localStorage.getItem("token");
}

export function setToken(token: string) {
    localStorage.setItem("token", token);
}

export function clearToken() {
    localStorage.removeItem("token");
}

/* ──────────────────── generic fetcher ──────────────────── */
async function request<T = unknown>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    // Handle non-JSON responses (e.g., 204 No Content)
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};

    if (!res.ok) {
        const message = data?.message || `Request failed (${res.status})`;
        const err = new Error(message) as Error & { data: any; status: number };
        err.data = data;
        err.status = res.status;
        throw err;
    }

    return data as T;
}

/* ──────────── multipart (file upload) fetcher ──────────── */
async function uploadRequest<T = unknown>(
    endpoint: string,
    formData: FormData
): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers,
        body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Upload failed");
    return data as T;
}

/* ═══════════════════════════════════════════════════════════
   AUTH
   ═══════════════════════════════════════════════════════════ */
export interface LoginResponse {
    token: string;
    user: { id: string; instituteId: string; role: string; email: string; mustChangePassword?: boolean; isMainAdmin?: boolean };
}

export const authApi = {
    login: (instituteId: string, password: string, role?: string) =>
        request<LoginResponse>("/auth/login", {
            method: "POST",
            body: JSON.stringify({ instituteId, password, role }),
        }),

    getMe: () => request<{ _id: string; instituteId: string; role: string; email: string; mustChangePassword?: boolean; isMainAdmin?: boolean }>("/auth/me"),

    changePassword: (
        newPassword: string,
        currentPassword?: string,
        profileData?: {
            emergencyContact: { name: string; phone: string };
            friendContact: { name: string; phone: string };
        }
    ) =>
        request<{ message: string; user: any }>("/auth/change-password", {
            method: "POST",
            body: JSON.stringify({ newPassword, currentPassword, ...profileData }),
        }),

    forgotPassword: {
        sendOtp: (email: string, role?: string) =>
            request<{ message: string }>("/auth/forgot-password/send-otp", {
                method: "POST",
                body: JSON.stringify({ email, role }),
            }),

        verifyOtp: (email: string, otp: string, role?: string) =>
            request<{ message: string }>("/auth/forgot-password/verify-otp", {
                method: "POST",
                body: JSON.stringify({ email, otp, role }),
            }),

        resetPassword: (email: string, otp: string, newPassword: string, role?: string) =>
            request<{ message: string }>("/auth/forgot-password/reset", {
                method: "POST",
                body: JSON.stringify({ email, otp, newPassword, role }),
            }),
    },
};

/* ═══════════════════════════════════════════════════════════
   STUDENT
   ═══════════════════════════════════════════════════════════ */
export const studentApi = {
    getProfile: () => request("/student/profile"),
    updateProfile: (data: Record<string, unknown>) =>
        request("/student/profile", { method: "PUT", body: JSON.stringify(data) }),
    /** Returns shortlisted companies for the logged-in student */
    getCompanies: () => request("/student/companies"),
    getMyCompanies: () => request("/student/companies"),
    /** Join the queue for a shortlisted company */
    joinQueue: (companyId: string, round?: string) =>
        request("/student/queue/join", { method: "POST", body: JSON.stringify({ companyId, round }) }),
    /** Join a walk-in queue */
    joinWalkInQueue: (companyId: string, round?: string) =>
        request("/student/queue/walkin", { method: "POST", body: JSON.stringify({ companyId, round }) }),
    /** @deprecated use joinWalkInQueue */
    joinWalkIn: (companyId: string, round?: string) =>
        request("/student/queue/walkin", { method: "POST", body: JSON.stringify({ companyId, round }) }),
    /** Leave the queue for a company (soft-delete: sets status to exited) */
    leaveQueue: (companyId: string, round?: string) =>
        request("/student/queue/leave", { method: "POST", body: JSON.stringify({ companyId, round }) }),
    /** Confirm queue switch: exit fromCompany, join toCompany as pending */
    confirmSwitch: (fromCompanyId: string, toCompanyId: string, isWalkIn = false, fromRound?: string, toRound?: string) =>
        request("/student/queue/confirm-switch", {
            method: "POST",
            body: JSON.stringify({ fromCompanyId, toCompanyId, isWalkIn, fromRound, toRound }),
        }),
    getQueuePosition: (companyId: string, round?: string) =>
        request(`/student/queue/${companyId}${round ? `?round=${encodeURIComponent(round)}` : ''}`),
    getWalkIns: () => request("/student/walkins"),
    getNotifications: () => request("/student/notifications"),
    markNotifRead: (id: string) =>
        request(`/student/notifications/${id}/read`, { method: "PUT" }),
    markAllNotifRead: () =>
        request("/student/notifications/read-all", { method: "PUT" }),
    clearAllNotifications: () =>
        request("/student/notifications", { method: "DELETE" }),
    submitQuery: (data: { subject: string; message: string }) =>
        request("/student/queries", { method: "POST", body: JSON.stringify(data) }),
    getMyQueries: () => request("/student/queries"),
    uploadResume: (file: File) => {
        const formData = new FormData();
        formData.append("resume", file);
        const token = getToken();
        return fetch(`${API_BASE}/student/resume`, {
            method: "POST",
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: formData,
        }).then(async (res) => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.message ?? "Upload failed");
            return data;
        });
    },
    getDriveState: () => request("/student/drive-state"),
    getContacts: () => request("/student/contacts"),
};

/* ═══════════════════════════════════════════════════════════
   COCO (Coordinator)
   ═══════════════════════════════════════════════════════════ */
export const cocoApi = {
    getAssignedCompany: () => request("/coco/company"),
    getShortlistedStudents: (companyId: string) =>
        request(`/coco/company/${companyId}/students`),
    getRounds: (companyId: string) =>
        request(`/coco/company/${companyId}/rounds`),
    getPanels: (companyId: string) =>
        request(`/coco/company/${companyId}/panels`),
    toggleWalkIn: (companyId: string, data: { enabled: boolean }) =>
        request(`/coco/company/${companyId}/walkin`, { method: "PUT", body: JSON.stringify(data) }),
    updateVenue: (companyId: string, venue: string) =>
        request(`/coco/company/${companyId}/venue`, { method: "PUT", body: JSON.stringify({ venue }) }),
    addStudentToQueue: (data: { companyId: string; studentId: string }) =>
        request("/coco/queue/add", { method: "POST", body: JSON.stringify(data) }),
    updateStudentStatus: (data: { studentId: string; companyId: string; status: string; round?: string }) =>
        request("/coco/queue/status", { method: "PUT", body: JSON.stringify(data) }),
    updateProfile: (data: { name?: string; contact?: string }) =>
        request("/coco/profile", { method: "PUT", body: JSON.stringify(data) }),
    sendNotification: (data: { studentUserId: string; companyId?: string; message: string }) =>
        request("/coco/notify", { method: "POST", body: JSON.stringify(data) }),
    getPredefinedNotifications: () =>
        request("/coco/notifications/predefined"),
    getNotifications: () =>
        request("/coco/notifications"),
    markNotifRead: (id: string) =>
        request(`/coco/notifications/${id}/read`, { method: "PUT" }),
    clearAllNotifications: () =>
        request("/coco/notifications", { method: "DELETE" }),
    addPanel: (data: Record<string, unknown>) =>
        request("/coco/panel", { method: "POST", body: JSON.stringify(data) }),
    updatePanel: (panelId: string, data: Record<string, unknown>) =>
        request(`/coco/panel/${panelId}`, { method: "PUT", body: JSON.stringify(data) }),
    assignPanelStudent: (panelId: string, data: { studentId: string }) =>
        request(`/coco/panel/${panelId}/assign`, { method: "PUT", body: JSON.stringify(data) }),
    clearPanel: (panelId: string) =>
        request(`/coco/panel/${panelId}/clear`, { method: "PUT" }),
    deletePanel: (panelId: string) =>
        request(`/coco/panel/${panelId}`, { method: "DELETE" }),
    addRound: (data: Record<string, unknown>) =>
        request("/coco/round", { method: "POST", body: JSON.stringify(data) }),
    searchStudents: (query: string) =>
        request(`/coco/students/search?q=${encodeURIComponent(query)}`),
    getStudentCompanies: (studentId: string) =>
        request(`/coco/students/${studentId}/companies`),
    addStudentToRound: (data: { studentId: string; companyId: string; roundId?: string; roundNumber?: number }) =>
        request("/coco/round/add-student", { method: "POST", body: JSON.stringify(data) }),
    uploadRoundExcel: (formData: FormData) =>
        uploadRequest("/coco/round/upload-students", formData),
    /** Add student to company shortlist (from CoCo portal) */
    addStudentToCompany: (data: { studentId: string; companyId: string }) =>
        request("/coco/company/add-student", { method: "POST", body: JSON.stringify(data) }),
    /** Promote students to the next round via Excel upload */
    promoteStudentsExcel: (formData: FormData) =>
        uploadRequest("/coco/round/promote", formData),
    /** Get pending queue join requests for a company */
    getPendingRequests: (companyId: string, round?: string) =>
        request(`/coco/company/${companyId}/pending${round ? `?round=${encodeURIComponent(round)}` : ''}`),
    /** Accept a pending queue request */
    acceptStudent: (data: { studentId: string; companyId: string; round?: string }) =>
        request("/coco/queue/accept", { method: "PUT", body: JSON.stringify(data) }),
    /** Reject a pending queue request */
    rejectStudent: (data: { studentId: string; companyId: string; round?: string }) =>
        request("/coco/queue/reject", { method: "PUT", body: JSON.stringify(data) }),
    /** Mark student interview as completed */
    markCompleted: (data: { studentId: string; companyId: string; round?: string }) =>
        request("/coco/queue/complete", { method: "PUT", body: JSON.stringify(data) }),
    getDriveState: () => request("/coco/drive-state"),
    incrementTotalRounds: (companyId: string) =>
        request(`/coco/company/${companyId}/total-rounds`, { method: "PATCH" }),
    deleteRound: (companyId: string, roundNumber: number) =>
        request(`/coco/company/${companyId}/round/${roundNumber}`, { method: "DELETE" }),
};

/* ═══════════════════════════════════════════════════════════
   ADMIN (APC in frontend)
   ═══════════════════════════════════════════════════════════ */
export const adminApi = {
    getStats: () => request("/admin/stats"),
    getCompanies: () => request("/admin/companies"),
    addCompany: (data: Record<string, unknown>) =>
        request("/admin/companies", { method: "POST", body: JSON.stringify(data) }),
    updateCompany: (id: string, data: Record<string, unknown>) =>
        request(`/admin/companies/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    searchStudents: (query: string) =>
        request(`/admin/students/search?q=${encodeURIComponent(query)}`),
    getCocos: (params?: { day?: number; slot?: string }) => {
        const queryParts: string[] = [];
        if (params?.day != null) queryParts.push(`day=${params.day}`);
        if (params?.slot) queryParts.push(`slot=${encodeURIComponent(params.slot)}`);
        const qs = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
        return request(`/admin/cocos${qs}`);
    },
    /** Add a new CoCo directly (name, email, rollNumber, contact) */
    addCoco: (data: Record<string, unknown>) =>
        request("/admin/cocos", { method: "POST", body: JSON.stringify(data) }),
    /** Add a new Student directly (name, rollNumber only required) */
    addStudent: (data: Record<string, unknown>) =>
        request("/admin/students", { method: "POST", body: JSON.stringify(data) }),
    assignCoco: (data: { cocoId: string; companyId: string }) =>
        request("/admin/assign-coco", { method: "POST", body: JSON.stringify(data) }),
    removeCoco: (data: { cocoId: string; companyId: string }) =>
        request("/admin/remove-coco", { method: "POST", body: JSON.stringify(data) }),
    deleteCoco: (cocoId: string) =>
        request(`/admin/cocos/${cocoId}`, { method: "DELETE" }),
    deleteStudent: (studentId: string) =>
        request(`/admin/students/${studentId}`, { method: "DELETE" }),
    uploadCompanyExcel: (formData: FormData) =>
        uploadRequest("/admin/upload/companies", formData),
    uploadShortlistExcel: (formData: FormData) =>
        uploadRequest("/admin/upload/shortlist", formData),
    uploadCocoExcel: (formData: FormData) =>
        uploadRequest("/admin/upload/cocos", formData),
    uploadStudentExcel: (formData: FormData) =>
        uploadRequest("/admin/upload/students", formData),
    uploadCocoRequirementsExcel: (formData: FormData) =>
        uploadRequest("/admin/upload/coordinator-requirements", formData),
    getUploadStatus: (id: string) => request(`/admin/upload/${id}`),
    getShortlistedStudents: (companyId: string) =>
        request(`/admin/companies/${companyId}/students`),
    shortlistStudents: (companyId: string, rollNumbers: string[]) =>
        request("/admin/students/shortlist", { method: "POST", body: JSON.stringify({ companyId, rollNumbers }) }),
    getStudentCompanies: (studentId: string) =>
        request(`/admin/students/${studentId}/companies`),
    /** @deprecated use addCoco instead */
    registerUser: (data: Record<string, unknown>) =>
        request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
    autoAllocateCocos: (params?: { day?: number; slot?: string }) =>
        request("/admin/auto-allocate-cocos", { method: "POST", body: JSON.stringify(params ?? {}) }),
    getCocoConflicts: () =>
        request("/admin/coco-conflicts"),
    getQueries: () => request("/admin/queries"),
    respondToQuery: (id: string, data: { response: string; status: string }) =>
        request(`/admin/queries/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    /** Add an APC */
    addApc: (data: Record<string, unknown>) =>
        request("/admin/apc", { method: "POST", body: JSON.stringify(data) }),
    getApcs: () => request("/admin/apcs"),
    removeApc: (data: { apcId: string }) =>
        request("/admin/remove-apc", { method: "POST", body: JSON.stringify(data) }),
    uploadApcExcel: (formData: FormData) =>
        uploadRequest("/admin/upload/apcs", formData),
    getDriveState: () => request("/admin/drive-state"),
    updateDriveState: (data: { day: number; slot: string }) =>
        request("/admin/drive-state", { method: "PUT", body: JSON.stringify(data) }),
    updateProfile: (data: { name?: string; phone?: string }) =>
        request("/admin/profile", { method: "PUT", body: JSON.stringify(data) }),
    sendBroadcastNotification: (data: { message: string; type: string; audience: string }) =>
        request("/admin/broadcast-notification", { method: "POST", body: JSON.stringify(data) }),
    getNotifications: () => request("/admin/notifications"),
    markNotifRead: (id: string) =>
        request(`/admin/notifications/${id}/read`, { method: "PUT" }),
    clearAllNotifications: () =>
        request("/admin/notifications", { method: "DELETE" }),
    // Bulk reset endpoints
    resetAllSubApcs: () =>
        request("/admin/reset/apcs", { method: "POST" }),
    resetAllStudents: () =>
        request("/admin/reset/students", { method: "POST" }),
    resetAllCocos: () =>
        request("/admin/reset/cocos", { method: "POST" }),
    resetAllCompanies: () =>
        request("/admin/reset/companies", { method: "POST" }),
    removeAllCocoAllocations: () =>
        request("/admin/reset/coco-allocations", { method: "POST" }),
};

/* ═══════════════════════════════════════════════════════════
   COMPANY (shared)
   ═══════════════════════════════════════════════════════════ */
export const companyApi = {
    getCompany: (id: string) => request(`/company/${id}`),
    getCompanyQueue: (id: string) => request(`/company/${id}/queue`),
};

/* ═══════════════════════════════════════════════════════════
   QUEUE
   ═══════════════════════════════════════════════════════════ */
export const queueApi = {
    getQueue: (companyId: string) => request(`/queue/${companyId}`),
};

/* ═══════════════════════════════════════════════════════════
   HEALTH
   ═══════════════════════════════════════════════════════════ */
export const healthApi = {
    check: () => request<{ status: string; timestamp: string }>("/health"),
};
