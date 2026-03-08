import axios from 'axios';

// Base API URL is relative since Vite proxies /api to port 5000
const API_URL = '/api/v1';

const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    // We use cookies for refresh tokens if configured, so sending credentials is good
    withCredentials: true
});

// Intercept requests to attach JWT token
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('pos_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // Attach tenant ID explicit header if needed by some routes
    const tenantId = localStorage.getItem('pos_tenant_id');
    if (tenantId) {
        config.headers['X-Tenant-Id'] = tenantId;
    }

    return config;
}, (error) => Promise.reject(error));

// Intercept responses to handle 401s and token refreshes
apiClient.interceptors.response.use(
    (response) => response.data, // Standardize response payload
    async (error) => {
        const originalRequest = error.config;

        // If 401 and we haven't already retried, AND it wasn't the login or refresh call itself
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/login') && !originalRequest.url.includes('/auth/refresh')) {
            originalRequest._retry = true;
            try {
                // Attempt to refresh
                const res = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });

                if (res.data.success && res.data.data.token) {
                    const newToken = res.data.data.token;
                    localStorage.setItem('pos_token', newToken);

                    // Retry original request
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    // the retry will go through our axios instance but we need to resolve it 
                    // returning just data to match our success interceptor
                    const retryRes = await axios(originalRequest);
                    return retryRes.data;
                }
            } catch (refreshError) {
                // Refresh failed, user needs to login again
                console.error('Session expired. Please login again.');
                localStorage.removeItem('pos_token');
                localStorage.removeItem('pos_user');
                window.dispatchEvent(new Event('auth:unauthorized'));
                return Promise.reject(refreshError);
            }
        }

        // Return standard error payload matching backend `{success: false, message: ...}`
        return Promise.reject(error.response?.data || { success: false, message: error.message });
    }
);

export const authApi = {
    login: (credentials) => apiClient.post('/auth/login', credentials),
    registerTenant: (data) => apiClient.post('/auth/register-tenant', data),
    logout: () => apiClient.post('/auth/logout'),
    getProfile: () => apiClient.get('/auth/me'),
    changePassword: (data) => apiClient.put('/auth/change-password', data),
};

export const tenantApi = {
    getProfile: () => apiClient.get('/tenants/profile'),
    updateProfile: (data) => apiClient.put('/tenants/profile', data),
};

export const posApi = {
    getProducts: (search) => apiClient.get(`/products${search ? `?search=${search}` : ''}`),
    createProduct: (data) => apiClient.post('/products', data),
    updateProduct: (id, data) => apiClient.put(`/products/${id}`, data),
    deleteProduct: (id) => apiClient.delete(`/products/${id}`),
    lookupBarcode: (barcode) => apiClient.get(`/products/barcode/${barcode}`),
    processSale: (data) => apiClient.post('/sales', data),
    getSalesHistory: (params) => apiClient.get('/sales', { params }),
    getSaleDetails: (id) => apiClient.get(`/sales/${id}`),
    initiateMobileMoney: (data) => apiClient.post('/payments/mobile-money/request', data),
    checkPaymentStatus: (txnId) => apiClient.get(`/payments/mobile-money/status/${txnId}`)
};

export const inventoryApi = {
    getLevels: (params) => apiClient.get('/inventory/levels', { params }),
    adjustStock: (data) => apiClient.post('/inventory/adjust', data),
    getMovements: (params) => apiClient.get('/inventory/movements', { params }),
};

export const categoryApi = {
    getCategories: () => apiClient.get('/categories'),
    createCategory: (data) => apiClient.post('/categories', data),
    updateCategory: (id, data) => apiClient.put(`/categories/${id}`, data),
    deleteCategory: (id) => apiClient.delete(`/categories/${id}`)
};

export const staffApi = {
    getStaff: (search) => apiClient.get(`/users${search ? `?search=${search}` : ''}`),
    createStaff: (data) => apiClient.post('/users', data),
    updateStaff: (id, data) => apiClient.put(`/users/${id}`, data)
};

export const customerApi = {
    getCustomers: (search) => apiClient.get(`/customers${search ? `?search=${search}` : ''}`),
    createCustomer: (data) => apiClient.post('/customers', data)
};

export const adminApi = {
    getDashboardStats: () => apiClient.get('/super-admin/dashboard'),
    getTenants: () => apiClient.get('/super-admin/tenants'),
    getTenantById: (id) => apiClient.get(`/super-admin/tenants/${id}`),
    updateTenant: (id, data) => apiClient.put(`/super-admin/tenants/${id}`, data),
    updateTenantStatus: (id, is_active) => apiClient.patch(`/super-admin/tenants/${id}/status`, { is_active }),
    getSubscriptions: () => apiClient.get('/super-admin/subscriptions'),
    getPlans: () => apiClient.get('/super-admin/plans'),
    createPlan: (data) => apiClient.post('/super-admin/plans', data),
    updatePlan: (id, data) => apiClient.put(`/super-admin/plans/${id}`, data),
    deletePlan: (id) => apiClient.delete(`/super-admin/plans/${id}`),
    getAdminUsers: () => apiClient.get('/super-admin/admin-users'),
    createAdminUser: (data) => apiClient.post('/super-admin/admin-users', data),
    updateAdminStatus: (id, is_active) => apiClient.patch(`/super-admin/admin-users/${id}/status`, { is_active }),
    getActivityLogs: (params) => apiClient.get('/super-admin/activity-logs', { params }),
};

export const activityApi = {
    getLogs: (params) => apiClient.get('/activity-logs', { params }),
};

export const reportsApi = {
    getDashboardStats: () => apiClient.get('/reports/dashboard'),
    getSalesReport: (params) => apiClient.get('/reports/sales', { params }),
    getLowStockItems: () => apiClient.get('/reports/low-stock'),
    getProfitLoss: (params) => apiClient.get('/reports/profit-loss', { params }),
};

export const supplierApi = {
    getAll: (search) => apiClient.get(`/suppliers${search ? `?search=${search}` : ''}`),
    create: (data) => apiClient.post('/suppliers', data),
    update: (id, data) => apiClient.put(`/suppliers/${id}`, data),
    delete: (id) => apiClient.delete(`/suppliers/${id}`),
};

export const returnApi = {
    getAll: () => apiClient.get('/returns'),
    create: (data) => apiClient.post('/returns', data),
    process: (id, status) => apiClient.patch(`/returns/${id}/process`, { status }),
};

export const purchaseOrderApi = {
    getAll: () => apiClient.get('/purchase-orders'),
    getDetails: (id) => apiClient.get(`/purchase-orders/${id}`),
    create: (data) => apiClient.post('/purchase-orders', data),
    updateStatus: (id, status) => apiClient.patch(`/purchase-orders/${id}/status`, { status }),
};

export const discountApi = {
    getAll: () => apiClient.get('/discounts'),
    create: (data) => apiClient.post('/discounts', data),
    update: (id, data) => apiClient.put(`/discounts/${id}`, data),
    delete: (id) => apiClient.delete(`/discounts/${id}`),
    validate: (code, order_total) => apiClient.post('/discounts/validate', { code, order_total }),
};

export const expenseApi = {
    getAll: (params) => apiClient.get('/expenses', { params }),
    create: (data) => apiClient.post('/expenses', data),
    delete: (id) => apiClient.delete(`/expenses/${id}`),
};

export const cashRegisterApi = {
    getCurrent: () => apiClient.get('/cash-register/current'),
    getHistory: () => apiClient.get('/cash-register/history'),
    open: (data) => apiClient.post('/cash-register/open', data),
    close: (data) => apiClient.post('/cash-register/close', data),
};

export const storeSettingsApi = {
    get: () => apiClient.get('/store-settings'),
    save: (data) => apiClient.put('/store-settings', data),
};

export const taxConfigApi = {
    getAll: (params) => apiClient.get('/tax-config', { params }),
    getOverview: () => apiClient.get('/tax-config/overview'),
    create: (data) => apiClient.post('/tax-config', data),
    update: (id, data) => apiClient.put(`/tax-config/${id}`, data),
    delete: (id) => apiClient.delete(`/tax-config/${id}`),
};

export const customerCreditApi = {
    getDebtors: () => apiClient.get('/customer-credits/debtors'),
    getCustomerCredits: (customerId) => apiClient.get(`/customer-credits/${customerId}`),
    addRecord: (customerId, data) => apiClient.post(`/customer-credits/${customerId}`, data),
};

export const loyaltyApi = {
    getSummary: () => apiClient.get('/loyalty-points/summary'),
    getCustomerHistory: (customerId) => apiClient.get(`/loyalty-points/${customerId}`),
    addTransaction: (customerId, data) => apiClient.post(`/loyalty-points/${customerId}`, data),
};

export const branchApi = {
    getAll: () => apiClient.get('/branches'),
    create: (data) => apiClient.post('/branches', data),
    update: (id, data) => apiClient.put(`/branches/${id}`, data),
    delete: (id) => apiClient.delete(`/branches/${id}`),
    getTransfers: () => apiClient.get('/branches/transfers'),
    createTransfer: (data) => apiClient.post('/branches/transfers', data),
    updateTransferStatus: (id, status) => apiClient.put(`/branches/transfers/${id}/status`, { status })
};

export default apiClient;

