/**
 * API Service Layer — centralised HTTP client for the PlaceIIT backend.
 * All requests go through the Vite proxy (/api → http://localhost:5000/api).
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
        throw new Error(message);
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
    user: { id: string; instituteId: string; role: string; email: string };
}

export const authApi = {
    login: (instituteId: string, password: string) =>
        request<LoginResponse>("/auth/login", {
            method: "POST",
            body: JSON.stringify({ instituteId, password }),
        }),

    getMe: () => request<{ _id: string; instituteId: string; role: string; email: string }>("/auth/me"),
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
    joinQueue: (companyId: string) =>
        request("/student/queue/join", { method: "POST", body: JSON.stringify({ companyId }) }),
    /** Join a walk-in queue */
    joinWalkInQueue: (companyId: string) =>
        request("/student/queue/walkin", { method: "POST", body: JSON.stringify({ companyId }) }),
    /** @deprecated use joinWalkInQueue */
    joinWalkIn: (companyId: string) =>
        request("/student/queue/walkin", { method: "POST", body: JSON.stringify({ companyId }) }),
    getQueuePosition: (companyId: string) =>
        request(`/student/queue/${companyId}`),
    getWalkIns: () => request("/student/walkins"),
    getNotifications: () => request("/student/notifications"),
    markNotifRead: (id: string) =>
        request(`/student/notifications/${id}/read`, { method: "PUT" }),
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
    toggleWalkIn: (companyId: string, data: { walkInOpen: boolean }) =>
        request(`/coco/company/${companyId}/walkin`, { method: "PUT", body: JSON.stringify(data) }),
    addStudentToQueue: (data: { companyId: string; studentId: string }) =>
        request("/coco/queue/add", { method: "POST", body: JSON.stringify(data) }),
    updateStudentStatus: (data: { queueId: string; status: string }) =>
        request("/coco/queue/status", { method: "PUT", body: JSON.stringify(data) }),
    sendNotification: (data: { studentId: string; message: string }) =>
        request("/coco/notify", { method: "POST", body: JSON.stringify(data) }),
    getPredefinedNotifications: () =>
        request("/coco/notifications/predefined"),
    addPanel: (data: Record<string, unknown>) =>
        request("/coco/panel", { method: "POST", body: JSON.stringify(data) }),
    addRound: (data: Record<string, unknown>) =>
        request("/coco/round", { method: "POST", body: JSON.stringify(data) }),
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
    getCocos: () => request("/admin/cocos"),
    assignCoco: (data: { cocoId: string; companyId: string }) =>
        request("/admin/assign-coco", { method: "POST", body: JSON.stringify(data) }),
    removeCoco: (data: { cocoId: string; companyId: string }) =>
        request("/admin/remove-coco", { method: "POST", body: JSON.stringify(data) }),
    uploadCompanyExcel: (formData: FormData) =>
        uploadRequest("/admin/upload/companies", formData),
    uploadShortlistExcel: (formData: FormData) =>
        uploadRequest("/admin/upload/shortlist", formData),
    uploadCocoRequirementsExcel: (formData: FormData) =>
        uploadRequest("/admin/upload/coordinator-requirements", formData),
    getUploadStatus: (id: string) => request(`/admin/upload/${id}`),
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
