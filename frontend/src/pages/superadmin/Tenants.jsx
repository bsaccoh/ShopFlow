import React, { useState, useEffect } from 'react';
import { Plus, Store, CheckCircle, XCircle, Eye, Edit2, X, Activity, CreditCard, Building2 } from 'lucide-react';
import DataTable from '../../components/DataTable';
import TenantFormModal from '../../components/TenantFormModal';
import { adminApi } from '../../services/api';

const Tenants = () => {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editTenant, setEditTenant] = useState(null);
    const [viewTenant, setViewTenant] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const loadTenants = async () => {
        try {
            setLoading(true);
            const res = await adminApi.getTenants();
            if (res.success) setTenants(res.data);
        } catch (error) {
            console.error("Failed to load tenants:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadTenants(); }, []);

    const handleUpdateStatus = async (tenantId, currentStatus) => {
        if (!window.confirm(`Are you sure you want to ${currentStatus ? 'suspend' : 'activate'} this tenant?`)) return;
        try {
            const newStatus = !currentStatus;
            const res = await adminApi.updateTenantStatus(tenantId, newStatus);
            if (res.success) {
                setTenants(tenants.map(t => t.id === tenantId ? { ...t, is_active: newStatus } : t));
            }
        } catch (error) {
            alert('Failed to update tenant status: ' + (error.message || 'Unknown error'));
        }
    };

    const handleView = async (id) => {
        try {
            const res = await adminApi.getTenantById(id);
            if (res.success) setViewTenant(res.data);
        } catch (e) {
            alert('Failed to fetch tenant details');
        }
    };

    const handleEdit = async (id) => {
        try {
            const res = await adminApi.getTenantById(id);
            if (res.success) {
                setEditTenant(res.data);
                setIsModalOpen(true);
            }
        } catch (e) {
            alert('Failed to fetch tenant details');
        }
    };

    const columns = [
        {
            header: 'ID', accessor: 'id', className: 'w-16',
            render: (row) => <span className="text-slate-500">#{row.id}</span>
        },
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
            header: 'Joined', accessor: 'created_at',
            render: (row) => new Date(row.created_at).toLocaleDateString()
        },
        {
            header: 'Plan', accessor: 'plan_name',
            render: (row) => (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                    {row.plan_name || 'N/A'}
                </span>
            )
        },
        {
            header: 'Status',
            render: (row) => {
                const isActive = row.is_active?.data ? row.is_active.data[0] === 1 : row.is_active === 1;
                return (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {isActive ? 'Active' : 'Suspended'}
                    </span>
                );
            }
        },
        {
            header: 'Actions',
            render: (row) => {
                const isActive = row.is_active?.data ? row.is_active.data[0] === 1 : row.is_active === 1;
                return (
                    <div className="flex justify-end gap-1.5">
                        <button onClick={() => handleView(row.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-md transition-colors" title="View">
                            <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        <button onClick={() => handleEdit(row.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors" title="Edit">
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                        {isActive ? (
                            <button onClick={() => handleUpdateStatus(row.id, true)}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors">
                                <XCircle className="w-3.5 h-3.5" /> Suspend
                            </button>
                        ) : (
                            <button onClick={() => handleUpdateStatus(row.id, false)}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors">
                                <CheckCircle className="w-3.5 h-3.5" /> Activate
                            </button>
                        )}
                    </div>
                );
            }
        }
    ];

    const filteredTenants = tenants.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Store className="w-6 h-6 text-brand-600" /> Platform Tenants
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">Manage your clients, their subscriptions, and system access.</p>
                </div>
                <button className="btn-primary flex items-center gap-2"
                    onClick={() => { setEditTenant(null); setIsModalOpen(true); }}>
                    <Plus className="w-5 h-5" /> Add New Client
                </button>
            </div>

            {/* Data Table */}
            <DataTable columns={columns} data={filteredTenants} loading={loading} actions={false}
                onSearch={setSearchTerm} searchPlaceholder="Search by business name or email..."
                emptyMessage="No tenants found on the platform." />

            {/* Registration / Edit Modal */}
            <TenantFormModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditTenant(null); }}
                onSuccess={loadTenants} editTenant={editTenant} />

            {/* View Detail Modal */}
            {viewTenant && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen p-4">
                        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm" onClick={() => setViewTenant(null)} />
                        <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden">
                            <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Store className="w-5 h-5 text-brand-600" /> Tenant Details
                                </h3>
                                <button onClick={() => setViewTenant(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Business Name</p>
                                        <p className="font-semibold text-slate-900">{viewTenant.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Email</p>
                                        <p className="font-medium text-slate-700">{viewTenant.email}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Phone</p>
                                        <p className="font-medium text-slate-700">{viewTenant.phone || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Joined</p>
                                        <p className="font-medium text-slate-700">{new Date(viewTenant.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Status</p>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${viewTenant.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                            {viewTenant.is_active ? 'Active' : 'Suspended'}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Country</p>
                                        <p className="font-medium text-slate-700">{viewTenant.country || 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-4">
                                    <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-brand-500" /> Enabled Modules
                                    </h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(viewTenant.settings?.enabled_features || []).length > 0 ? (
                                            viewTenant.settings.enabled_features.map(f => (
                                                <span key={f} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                                    {f}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">No specific modules enabled.</span>
                                        )}
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-4">
                                    <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                        <CreditCard className="w-4 h-4 text-brand-500" /> Subscription
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Plan</p>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                                                {viewTenant.plan_name || 'N/A'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Status</p>
                                            <p className="font-medium text-slate-700">{viewTenant.subscription_status || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Cycle</p>
                                            <p className="font-medium text-slate-700">{viewTenant.billing_cycle || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Ends</p>
                                            <p className="font-medium text-slate-700">
                                                {viewTenant.current_period_end ? new Date(viewTenant.current_period_end).toLocaleDateString() : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                                <button
                                    onClick={() => { setViewTenant(null); handleEdit(viewTenant.id); }}
                                    className="inline-flex items-center px-4 py-2 border border-brand-200 text-sm font-medium rounded-lg text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors"
                                >
                                    Edit Tenant
                                </button>
                                <button
                                    onClick={() => setViewTenant(null)}
                                    className="inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Pagination UI could go here */}
        </div>
    );
};

export default Tenants;
