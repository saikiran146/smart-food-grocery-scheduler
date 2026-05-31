import { apiClient } from './client';

// ============================================================
// AUTH
// ============================================================
export const authApi = {
  register: (data: any) => apiClient.post('/auth/register', data),
  login: (data: any) => apiClient.post('/auth/login', data),
  logout: () => apiClient.post('/auth/logout'),
  refresh: (refreshToken: string) => apiClient.post('/auth/refresh', { refreshToken }),
  googleLogin: () => { window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`; },
};

// ============================================================
// USERS
// ============================================================
export const usersApi = {
  getMe: () => apiClient.get('/users/me'),
  updateMe: (data: any) => apiClient.patch('/users/me', data),
};

// ============================================================
// FAMILIES
// ============================================================
export const familiesApi = {
  create: (data: any) => apiClient.post('/families', data),
  list: () => apiClient.get('/families'),
  get: (id: string) => apiClient.get(`/families/${id}`),
  update: (id: string, data: any) => apiClient.patch(`/families/${id}`, data),
  delete: (id: string) => apiClient.delete(`/families/${id}`),
  join: (inviteCode: string) => apiClient.post('/families/join', { inviteCode }),
  getMembers: (id: string) => apiClient.get(`/families/${id}/members`),
  removeMember: (familyId: string, memberId: string) =>
    apiClient.delete(`/families/${familyId}/members/${memberId}`),
};

// ============================================================
// RECIPES
// ============================================================
export const recipesApi = {
  create: (data: any) => apiClient.post('/recipes', data),
  list: (params?: any) => apiClient.get('/recipes', { params }),
  get: (id: string) => apiClient.get(`/recipes/${id}`),
  update: (id: string, data: any) => apiClient.patch(`/recipes/${id}`, data),
  delete: (id: string) => apiClient.delete(`/recipes/${id}`),
  suggest: (ingredients: string[]) =>
    apiClient.get('/recipes/suggest', { params: { ingredients: ingredients.join(',') } }),
};

// ============================================================
// MEALS
// ============================================================
export const mealsApi = {
  create: (data: any) => apiClient.post('/meals', data),
  list: (params: any) => apiClient.get('/meals', { params }),
  get: (id: string) => apiClient.get(`/meals/${id}`),
  update: (id: string, data: any) => apiClient.patch(`/meals/${id}`, data),
  delete: (id: string) => apiClient.delete(`/meals/${id}`),
  complete: (id: string) => apiClient.post(`/meals/${id}/complete`),
  skip: (id: string) => apiClient.post(`/meals/${id}/skip`),
  getCalendar: (familyId: string, year: number, month: number) =>
    apiClient.get('/meals/calendar', { params: { familyId, year, month } }),
};

// ============================================================
// INVENTORY
// ============================================================
export const inventoryApi = {
  create: (data: any) => apiClient.post('/inventory', data),
  list: (params: any) => apiClient.get('/inventory', { params }),
  get: (id: string) => apiClient.get(`/inventory/${id}`),
  update: (id: string, data: any) => apiClient.patch(`/inventory/${id}`, data),
  delete: (id: string) => apiClient.delete(`/inventory/${id}`),
  adjust: (id: string, data: any) => apiClient.post(`/inventory/${id}/adjust`, data),
  getExpiring: (familyId: string, days = 7) =>
    apiClient.get('/inventory/expiring', { params: { familyId, days } }),
  getShortages: (familyId: string, days = 7) =>
    apiClient.get('/inventory/shortages', { params: { familyId, days } }),
};

// ============================================================
// SHOPPING
// ============================================================
export const shoppingApi = {
  create: (data: any) => apiClient.post('/shopping', data),
  list: (familyId: string) => apiClient.get('/shopping', { params: { familyId } }),
  get: (id: string) => apiClient.get(`/shopping/${id}`),
  update: (id: string, data: any) => apiClient.patch(`/shopping/${id}`, data),
  delete: (id: string) => apiClient.delete(`/shopping/${id}`),
  addItem: (listId: string, data: any) => apiClient.post(`/shopping/${listId}/items`, data),
  updateItem: (listId: string, itemId: string, data: any) =>
    apiClient.patch(`/shopping/${listId}/items/${itemId}`, data),
  removeItem: (listId: string, itemId: string) =>
    apiClient.delete(`/shopping/${listId}/items/${itemId}`),
  complete: (id: string) => apiClient.post(`/shopping/${id}/complete`),
  generate: (familyId: string, days = 7) =>
    apiClient.post('/shopping/generate', { familyId, days }),
};

// ============================================================
// WASTE
// ============================================================
export const wasteApi = {
  create: (data: any) => apiClient.post('/waste', data),
  list: (params: any) => apiClient.get('/waste', { params }),
  get: (id: string) => apiClient.get(`/waste/${id}`),
  delete: (id: string) => apiClient.delete(`/waste/${id}`),
  getSummary: (familyId: string, month?: number, year?: number) =>
    apiClient.get('/waste/summary', { params: { familyId, month, year } }),
};

// ============================================================
// FRUITS
// ============================================================
export const fruitsApi = {
  create: (data: any) => apiClient.post('/fruits', data),
  list: (familyId: string) => apiClient.get('/fruits', { params: { familyId } }),
  get: (id: string) => apiClient.get(`/fruits/${id}`),
  update: (id: string, data: any) => apiClient.patch(`/fruits/${id}`, data),
  delete: (id: string) => apiClient.delete(`/fruits/${id}`),
  consume: (id: string, quantity: number) => apiClient.post(`/fruits/${id}/consume`, { quantity }),
  getAlerts: (familyId: string) => apiClient.get('/fruits/alerts', { params: { familyId } }),
};

// ============================================================
// NOTIFICATIONS
// ============================================================
export const notificationsApi = {
  list: (params?: any) => apiClient.get('/notifications', { params }),
  markRead: (id: string) => apiClient.patch(`/notifications/${id}/read`),
  markAllRead: () => apiClient.patch('/notifications/read-all'),
  delete: (id: string) => apiClient.delete(`/notifications/${id}`),
  getUnreadCount: () => apiClient.get('/notifications/unread-count'),
};

// ============================================================
// ANALYTICS
// ============================================================
export const analyticsApi = {
  getDashboard: (familyId: string) => apiClient.get('/analytics/dashboard', { params: { familyId } }),
  getInventory: (familyId: string) => apiClient.get('/analytics/inventory', { params: { familyId } }),
  getConsumption: (familyId: string, month?: number, year?: number) =>
    apiClient.get('/analytics/consumption', { params: { familyId, month, year } }),
  getWaste: (familyId: string, month?: number, year?: number) =>
    apiClient.get('/analytics/waste', { params: { familyId, month, year } }),
  getBudget: (familyId: string, month?: number, year?: number) =>
    apiClient.get('/analytics/budget', { params: { familyId, month, year } }),
};

// ============================================================
// AI
// ============================================================
export const aiApi = {
  getSuggestions: (familyId: string) => apiClient.get('/ai/suggestions', { params: { familyId } }),
  getRecipeRecommendations: (familyId: string) =>
    apiClient.get('/ai/recipe-recommendations', { params: { familyId } }),
  getGroceryForecast: (familyId: string, period: 7 | 15 | 30) =>
    apiClient.get('/ai/grocery-forecast', { params: { familyId, period } }),
  getWasteReductionTips: (familyId: string) =>
    apiClient.get('/ai/waste-reduction-tips', { params: { familyId } }),
};
