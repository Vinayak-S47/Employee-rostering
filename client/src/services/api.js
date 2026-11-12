// src/services/api.js
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally — clear token and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login:          (data) => api.post('/auth/login', data),
  getMe:          ()     => api.get('/auth/me'),
  logout:         ()     => api.post('/auth/logout'),
  changePassword: (data) => api.patch('/auth/change-password', data),
}

// ── Departments ───────────────────────────────────────────────────────────────
export const deptAPI = {
  getAll:       (params) => api.get('/departments', { params }),
  getById:      (id)     => api.get(`/departments/${id}`),
  getStaff:     (id, params) => api.get(`/departments/${id}/staff`, { params }),
  create:       (data)   => api.post('/departments', data),
  update:       (id, data) => api.put(`/departments/${id}`, data),
  deactivate:   (id)     => api.patch(`/departments/${id}/deactivate`),
}

// ── Employees ─────────────────────────────────────────────────────────────────
export const empAPI = {
  getAll:     (params) => api.get('/employees', { params }),
  getById:    (id)     => api.get(`/employees/${id}`),
  create:     (data)   => api.post('/employees', data),
  update:     (id, data) => api.put(`/employees/${id}`, data),
  deactivate: (id)     => api.patch(`/employees/${id}/deactivate`),
}

// ── Leave ─────────────────────────────────────────────────────────────────────
export const leaveAPI = {
  getAll:    (params)       => api.get('/leave', { params }),
  create:    (data)         => api.post('/leave', data),
  review:    (id, data)     => api.patch(`/leave/${id}/review`, data),
  cancel:    (id)           => api.patch(`/leave/${id}/cancel`),
}

// ── Rosters ───────────────────────────────────────────────────────────────────
export const rosterAPI = {
  getAll:         (params)     => api.get('/rosters', { params }),
  getById:        (id)         => api.get(`/rosters/${id}`),
  getAssignments: (id, params) => api.get(`/rosters/${id}/assignments`, { params }),
  generate:       (data)       => api.post('/rosters/generate', data),
  publish:        (id)         => api.patch(`/rosters/${id}/publish`),
  archive:        (id)         => api.patch(`/rosters/${id}/archive`),
}

// ── Shifts & Rules ────────────────────────────────────────────────────────────
export const shiftAPI = {
  getTemplates:       (params)     => api.get('/shifts/templates', { params }),
  createTemplate:     (data)       => api.post('/shifts/templates', data),
  updateTemplate:     (id, data)   => api.put(`/shifts/templates/${id}`, data),
  getRequirements:    (params)     => api.get('/shifts/requirements', { params }),
  createRequirement:  (data)       => api.post('/shifts/requirements', data),
  updateRequirement:  (id, data)   => api.put(`/shifts/requirements/${id}`, data),
  getRules:           ()           => api.get('/shifts/rules'),
  updateRule:         (id, data)   => api.put(`/shifts/rules/${id}`, data),
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsAPI = {
  getDashboard: ()              => api.get('/analytics/dashboard'),
  getWorkload:  (params)        => api.get('/analytics/workload', { params }),
  exportCSV:    (rosterId)      => api.get(`/analytics/rosters/${rosterId}/export.csv`, { responseType: 'blob' }),
}

// ── Notifications ─────────────────────────────────────────────────────────────
export const notifAPI = {
  getAll:       (params) => api.get('/notifications', { params }),
  markRead:     (id)     => api.patch(`/notifications/${id}/read`),
  markAllRead:  ()       => api.patch('/notifications/mark-all-read'),
}
