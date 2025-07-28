import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  register: (username: string, password: string, role?: string) =>
    api.post('/auth/register', { username, password, role }),
};

// Employee endpoints
export const employeeApi = {
  getAll: () => api.get('/employees'),
  getById: (id: string) => api.get(`/employees/${id}`),
  create: (data: any) => api.post('/employees', data),
  update: (id: string, data: any) => api.put(`/employees/${id}`, data),
  delete: (id: string) => api.delete(`/employees/${id}`),
};

// Attendance endpoints
export const attendanceApi = {
  getAll: (params?: any) => api.get('/attendance', { params }),
  create: (data: any) => api.post('/attendance', data),
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/attendance/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  delete: (id: string) => api.delete(`/attendance/${id}`),
};

// Dashboard endpoints
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getTrends: (months?: number) => api.get('/dashboard/trends', { params: { months } }),
  getDepartments: () => api.get('/dashboard/departments'),
  getTopPerformers: () => api.get('/dashboard/top-performers'),
};

// Report endpoints
export const reportApi = {
  getDaily: (date?: string) => api.get('/reports/daily', { params: { date } }),
  getWeekly: (weekStart?: string, weekEnd?: string) =>
    api.get('/reports/weekly', { params: { week_start: weekStart, week_end: weekEnd } }),
  getMonthly: (year?: number, month?: number) =>
    api.get('/reports/monthly', { params: { year, month } }),
  exportReport: (type: string, params: any) =>
    api.get(`/reports/export/${type}`, { params, responseType: 'blob' }),
};

export default api;