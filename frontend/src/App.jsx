import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Customers from './pages/Customers';
import Staff from './pages/Staff';
import Settings from './pages/Settings';
import Branches from './pages/Branches';
import Categories from './pages/Categories';
import SuperAdminDashboard from './pages/superadmin/Dashboard';
import Tenants from './pages/superadmin/Tenants';
import Subscriptions from './pages/superadmin/Subscriptions';
import SubscriptionPlans from './pages/superadmin/SubscriptionPlans';
import AdminUsers from './pages/superadmin/AdminUsers';
import ActivityLogs from './pages/ActivityLogs';
import Reports from './pages/Reports';
import Suppliers from './pages/Suppliers';
import Returns from './pages/Returns';
import PurchaseOrders from './pages/PurchaseOrders';
import Discounts from './pages/Discounts';
import Expenses from './pages/Expenses';
import CashRegister from './pages/CashRegister';
import ProfitLoss from './pages/ProfitLoss';
import CustomerCredits from './pages/CustomerCredits';
import LoyaltyPoints from './pages/LoyaltyPoints';
// Placeholder Pages
const Stub = ({ title }) => <div className="p-8 text-center text-slate-500 font-medium bg-white rounded-xl shadow-sm border border-slate-200">{title} Module - Under Construction</div>;

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Protected Routes (Super Admin) */}
                    <Route path="/super-admin" element={
                        <ProtectedRoute>
                            <AppLayout />
                        </ProtectedRoute>
                    }>
                        <Route index element={<SuperAdminDashboard />} />
                        <Route path="tenants" element={<Tenants />} />
                        <Route path="categories" element={<Categories />} />
                        <Route path="subscriptions" element={<Subscriptions />} />
                        <Route path="plans" element={<SubscriptionPlans />} />
                        <Route path="admin-users" element={<AdminUsers />} />
                        <Route path="activity-logs" element={<ActivityLogs />} />
                        <Route path="settings" element={<Settings />} />
                    </Route>

                    {/* Protected Routes (Tenant) */}
                    <Route path="/" element={
                        <ProtectedRoute>
                            <AppLayout />
                        </ProtectedRoute>
                    }>
                        <Route index element={<Dashboard />} />
                        <Route path="pos" element={<POS />} />
                        <Route path="products" element={<Products />} />
                        <Route path="categories" element={<Categories />} />
                        <Route path="inventory" element={<Inventory />} />
                        <Route path="sales" element={<Sales />} />
                        <Route path="customers" element={<Customers />} />
                        <Route path="staff" element={<Staff />} />
                        <Route path="suppliers" element={<Suppliers />} />
                        <Route path="purchase-orders" element={<PurchaseOrders />} />
                        <Route path="returns" element={<Returns />} />
                        <Route path="discounts" element={<Discounts />} />
                        <Route path="expenses" element={<Expenses />} />
                        <Route path="cash-register" element={<CashRegister />} />
                        <Route path="profit-loss" element={<ProfitLoss />} />
                        <Route path="branches" element={<Branches />} />
                        <Route path="customer-credits" element={<CustomerCredits />} />
                        <Route path="loyalty-points" element={<LoyaltyPoints />} />
                        <Route path="reports" element={<Reports />} />
                        <Route path="activity-logs" element={<ActivityLogs />} />
                        <Route path="settings" element={<Settings />} />
                    </Route>

                    {/* Catch all */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    )
}

export default App;
