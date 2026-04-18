import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;

// Auth API
export const authApi = {
  register: (email: string, password: string, role: string, orgName: string, location: { lat: number; lng: number }) =>
    apiClient.post('/auth/register', { email, password, role, orgName, location }),

  login: (email: string, password: string) =>
    apiClient.post<{ token: string; user: { id: string; role: string; orgName: string } }>('/auth/login', { email, password }),

  verifyEmail: (email: string, code: string) =>
    apiClient.post<{ token: string; user: { id: string; role: string; orgName: string } }>('/auth/verify-email', { email, code }),

  resendVerification: (email: string) =>
    apiClient.post('/auth/resend-verification', { email }),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),

  verifyLoginOtp: (email: string, otp: string) =>
    apiClient.post<{ token: string; user: { id: string; role: string; orgName: string } }>('/auth/verify-login-otp', { email, otp }),

  resetPasswordWithOtp: (email: string, otp: string, newPassword: string) =>
    apiClient.post<{ token: string; user: { id: string; role: string; orgName: string } }>('/auth/reset-password-otp', { email, otp, newPassword }),

  resetPassword: (token: string, newPassword: string) =>
    apiClient.post('/auth/reset-password', { token, newPassword }),
};

// Food API
export const foodApi = {
  addFood: (body: { foodName: string; quantity: number; expiryDatetime: string; location: { lat: number; lng: number }; foodType?: string }) =>
    apiClient.post('/food/addFood', body),

  getAvailableFood: (lat: number, lng: number) =>
    apiClient.get('/food/availableFood', { params: { lat, lng } }),

  acceptRequest: (listingId: string) =>
    apiClient.post('/food/acceptRequest', { listingId }),

  updateRequestStatus: (requestId: string, status: string) =>
    apiClient.patch(`/food/requests/${requestId}/status`, { status }),

  getMyListings: () =>
    apiClient.get('/food/myListings'),

  getMyRequests: () =>
    apiClient.get('/food/myRequests'),

  getIncomingRequests: () =>
    apiClient.get('/food/incomingRequests'),

  getMyListingsWithRequests: () =>
    apiClient.get('/food/myListingsWithRequests'),
};

// Analytics API
export const analyticsApi = {
  getAnalytics: (from?: string, to?: string) =>
    apiClient.get('/analytics', { params: { from, to } }),

  exportCSRReport: () =>
    apiClient.get('/export/csr-report', { responseType: 'blob' }),
};

// Notification API
export const notificationApi = {
  getNotifications: () =>
    apiClient.get('/notifications'),

  markAsRead: (id: string) =>
    apiClient.patch(`/notifications/${id}/read`),
};
