const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
const AUTH_KEY = "sentrihub_auth";

export function getStoredAuth() {
  try {
    return sessionStorage.getItem(AUTH_KEY);
  } catch {
    return null;
  }
}

export function setStoredAuth(encoded) {
  try {
    sessionStorage.setItem(AUTH_KEY, encoded);
  } catch {
    // sessionStorage unavailable (e.g. private mode) - login just won't persist across reloads
  }
}

export function clearStoredAuth() {
  try {
    sessionStorage.removeItem(AUTH_KEY);
  } catch {
    // ignore
  }
}

export async function verifyCredentials(username, password) {
  const encoded = btoa(`${username}:${password}`);
  const res = await fetch(`${API_BASE}/api/auth/whoami`, {
    headers: { Authorization: `Basic ${encoded}` },
  });
  if (!res.ok) {
    throw new Error("Kullanici adi veya sifre hatali");
  }
  setStoredAuth(encoded);
  return encoded;
}

async function request(path, options = {}) {
  const encoded = getStoredAuth();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (encoded) headers.Authorization = `Basic ${encoded}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearStoredAuth();
    window.location.reload();
    throw new Error("Oturum sona erdi, tekrar giris yapin");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  summary: () => request("/api/stats/summary"),

  listAlerts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/alerts${qs ? `?${qs}` : ""}`);
  },
  getAlert: (id) => request(`/api/alerts/${id}`),
  updateAlert: (id, payload) =>
    request(`/api/alerts/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  addNote: (id, payload) =>
    request(`/api/alerts/${id}/notes`, { method: "POST", body: JSON.stringify(payload) }),

  listFindings: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/findings${qs ? `?${qs}` : ""}`);
  },

  startScan: (target) =>
    request("/api/scans", { method: "POST", body: JSON.stringify({ target }) }),
  listScans: () => request("/api/scans"),

  uploadReport: async (sourceTool, file) => {
    const encoded = getStoredAuth();
    const headers = {};
    if (encoded) headers.Authorization = `Basic ${encoded}`;

    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/api/imports/${sourceTool}`, {
      method: "POST",
      headers,
      body: form,
    });
    if (res.status === 401) {
      clearStoredAuth();
      window.location.reload();
      throw new Error("Oturum sona erdi, tekrar giris yapin");
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status} ${res.statusText}: ${text}`);
    }
    return res.json();
  },
};
