const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
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
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/api/imports/${sourceTool}`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status} ${res.statusText}: ${text}`);
    }
    return res.json();
  },
};
