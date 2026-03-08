import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, ShoppingCart, Package, Users,
    Settings, LogOut, Menu, X, Store, CreditCard, Activity, Shield, BarChart3, AlertTriangle, Truck, RotateCcw, ClipboardList, Tag, Banknote, Calculator, PieChart, Wallet, Gift, Bell,
    PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronRight, Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { reportsApi } from '../services/api';

// ─── Role-based access map ────────────────────────────────────────
const ROLE_ACCESS = {
    '/': ['admin', 'manager', 'cashier', 'inventory_manager'],
    '/pos': ['admin', 'manager', 'cashier'],
    '/cash-register': ['admin', 'manager', 'cashier'],
    '/products': ['admin', 'manager', 'inventory_manager'],
    '/categories': ['admin', 'manager', 'inventory_manager'],
    '/inventory': ['admin', 'manager', 'inventory_manager'],
    '/sales': ['admin', 'manager', 'cashier'],
    '/reports': ['admin', 'manager'],
    '/profit-loss': ['admin', 'manager'],
    '/discounts': ['admin', 'manager'],
    '/suppliers': ['admin', 'manager', 'inventory_manager'],
    '/purchase-orders': ['admin', 'manager', 'inventory_manager'],
    '/returns': ['admin', 'manager', 'cashier'],
    '/expenses': ['admin', 'manager'],
    '/customer-credits': ['admin', 'manager', 'cashier'],
    '/loyalty-points': ['admin', 'manager', 'cashier'],
    '/customers': ['admin', 'manager', 'cashier'],
    '/staff': ['admin'],
    '/activity-logs': ['admin', 'manager'],
    '/branches': ['admin'],
};

const AppLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const { user, logout } = useAuth();
    const location = useLocation();
    const [lowStockCount, setLowStockCount] = useState(0);

    useEffect(() => {
        if (!user?.isSuperAdmin) {
            reportsApi.getLowStockItems().then(res => {
                if (res.success) setLowStockCount(res.data?.length || 0);
            }).catch(() => { });
        }
    }, [user]);

    const allTenantNavGroups = [
        {
            label: 'Main',
            items: [
                { name: 'Dashboard', href: '/', icon: LayoutDashboard },
            ],
        },
        {
            label: 'Sales',
            items: [
                { name: 'POS (Point of Sale)', href: '/pos', icon: ShoppingCart },
                { name: 'Cash Register', href: '/cash-register', icon: Calculator, feature: 'Cash Register' },
                { name: 'Sales History', href: '/sales', icon: CreditCard },
            ],
        },
        {
            label: 'Products',
            items: [
                { name: 'Product Catalog', href: '/products', icon: Package },
                { name: 'Product Categories', href: '/categories', icon: Package },
                { name: 'Inventory Control', href: '/inventory', icon: Package, badge: lowStockCount > 0 ? lowStockCount : null, feature: 'Inventory Control' },
            ],
        },
        {
            label: 'Finance',
            items: [
                { name: 'Sales Reports', href: '/reports', icon: BarChart3, feature: 'Sales Reports' },
                { name: 'Profit & Loss', href: '/profit-loss', icon: PieChart, feature: 'Profit & Loss' },
                { name: 'Expenses', href: '/expenses', icon: Banknote, feature: 'Expenses' },
            ],
        },
        {
            label: 'Promotions & Loyalty',
            items: [
                { name: 'Discounts & Coupons', href: '/discounts', icon: Tag, feature: 'Discounts & Coupons' },
                { name: 'Loyalty Points', href: '/loyalty-points', icon: Gift, feature: 'Loyalty Points' },
                { name: 'Customer Credits', href: '/customer-credits', icon: Wallet, feature: 'Customer Credits' },
            ],
        },
        {
            label: 'Supply Chain',
            items: [
                { name: 'Suppliers', href: '/suppliers', icon: Truck, feature: 'Suppliers' },
                { name: 'Purchase Orders', href: '/purchase-orders', icon: ClipboardList, feature: 'Purchase Orders' },
                { name: 'Returns & Refunds', href: '/returns', icon: RotateCcw, feature: 'Returns & Refunds' },
            ],
        },
        {
            label: 'People',
            items: [
                { name: 'Customers', href: '/customers', icon: Users },
                { name: 'Staff & Roles', href: '/staff', icon: Users },
                { name: 'Branches', href: '/branches', icon: Building2, feature: 'Branch Management' },
            ],
        },
        {
            label: 'System',
            items: [
                { name: 'Activity Logs', href: '/activity-logs', icon: Activity, feature: 'Activity Logs' },
            ],
        },
    ];

    const superAdminNavGroups = [
        {
            label: 'Main',
            items: [
                { name: 'Dashboard', href: '/super-admin', icon: LayoutDashboard },
            ],
        },
        {
            label: 'Management',
            items: [
                { name: 'Tenants', href: '/super-admin/tenants', icon: Store },
                { name: 'Product Categories', href: '/super-admin/categories', icon: Package },
                { name: 'Admin Users', href: '/super-admin/admin-users', icon: Shield },
            ],
        },
        {
            label: 'Billing',
            items: [
                { name: 'Subscriptions', href: '/super-admin/subscriptions', icon: CreditCard },
                { name: 'Subscription Plans', href: '/super-admin/plans', icon: CreditCard },
            ],
        },
        {
            label: 'System',
            items: [
                { name: 'Activity Logs', href: '/super-admin/activity-logs', icon: Activity },
                { name: 'Settings', href: '/super-admin/settings', icon: Settings },
            ],
        },
    ];

    const userRole = user?.role || 'user';
    const navigation = user?.isSuperAdmin
        ? superAdminNavGroups
        : allTenantNavGroups.map(group => {
            const filteredItems = group.items.filter(item => {
                // 1. Check feature toggle
                if (item.feature) {
                    const enabledFeatures = user?.enabled_features || [];
                    if (!enabledFeatures.includes(item.feature)) return false;
                }

                // 2. Check role access
                const allowedRoles = ROLE_ACCESS[item.href];
                if (!allowedRoles) return userRole === 'admin';
                return allowedRoles.includes(userRole);
            });
            return { ...group, items: filteredItems };
        }).filter(group => group.items.length > 0);

    const handleLogout = () => {
        logout();
    };

    const sidebarWidth = collapsed ? 'lg:w-20' : 'lg:w-72';
    const contentPadding = collapsed ? 'lg:pl-20' : 'lg:pl-72';

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Mobile Sidebar overlay */}
            <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
                <div className="fixed inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl">
                    <SideNavItems navigation={navigation} location={location} handleLogout={handleLogout} collapsed={false} />
                </div>
            </div>

            {/* Desktop Sidebar */}
            <div className={`hidden lg:flex ${sidebarWidth} lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-200 bg-white shadow-sm z-30 transition-all duration-300`}>
                <SideNavItems navigation={navigation} location={location} handleLogout={handleLogout} collapsed={collapsed} />
                {/* Collapse Toggle Button */}
                <div className="px-3 py-3 border-t border-slate-200">
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="w-full flex items-center justify-center gap-2 p-2 text-sm font-medium text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {collapsed ? (
                            <PanelLeftOpen className="w-5 h-5" />
                        ) : (
                            <>
                                <PanelLeftClose className="w-5 h-5" />
                                <span>Collapse</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className={`flex flex-1 flex-col ${contentPadding} transition-all duration-300`}>
                {/* Top Header Bar */}
                <div className="sticky top-0 z-20 flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 shadow-sm sm:px-6 lg:px-8">
                    {/* Left: hamburger (mobile) + tenant name */}
                    <div className="flex items-center gap-4">
                        <button type="button" className="-m-2.5 p-2.5 text-slate-700 lg:hidden" onClick={() => setSidebarOpen(true)}>
                            <span className="sr-only">Open sidebar</span>
                            <Menu className="h-6 w-6" aria-hidden="true" />
                        </button>
                        <span className="font-bold text-brand-600 text-lg lg:hidden">ShopFlow</span>
                        <span className="hidden lg:block font-semibold text-slate-700">
                            {user?.isSuperAdmin ? 'Platform Management' : (user?.tenant_name || 'My Store')}
                        </span>
                    </div>

                    {/* Right: user profile + logout */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center font-bold shadow-sm text-sm">
                                {user?.first_name?.[0] || 'U'}
                            </div>
                            <div className="hidden sm:flex flex-col">
                                <span className="text-sm font-semibold text-slate-900 line-clamp-1">{user?.first_name} {user?.last_name}</span>
                                <span className="text-xs text-slate-500 capitalize">{user?.role || (user?.isSuperAdmin ? 'Platform Admin' : 'User')}</span>
                            </div>
                        </div>
                        <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-rose-600 transition-colors p-2 hover:bg-rose-50 rounded-lg"
                            title="Logout"
                        >
                            <LogOut className="h-5 w-5" aria-hidden="true" />
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                </div>

                <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

const SideNavItems = ({ navigation, location, handleLogout, collapsed }) => {
    // Track which groups are collapsed by label
    const [collapsedGroups, setCollapsedGroups] = useState(new Set());

    const toggleGroup = (label) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(label)) {
                next.delete(label);
            } else {
                next.add(label);
            }
            return next;
        });
    };

    // Check if a group contains the active link
    const groupHasActiveItem = (group) =>
        group.items.some(item =>
            location.pathname === item.href ||
            (item.href !== '/' && item.href !== '/super-admin' && location.pathname.startsWith(item.href))
        );

    return (
        <div className="flex h-full flex-col overflow-y-auto bg-white px-3 pb-4">
            {/* Brand Logo */}
            <div className={`flex h-16 shrink-0 items-center ${collapsed ? 'justify-center' : 'gap-3 px-3'}`}>
                <div className="p-2 bg-brand-100 rounded-lg text-brand-600">
                    <Store className="h-6 w-6" />
                </div>
                {!collapsed && (
                    <span className="text-xl font-bold tracking-tight text-slate-900">
                        ShopFlow
                    </span>
                )}
            </div>

            <nav className="flex flex-1 flex-col mt-2">
                <ul role="list" className="flex flex-1 flex-col gap-y-1">
                    {navigation.map((group, groupIndex) => {
                        const hasActive = groupHasActiveItem(group);
                        // A group is open if it has the active item OR is not in collapsed set
                        const isOpen = hasActive || !collapsedGroups.has(group.label);

                        return (
                            <li key={group.label}>
                                {/* Category Header */}
                                {collapsed ? (
                                    groupIndex > 0 && (
                                        <div className="mx-2 mb-2 border-t border-slate-200" />
                                    )
                                ) : (
                                    <button
                                        onClick={() => toggleGroup(group.label)}
                                        className="w-full flex items-center justify-between px-3 py-2 mb-0.5 rounded-md hover:bg-slate-50 transition-colors duration-150 cursor-pointer group/header"
                                    >
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 group-hover/header:text-slate-600 transition-colors">
                                            {group.label}
                                        </span>
                                        <ChevronDown
                                            className={`h-3.5 w-3.5 text-slate-400 group-hover/header:text-slate-600 transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'
                                                }`}
                                        />
                                    </button>
                                )}

                                {/* Nav Items — animated collapse */}
                                <div
                                    className="overflow-hidden transition-all duration-250 ease-in-out"
                                    style={{
                                        maxHeight: collapsed || isOpen ? '500px' : '0px',
                                        opacity: collapsed || isOpen ? 1 : 0,
                                    }}
                                >
                                    <ul role="list" className="-mx-1 space-y-0.5">
                                        {group.items.map((item) => {
                                            const isActive = location.pathname === item.href || (item.href !== '/' && item.href !== '/super-admin' && location.pathname.startsWith(item.href));
                                            return (
                                                <li key={item.name}>
                                                    <Link
                                                        to={item.href}
                                                        title={collapsed ? item.name : undefined}
                                                        className={`
                                                            group flex items-center ${collapsed ? 'justify-center' : 'gap-x-3'} rounded-lg p-2.5 text-sm leading-6 font-medium transition-all duration-200
                                                            ${isActive
                                                                ? 'bg-brand-50 text-brand-600'
                                                                : 'text-slate-700 hover:text-brand-600 hover:bg-slate-50'}
                                                        `}
                                                    >
                                                        <item.icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-brand-600'}`} />
                                                        {!collapsed && (
                                                            <>
                                                                <span className="flex-1 truncate">{item.name}</span>
                                                                {item.badge && (
                                                                    <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold leading-none text-white bg-rose-500 rounded-full animate-pulse">
                                                                        {item.badge}
                                                                    </span>
                                                                )}
                                                            </>
                                                        )}
                                                        {collapsed && item.badge && (
                                                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
                                                        )}
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </div>
    );
};

export default AppLayout;
