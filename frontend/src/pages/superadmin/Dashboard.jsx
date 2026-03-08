import React, { useMemo, useEffect, useState } from 'react';
import { Store, CreditCard, Users, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { adminApi } from '../../services/api';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import DataTable from '../../components/DataTable';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
        return (
            <div className="bg-white px-4 py-3 rounded-xl shadow-lg border border-slate-200 text-sm">
                <p className="font-semibold text-slate-900 mb-1">{label}</p>
                {payload.map((p, i) => (
                    <p key={i} className="text-slate-600">
                        <span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: p.color }} />
                        {p.name}: <span className="font-medium text-slate-900">{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const SuperAdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [recentTenants, setRecentTenants] = useState([]);
    const [monthlyGrowth, setMonthlyGrowth] = useState([]);
    const [planDistribution, setPlanDistribution] = useState([]);
    const [weeklySignups, setWeeklySignups] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await adminApi.getDashboardStats();
                if (res.success) {
                    setStats(res.data.stats);
                    setRecentTenants(res.data.recentTenants || []);
                    setMonthlyGrowth(res.data.monthlyGrowth || []);
                    setPlanDistribution(res.data.planDistribution || []);
                    setWeeklySignups(res.data.weeklySignups || []);
                }
            } catch (error) {
                console.error('Failed to load dashboard stats', error);
                setStats({
                    totalTenants: 0,
                    activeTenants: 0,
                    totalRevenue: 0,
                    totalUsers: 0
                });
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    const safePlanDistribution = useMemo(
        () => planDistribution.map((item) => ({ name: item.name, value: Number(item.value || 0) })),
        [planDistribution]
    );

    const tenantColumns = [
        {
            header: 'Tenant Name',
            render: (row) => (
                <div>
                    <div className="font-semibold text-slate-900">{row.name}</div>
                    <div className="text-xs text-slate-500">{row.email}</div>
                </div>
            )
        },
        {
            header: 'Plan',
            render: (row) => <span className="text-slate-600 font-medium">{row.plan_name || 'N/A'}</span>
        },
        {
            header: 'Status',
            render: (row) => {
                const status = row.subscription_status || 'N/A';
                let colorClasses = 'bg-slate-100 text-slate-700';
                if (status === 'ACTIVE') colorClasses = 'bg-emerald-100 text-emerald-700';
                if (status === 'PAST_DUE') colorClasses = 'bg-amber-100 text-amber-700';
                if (status === 'TRIAL') colorClasses = 'bg-indigo-100 text-indigo-700';
                if (status === 'SUSPENDED') colorClasses = 'bg-rose-100 text-rose-700';
                return <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${colorClasses}`}>{status}</span>;
            }
        },
        {
            header: 'Joined',
            render: (row) => <span className="text-sm text-slate-600">{new Date(row.created_at).toLocaleDateString()}</span>
        }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform Overview</h1>
                <p className="mt-1 text-sm text-slate-500">Monitor global system metrics, revenue, and tenant growth.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card-modern p-5">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Tenants</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.totalTenants ?? 0}</p>
                        </div>
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Store className="w-5 h-5" /></div>
                    </div>
                    <div className="mt-4 flex items-center text-sm">
                        <span className={`${(stats?.tenantGrowthPct ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'} font-medium flex items-center`}>
                            {(stats?.tenantGrowthPct ?? 0) >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                            {Math.abs(stats?.tenantGrowthPct ?? 0)}%
                        </span>
                        <span className="text-slate-400 ml-2">vs previous month</span>
                    </div>
                </div>

                <div className="card-modern p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full blur-3xl -mr-10 -mt-10" />
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Monthly R. Revenue</p>
                            <p className="text-2xl font-bold text-brand-600 mt-1">LE {Number(stats?.totalRevenue ?? 0).toLocaleString()}</p>
                        </div>
                        <div className="p-2 bg-brand-100 text-brand-600 rounded-lg"><CreditCard className="w-5 h-5" /></div>
                    </div>
                    <div className="mt-4 flex items-center text-sm relative z-10">
                        <span className={`${(stats?.revenueGrowthPct ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'} font-medium flex items-center`}>
                            {(stats?.revenueGrowthPct ?? 0) >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                            {Math.abs(stats?.revenueGrowthPct ?? 0)}%
                        </span>
                        <span className="text-slate-400 ml-2">vs previous month</span>
                    </div>
                </div>

                <div className="card-modern p-5">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Platform Users</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.totalUsers ?? 0}</p>
                        </div>
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Users className="w-5 h-5" /></div>
                    </div>
                    <div className="mt-4 flex items-center text-sm">
                        <span className="text-emerald-600 font-medium flex items-center"><ArrowUpRight className="w-3 h-3 mr-1" /> +{stats?.usersThisWeek ?? 0}</span>
                        <span className="text-slate-400 ml-2">new this week</span>
                    </div>
                </div>

                <div className="card-modern p-5">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Active Tenant Rate</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.activeTenantRate ?? 0}%</p>
                        </div>
                        <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><AlertTriangle className="w-5 h-5" /></div>
                    </div>
                    <div className="mt-4 flex items-center text-sm">
                        <span className="text-slate-600 font-medium flex items-center">
                            <ArrowUpRight className="w-3 h-3 mr-1" /> {stats?.activeTenants ?? 0} active
                        </span>
                        <span className="text-slate-400 ml-2">of {stats?.totalTenants ?? 0} tenants</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-base font-semibold text-slate-900">Revenue & Growth Trend</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Monthly revenue and tenant count over time</p>
                        </div>
                        <span className="text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">Last 7 Months</span>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={monthlyGrowth} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="tenantsGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `LE ${(v / 1000).toFixed(0)}k`} />
                            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                            <Area yAxisId="left" type="monotone" dataKey="revenue" name="Revenue (Le)" stroke="#6366f1" strokeWidth={2.5} fill="url(#revenueGrad)" />
                            <Area yAxisId="right" type="monotone" dataKey="tenants" name="Tenants" stroke="#22c55e" strokeWidth={2.5} fill="url(#tenantsGrad)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="mb-4">
                        <h3 className="text-base font-semibold text-slate-900">Subscription Plans</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Tenants by plan type</p>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie
                                data={safePlanDistribution}
                                cx="50%" cy="50%"
                                innerRadius={55} outerRadius={85}
                                paddingAngle={4}
                                dataKey="value"
                                strokeWidth={0}
                            >
                                {safePlanDistribution.map((_, idx) => (
                                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(val, name) => [`${val} tenants`, name]} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        {safePlanDistribution.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                <span className="text-slate-600">{item.name}</span>
                                <span className="ml-auto font-semibold text-slate-900">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="mb-4">
                        <h3 className="text-base font-semibold text-slate-900">Weekly Sign-ups</h3>
                        <p className="text-xs text-slate-500 mt-0.5">New tenant registrations this week</p>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={weeklySignups} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="signups" name="Signups" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={28} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-base font-semibold text-slate-900 mb-4">Recently Onboarded Tenants</h3>
                        <DataTable
                            columns={tenantColumns}
                            data={recentTenants}
                            actions={false}
                            onSearch={() => { }}
                            searchPlaceholder="Search tenants by name..."
                            emptyMessage="No tenants found."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminDashboard;
