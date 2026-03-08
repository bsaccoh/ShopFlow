import React, { useState, useEffect } from 'react';
import { CreditCard, ArrowUpRight, CheckCircle, XCircle } from 'lucide-react';
import DataTable from '../../components/DataTable';
import { adminApi } from '../../services/api';

const Subscriptions = () => {
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadSubscriptions();
    }, []);

    const loadSubscriptions = async () => {
        try {
            setLoading(true);
            const res = await adminApi.getSubscriptions();
            if (res.success) {
                setSubscriptions(res.data);
            }
        } catch (error) {
            console.error("Failed to load subscriptions:", error);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            header: 'Tenant Name',
            render: (row) => (
                <div>
                    <div className="font-semibold text-slate-900">{row.tenant_name}</div>
                    <div className="text-xs text-slate-500">{row.tenant_email}</div>
                </div>
            )
        },
        {
            header: 'Plan',
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-medium text-slate-900">{row.plan_name}</span>
                    <span className="text-xs text-slate-500">{row.billing_cycle}</span>
                </div>
            )
        },
        {
            header: 'Amount',
            render: (row) => (
                <span className="font-medium">
                    {Number(row.price_monthly).toLocaleString()} {row.currency}
                </span>
            )
        },
        {
            header: 'Period',
            render: (row) => (
                <div className="text-sm text-slate-600 space-y-1">
                    <div><span className="text-slate-400">Start:</span> {new Date(row.current_period_start).toLocaleDateString()}</div>
                    <div><span className="text-slate-400">End:</span> {new Date(row.current_period_end).toLocaleDateString()}</div>
                </div>
            )
        },
        {
            header: 'Status',
            render: (row) => {
                const getStatusStyle = (status) => {
                    switch (status) {
                        case 'ACTIVE': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
                        case 'TRIAL': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
                        case 'PAST_DUE': return 'bg-amber-100 text-amber-800 border-amber-200';
                        case 'SUSPENDED': return 'bg-rose-100 text-rose-800 border-rose-200';
                        default: return 'bg-slate-100 text-slate-800 border-slate-200';
                    }
                };

                return (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle(row.status)}`}>
                        {row.status}
                    </span>
                );
            }
        }
    ];

    const filteredSubscriptions = subscriptions.filter(s =>
        s.tenant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.tenant_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.plan_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const activeRevenue = subscriptions
        .filter(s => s.status === 'ACTIVE' || s.status === 'PAST_DUE')
        .reduce((sum, s) => sum + Number(s.price_monthly), 0);

    const totalTrials = subscriptions.filter(s => s.status === 'TRIAL').length;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <CreditCard className="w-6 h-6 text-brand-600" />
                    Platform Subscriptions
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    Monitor recurring revenue, trials, and billing statuses across all tenants.
                </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Active MRR</p>
                        <div className="p-2 bg-emerald-50 rounded-lg">
                            <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                        </div>
                    </div>
                    <div className="mt-2">
                        <h3 className="text-3xl font-bold text-slate-900">{activeRevenue.toLocaleString()} <span className="text-base font-normal text-slate-500">SLE</span></h3>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Active Trials</p>
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-indigo-600" />
                        </div>
                    </div>
                    <div className="mt-2">
                        <h3 className="text-3xl font-bold text-slate-900">{totalTrials} <span className="text-base font-normal text-slate-500">Accounts</span></h3>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Past Due</p>
                        <div className="p-2 bg-amber-50 rounded-lg">
                            <XCircle className="w-5 h-5 text-amber-600" />
                        </div>
                    </div>
                    <div className="mt-2">
                        <h3 className="text-3xl font-bold text-slate-900">{subscriptions.filter(s => s.status === 'PAST_DUE').length} <span className="text-base font-normal text-slate-500">Accounts</span></h3>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <DataTable
                columns={columns}
                data={filteredSubscriptions}
                loading={loading}
                actions={false}
                onSearch={setSearchTerm}
                searchPlaceholder="Search by tenant or plan..."
                emptyMessage="No subscription records found."
            />
        </div>
    );
};

export default Subscriptions;
