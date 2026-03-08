import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, ShoppingCart, Package, Users, AlertTriangle, Banknote, PiggyBank } from 'lucide-react';
import { Link } from 'react-router-dom';
import { reportsApi } from '../services/api';
import {
    AreaChart, Area, PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const CHART_COLORS = ['#6366f1', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

const CustomTooltip = ({ active, payload, label, prefix = '' }) => {
    if (active && payload?.length) {
        return (
            <div className="bg-white/95 backdrop-blur-sm shadow-lg rounded-xl px-4 py-3 border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
                {payload.map((entry, i) => (
                    <p key={i} className="text-sm font-bold" style={{ color: entry.color }}>
                        {prefix}{parseFloat(entry.value || 0).toLocaleString()}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const Dashboard = () => {
    const { user } = useAuth();
    const [statsData, setStatsData] = useState(null);
    const [lowStockItems, setLowStockItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [statsRes, lowRes] = await Promise.all([
                    reportsApi.getDashboardStats(),
                    reportsApi.getLowStockItems()
                ]);
                if (statsRes.success) setStatsData(statsRes.data);
                if (lowRes.success) setLowStockItems(lowRes.data || []);
            } catch (error) {
                console.error('Failed to fetch dashboard data', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    const weeklySales = useMemo(
        () => (statsData?.weeklySales || []).map((d) => ({
            day: d.day,
            amount: parseFloat(d.amount || 0)
        })),
        [statsData]
    );

    const bestSellingProducts = useMemo(
        () =>
            (statsData?.bestSellingProducts || []).map((item, i) => ({
                name: item.name?.length > 16 ? `${item.name.slice(0, 16)}...` : item.name,
                fullName: item.name,
                value: parseFloat(item.quantity || 0),
                revenue: parseFloat(item.revenue || 0),
                color: CHART_COLORS[i % CHART_COLORS.length]
            })),
        [statsData]
    );

    const revenueExpenseTrend = useMemo(
        () => (statsData?.revenueExpenseTrend || []).map((d) => ({
            day: d.day,
            revenue: Number(d.revenue || 0),
            expense: Number(d.expense || 0)
        })),
        [statsData]
    );

    const stats = [
        { name: "Today's Sales", value: `LE ${parseFloat(statsData?.stats?.todaysSales || 0).toLocaleString()}`, icon: TrendingUp, color: 'from-indigo-500 to-indigo-600' },
        { name: 'Total Sales', value: `LE ${parseFloat(statsData?.stats?.totalSales || 0).toLocaleString()}`, icon: Banknote, color: 'from-emerald-500 to-emerald-600' },
        { name: 'Total Purchases', value: `LE ${parseFloat(statsData?.stats?.totalPurchases || 0).toLocaleString()}`, icon: PiggyBank, color: 'from-cyan-500 to-cyan-600' },
        { name: 'Total Orders', value: statsData?.stats?.totalOrders || 0, icon: ShoppingCart, color: 'from-amber-500 to-amber-600' },
        { name: 'Low Stock Items', value: statsData?.stats?.lowStock || 0, icon: Package, color: statsData?.stats?.lowStock > 0 ? 'from-rose-500 to-rose-600' : 'from-emerald-500 to-emerald-600' },
        { name: 'Active Customers', value: statsData?.stats?.activeCustomers || 0, icon: Users, color: 'from-violet-500 to-violet-600' }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Welcome back, {user?.first_name}!
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">Here is what is happening in your store.</p>
                </div>
                <div className="text-sm font-medium text-slate-600 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {stats.map((item) => (
                    <div key={item.name} className="card-modern p-6 relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <item.icon className="w-16 h-16 text-brand-600 transform group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className={`p-3 rounded-xl bg-gradient-to-br ${item.color} text-white shadow-md transition-transform group-hover:scale-110 duration-200`}>
                                <item.icon className="h-6 w-6" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">{item.name}</p>
                                <p className="text-2xl font-bold text-slate-900">{item.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 card-modern p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-indigo-500" /> Weekly Sales
                            </h2>
                            <p className="text-xs text-slate-500 mt-1">Last 7 days</p>
                        </div>
                        <span className="text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                            Last 7 Days
                        </span>
                    </div>
                    {weeklySales.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={weeklySales} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="weeklySalesGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.28} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={true} />
                                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => `LE ${(v / 1000).toFixed(0)}k`} />
                                <Tooltip content={<CustomTooltip prefix="LE " />} />
                                <Area
                                    type="monotone"
                                    dataKey="amount"
                                    name="Revenue (Le)"
                                    stroke="#6366f1"
                                    strokeWidth={3}
                                    fill="url(#weeklySalesGrad)"
                                    dot={false}
                                    activeDot={{ r: 5, strokeWidth: 0, fill: '#6366f1' }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[280px] text-slate-400 text-sm">No weekly sales data available.</div>
                    )}
                </div>

                <div className="card-modern p-6">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6">
                        <Package className="w-5 h-5 text-cyan-500" /> Best Sellers
                    </h2>
                    {bestSellingProducts.length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={bestSellingProducts}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={85}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {bestSellingProducts.map((entry, index) => (
                                            <Cell key={index} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value, _, item) => [`${value} qty`, item?.payload?.fullName || 'Product']} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-2 mt-2">
                                {bestSellingProducts.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                            <span className="text-slate-600">{item.name}</span>
                                        </div>
                                        <span className="font-semibold text-slate-900">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-[220px] text-slate-400 text-sm">No best-seller data available.</div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card-modern p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-emerald-500" /> Revenue Trend
                            </h2>
                            <p className="text-xs text-slate-500 mt-1">Last 7 days</p>
                        </div>
                    </div>
                    {revenueExpenseTrend.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={revenueExpenseTrend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="revenueTrendGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.24} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={0} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => `LE ${(v / 1000).toFixed(0)}k`} />
                                <Tooltip content={<CustomTooltip prefix="LE " />} />
                                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#22c55e" strokeWidth={2.5} fill="url(#revenueTrendGrad)" dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[300px] text-slate-400 text-sm">No revenue data available.</div>
                    )}
                </div>

                <div className="card-modern p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-rose-500" /> Expense Trend
                            </h2>
                            <p className="text-xs text-slate-500 mt-1">Last 7 days</p>
                        </div>
                    </div>
                    {revenueExpenseTrend.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={revenueExpenseTrend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
                                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={0} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => `LE ${(v / 1000).toFixed(0)}k`} />
                                <Tooltip content={<CustomTooltip prefix="LE " />} cursor={{ fill: '#f8fafc' }} />
                                <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={48} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[300px] text-slate-400 text-sm">No expense data available.</div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card-modern p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" /> Stock Alerts
                        </h2>
                        <Link to="/inventory" className="text-xs text-brand-600 font-medium hover:underline">View All</Link>
                    </div>
                    {lowStockItems.length > 0 ? (
                        <div className="space-y-3 max-h-[340px] overflow-y-auto">
                            {lowStockItems.slice(0, 8).map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-amber-50/60 border border-amber-100 rounded-xl">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900 line-clamp-1">{item.name}</p>
                                        <p className="text-xs text-slate-500">{item.sku || 'No SKU'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-rose-600">{item.quantity || item.current_stock} left</p>
                                        <p className="text-[11px] text-slate-500">Min: {item.min_stock_level}</p>
                                    </div>
                                </div>
                            ))}
                            {lowStockItems.length > 8 && <p className="text-xs text-center text-slate-400">+{lowStockItems.length - 8} more items</p>}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[220px] text-slate-400">
                            <Package className="w-10 h-10 mb-2 text-slate-300" />
                            <p className="text-sm font-medium">All stock levels are healthy</p>
                        </div>
                    )}
                </div>

                <div className="card-modern p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Transactions</h2>
                    <div className="space-y-3">
                        {loading ? (
                            <p className="text-slate-500 text-sm">Loading transactions...</p>
                        ) : statsData?.recentTransactions?.length > 0 ? (
                            statsData.recentTransactions.map((txn) => (
                                <div key={txn.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">{txn.reference}</p>
                                        <p className="text-xs text-slate-500">
                                            {new Date(txn.created_at).toLocaleDateString()} {new Date(txn.created_at).toLocaleTimeString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-slate-900">LE {parseFloat(txn.total_amount || 0).toLocaleString()}</p>
                                        <p className={`text-xs font-medium ${(txn.payment_status === 'COMPLETED' || txn.payment_status === 'PAID') ? 'text-emerald-600' : 'text-amber-600'}`}>
                                            {txn.payment_status}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-500 text-sm">No recent transactions.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
