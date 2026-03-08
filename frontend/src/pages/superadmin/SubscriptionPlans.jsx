import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import DataTable from '../../components/DataTable';
import { adminApi } from '../../services/api';

const PlanFormModal = ({ isOpen, onClose, onSuccess, plan }) => {
    const [form, setForm] = useState({
        name: '', description: '', price_monthly: '', price_yearly: '',
        max_users: 5, max_products: 100, max_branches: 1,
        has_api_access: false, has_advanced_reports: false, has_multi_warehouse: false, has_mobile_money: false, sort_order: 0
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && plan) {
            setForm({
                name: plan.name || '', description: plan.description || '',
                price_monthly: plan.price_monthly || '', price_yearly: plan.price_yearly || '',
                max_users: plan.max_users || 5, max_products: plan.max_products || 100, max_branches: plan.max_branches || 1,
                has_api_access: !!plan.has_api_access, has_advanced_reports: !!plan.has_advanced_reports,
                has_multi_warehouse: !!plan.has_multi_warehouse, has_mobile_money: !!plan.has_mobile_money,
                sort_order: plan.sort_order || 0
            });
        } else if (isOpen) {
            setForm({
                name: '', description: '', price_monthly: '', price_yearly: '', max_users: 5, max_products: 100, max_branches: 1,
                has_api_access: false, has_advanced_reports: false, has_multi_warehouse: false, has_mobile_money: false, sort_order: 0
            });
        }
    }, [isOpen, plan]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            const payload = { ...form, price_monthly: parseFloat(form.price_monthly), price_yearly: parseFloat(form.price_yearly || 0) };
            const res = plan ? await adminApi.updatePlan(plan.id, payload) : await adminApi.createPlan(payload);
            if (res.success) { onSuccess(); onClose(); }
            else setError(res.message || 'Failed');
        } catch (err) { setError(err.message || 'Failed to save plan'); }
        finally { setLoading(false); }
    };

    const toggleFeature = (key) => setForm(f => ({ ...f, [key]: !f[key] }));

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm" onClick={onClose} />
                <div className="relative bg-white rounded-2xl shadow-xl max-w-xl w-full border border-slate-200 overflow-hidden">
                    <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-900">{plan ? 'Edit Plan' : 'Create Subscription Plan'}</h3>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
                    </div>

                    {error && <div className="mx-6 mt-4 bg-rose-50 text-rose-600 p-3 rounded-lg text-sm border border-rose-100">{error}</div>}

                    <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Plan Name *</label>
                            <input type="text" required className="input-field mt-1" value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })} placeholder="E.g., Starter" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Description</label>
                            <textarea className="input-field mt-1 resize-none" rows={2} value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Short description..." />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Monthly Price (Le) *</label>
                                <input type="number" required className="input-field mt-1" value={form.price_monthly}
                                    onChange={e => setForm({ ...form, price_monthly: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Yearly Price (Le)</label>
                                <input type="number" className="input-field mt-1" value={form.price_yearly}
                                    onChange={e => setForm({ ...form, price_yearly: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Max Users</label>
                                <input type="number" className="input-field mt-1" value={form.max_users}
                                    onChange={e => setForm({ ...form, max_users: parseInt(e.target.value) })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Max Products</label>
                                <input type="number" className="input-field mt-1" value={form.max_products}
                                    onChange={e => setForm({ ...form, max_products: parseInt(e.target.value) })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Max Branches</label>
                                <input type="number" className="input-field mt-1" value={form.max_branches}
                                    onChange={e => setForm({ ...form, max_branches: parseInt(e.target.value) })} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Features</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { key: 'has_api_access', label: 'API Access' },
                                    { key: 'has_advanced_reports', label: 'Advanced Reports' },
                                    { key: 'has_multi_warehouse', label: 'Multi-Warehouse' },
                                    { key: 'has_mobile_money', label: 'Mobile Money' }
                                ].map(f => (
                                    <button type="button" key={f.key} onClick={() => toggleFeature(f.key)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${form[f.key]
                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                                        {form[f.key] ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Sort Order</label>
                            <input type="number" className="input-field mt-1 w-24" value={form.sort_order}
                                onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) })} />
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <button type="button" onClick={onClose} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
                            <button type="submit" disabled={loading} className="btn-primary px-5 py-2 text-sm">
                                {loading ? 'Saving...' : (plan ? 'Update Plan' : 'Create Plan')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

const SubscriptionPlans = () => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editPlan, setEditPlan] = useState(null);

    useEffect(() => { loadPlans(); }, []);

    const loadPlans = async () => {
        try {
            setLoading(true);
            const res = await adminApi.getPlans();
            if (res.success) setPlans(res.data);
        } catch (e) { console.error('Failed to load plans', e); }
        finally { setLoading(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to deactivate this plan?')) return;
        try {
            const res = await adminApi.deletePlan(id);
            if (res.success) loadPlans();
        } catch (e) { alert('Failed to deactivate plan'); }
    };

    const columns = [
        {
            header: 'Plan Name',
            render: (row) => (
                <div>
                    <div className="font-semibold text-slate-900">{row.name}</div>
                    <div className="text-xs text-slate-500">{row.description || 'No description'}</div>
                </div>
            )
        },
        {
            header: 'Pricing',
            render: (row) => (
                <div>
                    <div className="font-semibold text-slate-900">LE {Number(row.price_monthly).toLocaleString()}<span className="text-xs font-normal text-slate-500">/mo</span></div>
                    {row.price_yearly > 0 && <div className="text-xs text-slate-500">LE {Number(row.price_yearly).toLocaleString()}/yr</div>}
                </div>
            )
        },
        {
            header: 'Limits',
            render: (row) => (
                <div className="text-xs text-slate-600 space-y-0.5">
                    <div>{row.max_users} users · {row.max_products} products</div>
                    <div>{row.max_branches} branch{row.max_branches > 1 ? 'es' : ''}</div>
                </div>
            )
        },
        {
            header: 'Features',
            render: (row) => (
                <div className="flex flex-wrap gap-1">
                    {row.has_mobile_money ? <span className="px-1.5 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-700 rounded">MoMo</span> : null}
                    {row.has_api_access ? <span className="px-1.5 py-0.5 text-[10px] font-medium bg-indigo-100 text-indigo-700 rounded">API</span> : null}
                    {row.has_advanced_reports ? <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded">Reports</span> : null}
                    {row.has_multi_warehouse ? <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded">Multi-WH</span> : null}
                </div>
            )
        },
        {
            header: 'Status',
            render: (row) => {
                const active = row.is_active?.data ? row.is_active.data[0] === 1 : row.is_active === 1;
                return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{active ? 'Active' : 'Inactive'}</span>;
            }
        },
        {
            header: 'Actions',
            render: (row) => (
                <div className="flex justify-end gap-1.5">
                    <button onClick={() => { setEditPlan(row); setIsFormOpen(true); }}
                        className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 border border-transparent hover:border-brand-200 rounded transition-colors" title="Edit">
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(row.id)}
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded transition-colors" title="Deactivate">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            )
        }
    ];

    const filtered = plans.filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <CreditCard className="w-6 h-6 text-brand-600" /> Subscription Plans
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">Manage pricing tiers, feature limits, and billing plans.</p>
                </div>
                <button className="btn-primary flex items-center gap-2" onClick={() => { setEditPlan(null); setIsFormOpen(true); }}>
                    <Plus className="w-5 h-5" /> Add Plan
                </button>
            </div>

            <DataTable columns={columns} data={filtered} loading={loading} actions={false}
                onSearch={setSearchTerm} searchPlaceholder="Search plans..."
                emptyMessage="No subscription plans found." />

            <PlanFormModal isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setEditPlan(null); }}
                onSuccess={loadPlans} plan={editPlan} />
        </div>
    );
};

export default SubscriptionPlans;
