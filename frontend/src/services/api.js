import axios from "axios";

const API_BASE_URL = "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const getStaffHeaders = () => {
  const key = localStorage.getItem("staffKey");
  return key ? { "X-Staff-Key": key } : {};
};

const getAgentHeaders = () => {
  const id = localStorage.getItem("agentId");
  return id ? { "X-Agent-Id": id } : {};
};

export const requestsAPI = {
  getAll: (params = {}) => api.get("/requests/", { params }),
  getById: (id) => api.get(`/requests/${id}`),
  create: (data) => api.post("/requests/", data),
  update: (id, data) => api.put(`/requests/${id}`, data),
  updateStatus: (id, status) =>
    api.patch(`/requests/${id}/status?status=${status}`),
  delete: (id) => api.delete(`/requests/${id}`),
  getNearby: (coordinates, distance = 5000) =>
    api.get(
      `/requests/nearby/search?coordinates=${coordinates}&distance=${distance}`,
    ),
  autoAssign: (id) =>
    api.post(`/requests/${id}/auto-assign`, null, {
      headers: { ...getStaffHeaders() },
    }),
  addMilestone: (id, payload) =>
    api.patch(`/requests/${id}/milestone`, payload, {
      headers: { ...getAgentHeaders() },
    }),
};

export const categoriesAPI = {
  getAll: (activeOnly = true) =>
    api.get("/categories/", { params: { active_only: activeOnly } }),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post("/categories/", data),
  update: (id, data) => api.patch(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};
export const usersAPI = {
  getAll: (params = {}) => api.get("/users/", { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post("/users/", data),
  update: (id, data) => api.patch(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};
export const performanceAPI = {
  getAll: (params = {}) => api.get("/performance-logs/", { params }),
  getById: (id) => api.get(`/performance-logs/${id}`),
  getByRequestId: (requestId) =>
    api.get(`/performance-logs/request/${requestId}`),
  create: (data) => api.post("/performance-logs/", data),
  update: (id, data) => api.patch(`/performance-logs/${id}`, data),
  addEvent: (requestId, eventType, actorType, actorId, meta = {}) =>
    api.post(`/performance-logs/${requestId}/add-event`, null, {
      params: {
        event_type: eventType,
        actor_type: actorType,
        actor_id: actorId,
        meta: JSON.stringify(meta),
      },
    }),
};

export const citizensAPI = {
  getAll: (params = {}) => api.get("/citizens/", { params }),
  getById: (id) => api.get(`/citizens/${id}`),
  create: (data) => api.post("/citizens/", data),
  update: (id, data) => api.patch(`/citizens/${id}`, data),
};
export const agentsAPI = {
  list: (params = {}) => api.get("/agents/", { params }),
  create: (data) =>
    api.post("/agents/", data, { headers: { ...getStaffHeaders() } }),
  getById: (id) => api.get(`/agents/${id}`),
  update: (id, data) =>
    api.put(`/agents/${id}`, data, { headers: { ...getStaffHeaders() } }),
  delete: (id) =>
    api.delete(`/agents/${id}`, { headers: { ...getStaffHeaders() } }),
  assignRequest: (requestId) =>
    api.post(`/agents/assign/${requestId}`, null, {
      headers: { ...getStaffHeaders() },
    }),
  addMilestone: (requestId, payload) =>
    api.patch(`/agents/milestone/${requestId}`, payload, {
      headers: { ...getAgentHeaders() },
    }),
};

export const analyticsAPI = {
  kpis: (params = {}) => api.get("/analytics/kpis", { params }),
  heatmap: (params = {}) => api.get("/analytics/geofeeds/heatmap", { params }),
  cohorts: (params = {}) => api.get("/analytics/cohorts", { params }),
  agents: (params = {}) => api.get("/analytics/agents", { params }),
};

export default api;
