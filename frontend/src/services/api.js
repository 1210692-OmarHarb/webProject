import axios from "axios";

const API_BASE_URL = "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Helpers to include header keys stored in localStorage
const getStaffHeaders = () => {
  const key = localStorage.getItem("staffKey");
  return key ? { "X-Staff-Key": key } : {};
};

const getAgentHeaders = () => {
  const id = localStorage.getItem("agentId");
  return id ? { "X-Agent-Id": id } : {};
};

// ==================== Requests API ====================
export const requestsAPI = {
  // Get all requests
  getAll: (params = {}) => api.get("/requests/", { params }),

  // Get single request by ID
  getById: (id) => api.get(`/requests/${id}`),

  // Create new request
  create: (data) => api.post("/requests/", data),

  // Update request
  update: (id, data) => api.put(`/requests/${id}`, data),

  // Update status
  updateStatus: (id, status) =>
    api.patch(`/requests/${id}/status?status=${status}`),

  // Delete request
  delete: (id) => api.delete(`/requests/${id}`),

  // Nearby search
  getNearby: (coordinates, distance = 5000) =>
    api.get(
      `/requests/nearby/search?coordinates=${coordinates}&distance=${distance}`,
    ),

  // Module 3: auto-assign and milestone
  autoAssign: (id) =>
    api.post(`/requests/${id}/auto-assign`, null, { headers: { ...getStaffHeaders() } }),
  addMilestone: (id, payload) =>
    api.patch(`/requests/${id}/milestone`, payload, { headers: { ...getAgentHeaders() } }),
};

// ==================== Categories API ====================
export const categoriesAPI = {
  // Get all active categories
  getAll: (activeOnly = true) =>
    api.get("/categories/", { params: { active_only: activeOnly } }),

  // Get specific category
  getById: (id) => api.get(`/categories/${id}`),

  // Create new category
  create: (data) => api.post("/categories/", data),

  // Update category
  update: (id, data) => api.patch(`/categories/${id}`, data),

  // Delete category
  delete: (id) => api.delete(`/categories/${id}`),
};

// ==================== Users API ====================
export const usersAPI = {
  // Get all users
  getAll: (params = {}) => api.get("/users/", { params }),

  // Get specific user
  getById: (id) => api.get(`/users/${id}`),

  // Create new user
  create: (data) => api.post("/users/", data),

  // Update user
  update: (id, data) => api.patch(`/users/${id}`, data),

  // Delete user
  delete: (id) => api.delete(`/users/${id}`),
};

// ==================== Performance Logs API ====================
export const performanceAPI = {
  // Get all logs
  getAll: (params = {}) => api.get("/performance-logs/", { params }),

  // Get specific log
  getById: (id) => api.get(`/performance-logs/${id}`),

  // Get log by request ID
  getByRequestId: (requestId) =>
    api.get(`/performance-logs/request/${requestId}`),

  // Create new log
  create: (data) => api.post("/performance-logs/", data),

  // Update log
  update: (id, data) => api.patch(`/performance-logs/${id}`, data),

  // Add event to log
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

// ==================== Citizens API ====================
export const citizensAPI = {
  // Get all citizens
  getAll: (params = {}) => api.get("/citizens/", { params }),

  // Get specific citizen
  getById: (id) => api.get(`/citizens/${id}`),

  // Create new citizen
  create: (data) => api.post("/citizens/", data),

  // Update citizen
  update: (id, data) => api.patch(`/citizens/${id}`, data),
};

// ==================== Agents API (Module 3) ====================
export const agentsAPI = {
  list: (params = {}) => api.get("/agents/", { params }),
  create: (data) => api.post("/agents/", data, { headers: { ...getStaffHeaders() } }),
  getById: (id) => api.get(`/agents/${id}`),
  assignRequest: (requestId) => api.post(`/agents/assign/${requestId}`, null, { headers: { ...getStaffHeaders() } }),
  addMilestone: (requestId, payload) => api.patch(`/agents/milestone/${requestId}`, payload, { headers: { ...getAgentHeaders() } }),
};

export default api;
