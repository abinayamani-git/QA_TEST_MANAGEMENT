import axios from "axios";

const configuredUrl = import.meta.env.VITE_API_URL;
export const API_BASE_URL = configuredUrl || (import.meta.env.DEV ? "http://127.0.0.1:8000" : "");

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

export function getErrorMessage(error) {
  if (!API_BASE_URL) {
    return "The API address is not configured. Set VITE_API_URL to your backend URL and rebuild the frontend.";
  }
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail
      .map((item) => (typeof item === "string" ? item : item?.msg || "Invalid input"))
      .join("; ");
  }
  if (!error?.response) {
    return "Cannot reach the server. Start the backend, then refresh this page.";
  }
  return "Something went wrong. Please try again.";
}

export const getHealth = () => client.get("/api/health");
export const getDashboard = () => client.get("/api/dashboard").then((response) => response.data);
export const getReports = (params) => client.get("/api/reports", { params }).then((response) => response.data);

export const getProjects = () => client.get("/api/projects").then((response) => response.data);
export const createProject = (payload) => client.post("/api/projects", payload).then((response) => response.data);
export const updateProject = (id, payload) =>
  client.put(`/api/projects/${id}`, payload).then((response) => response.data);
export const deleteProject = (id) => client.delete(`/api/projects/${id}`);

export const getTestCases = (params) => client.get("/api/test-cases", { params }).then((response) => response.data);
export const createTestCase = (payload) => client.post("/api/test-cases", payload).then((response) => response.data);
export const updateTestCase = (id, payload) =>
  client.put(`/api/test-cases/${id}`, payload).then((response) => response.data);
export const deleteTestCase = (id) => client.delete(`/api/test-cases/${id}`);

export const getDefects = (params) => client.get("/api/defects", { params }).then((response) => response.data);
export const createDefect = (payload) => client.post("/api/defects", payload).then((response) => response.data);
export const updateDefect = (id, payload) =>
  client.put(`/api/defects/${id}`, payload).then((response) => response.data);
export const deleteDefect = (id) => client.delete(`/api/defects/${id}`);

export async function downloadCsv(path, filename, params) {
  const response = await client.get(path, { params, responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

export function projectName(projects, projectId) {
  return projects.find((project) => project.id === projectId)?.name || "Unknown project";
}
