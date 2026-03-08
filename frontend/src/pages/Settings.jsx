import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Store, CreditCard, Bell, Shield, Wallet, Percent, Plus, Pencil, Trash2, X, Star } from 'lucide-react';
import { tenantApi, authApi, storeSettingsApi, taxConfigApi, adminApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const SecurityTab = () => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setMessage(null);
        if (!currentPassword || !newPassword || !confirmPassword) {
            return setMessage({ type: 'error', text: 'All fields are required' });
        }
        if (newPassword.length < 6) {
            return setMessage({ type: 'error', text: 'New password must be at least 6 characters' });
        }
        if (newPassword !== confirmPassword) {
            return setMessage({ type: 'error', text: 'New passwords do not match' });
        }
        try {
            setLoading(true);
            const res = await authApi.changePassword({ currentPassword, newPassword });
            if (res.success) {
                setMessage({ type: 'success', text: 'Password changed successfully!' });
                setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Failed to change password' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Security Settings</h2>
            <form onSubmit={handleChangePassword} className="max-w-xl space-y-6">
                <div>
                    <h3 className="font-medium text-slate-900">Change Password</h3>
                    {message && (
                        <div className={`mt-3 text-sm p-3 rounded-lg ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                            {message.text}
                        </div>
                    )}
                    <div className="mt-4 space-y-4">
                        <input type="password" placeholder="Current Password" className="input-field"
                            value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                        <input type="password" placeholder="New Password" className="input-field"
                            value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                        <input type="password" placeholder="Confirm New Password" className="input-field"
                            value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                        <button type="submit" disabled={loading} className="btn-primary w-full">
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

const TaxConfigTab = () => {
    const { user } = useAuth();
    const isSuperAdmin = user?.isSuperAdmin;
    const [rates, setRates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', rate: '', is_default: false });
    const [tenants, setTenants] = useState([]);
    const [selectedTenant, setSelectedTenant] = useState('');
    const [overview, setOverview] = useState([]);

    useEffect(() => {
        if (isSuperAdmin) {
            adminApi.getTenants().then(res => {
                if (res.success) setTenants(res.data || []);
            }).catch(() => { });
            loadOverview();
        } else {
            loadRates();
        }
    }, []);

    const loadOverview = async () => {
        try {
            const res = await taxConfigApi.getOverview();
            if (res.success) setOverview(res.data || []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        if (isSuperAdmin && selectedTenant) {
            loadRates();
        }
    }, [selectedTenant]);

    const loadRates = async () => {
        try {
            setLoading(true);
            const params = isSuperAdmin && selectedTenant ? { tenant_id: selectedTenant } : {};
            const res = await taxConfigApi.getAll(params);
            if (res.success) setRates(res.data || []);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = { ...form, rate: parseFloat(form.rate) };
            if (isSuperAdmin && selectedTenant) data.tenant_id = selectedTenant;
            if (editing) await taxConfigApi.update(editing.id, data);
            else await taxConfigApi.create(data);
            setShowModal(false); setEditing(null);
            setForm({ name: '', rate: '', is_default: false });
            loadRates();
            if (isSuperAdmin) loadOverview();
        } catch (err) { alert(err.message || 'Failed to save tax rate'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this tax rate?')) return;
        try { await taxConfigApi.delete(id); loadRates(); if (isSuperAdmin) loadOverview(); }
        catch (err) { alert(err.message || 'Failed to delete'); }
    };

    const openEdit = (r) => {
        setEditing(r);
        setForm({ name: r.name, rate: r.rate, is_default: r.is_default });
        setShowModal(true);
    };

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Tax Rates</h2>
                    <p className="text-sm text-slate-500">Configure tax rates applied to sales.</p>
                </div>
                {(!isSuperAdmin || selectedTenant) && (
                    <button onClick={() => { setEditing(null); setForm({ name: '', rate: '', is_default: false }); setShowModal(true); }}
                        className="btn-primary flex items-center gap-2 px-3 py-2 text-sm">
                        <Plus className="w-4 h-4" /> Add Tax Rate
                    </button>
                )}
            </div>

            {/* Tenant selector for super admin */}
            {isSuperAdmin && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <label className="block text-sm font-medium text-amber-800 mb-2">Select Tenant Store</label>
                    <select className="input-field" value={selectedTenant}
                        onChange={e => setSelectedTenant(e.target.value)}>
                        <option value="">-- Choose a tenant --</option>
                        {tenants.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                        ))}
                    </select>
                    <p className="text-xs text-amber-600 mt-1">Tax rates are configured per tenant.</p>
                </div>
            )}

            {/* Overview table for super admin */}
            {isSuperAdmin && overview.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">All Tenant Tax Rates</h3>
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Tenant</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Tax Name</th>
                                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Rate (%)</th>
                                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Default</th>
                                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Date Applied</th>
                                </tr>
                            </thead>
                            <tbody>
                                {overview.map(tenant => (
                                    tenant.taxes.length > 0 ? (
                                        tenant.taxes.map((tax, idx) => (
                                            <tr key={`${tenant.tenant_id}-${tax.id}`} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                                {idx === 0 && (
                                                    <td className="px-4 py-3 font-medium text-slate-900" rowSpan={tenant.taxes.length}>
                                                        <div>{tenant.tenant_name}</div>
                                                        <div className="text-xs text-slate-400">{tenant.tenant_email}</div>
                                                    </td>
                                                )}
                                                <td className="px-4 py-3 text-slate-700">{tax.name}</td>
                                                <td className="text-center px-4 py-3">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-brand-100 text-brand-700">{tax.rate}%</span>
                                                </td>
                                                <td className="text-center px-4 py-3">
                                                    {tax.is_default ? (
                                                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-full"><Star className="w-2.5 h-2.5" /> Yes</span>
                                                    ) : <span className="text-slate-400 text-xs">—</span>}
                                                </td>
                                                <td className="text-center px-4 py-3">
                                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tax.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                        {tax.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-500 text-xs">{new Date(tax.created_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr key={tenant.tenant_id} className="border-b border-slate-100">
                                            <td className="px-4 py-3 font-medium text-slate-900">
                                                <div>{tenant.tenant_name}</div>
                                                <div className="text-xs text-slate-400">{tenant.tenant_email}</div>
                                            </td>
                                            <td colSpan={5} className="px-4 py-3 text-slate-400 italic text-xs">No tax rates configured</td>
                                        </tr>
                                    )
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {isSuperAdmin && !selectedTenant ? (
                <div className="text-center py-12 text-slate-400">
                    <Percent className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-medium">Select a tenant above to manage their tax rates</p>
                </div>
            ) : loading ? (
                <p className="text-sm text-slate-400">Loading...</p>
            ) : rates.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                    <Percent className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-medium">No tax rates configured</p>
                    <p className="text-xs">Add your first tax rate to apply it to sales.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {rates.map(r => (
                        <div key={r.id} className={`border rounded-xl p-4 flex items-center justify-between transition-colors ${r.is_default ? 'border-brand-300 bg-brand-50/50' : 'border-slate-200 bg-white'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${r.is_default ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500'}`}>
                                    {r.rate}%
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-slate-900">{r.name}</p>
                                        {r.is_default && <span className="flex items-center gap-0.5 text-[10px] font-bold text-brand-600 bg-brand-100 px-1.5 py-0.5 rounded-full"><Star className="w-2.5 h-2.5" /> DEFAULT</span>}
                                    </div>
                                    <p className="text-xs text-slate-500">{r.is_active ? 'Active' : 'Inactive'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-slate-100 rounded-lg"><Pencil className="w-3.5 h-3.5 text-slate-400" /></button>
                                <button onClick={() => handleDelete(r.id)} className="p-1.5 hover:bg-rose-50 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-rose-400" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen p-4">
                        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                        <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full">
                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="text-lg font-bold">{editing ? 'Edit Tax Rate' : 'Add Tax Rate'}</h3>
                                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                                    <input type="text" className="input-field" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. GST, VAT, Sales Tax" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Rate (%) *</label>
                                    <input type="number" step="0.01" min="0" max="100" className="input-field" required value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} placeholder="e.g. 15" />
                                </div>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" checked={form.is_default} onChange={e => setForm({ ...form, is_default: e.target.checked })} />
                                    <span className="text-sm text-slate-700">Set as default tax rate</span>
                                </label>
                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                    <button type="button" onClick={() => setShowModal(false)} className="btn-secondary px-4">Cancel</button>
                                    <button type="submit" className="btn-primary px-6">{editing ? 'Update' : 'Create'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const Settings = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('general');
    const [loading, setLoading] = useState(false);
    const [subscription, setSubscription] = useState(null);
    const [loadingSub, setLoadingSub] = useState(true);

    // Form States
    const [generalSettings, setGeneralSettings] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        currency: 'SLE'
    });

    const [paymentConfig, setPaymentConfig] = useState({
        orangeMoneyActive: true,
        orangeMoneyMerchantId: '',
        afrimoneyActive: false,
        afrimoneyMerchantId: ''
    });

    useEffect(() => {
        // Load store settings from DB
        storeSettingsApi.get().then(res => {
            if (res.success && res.data) {
                setGeneralSettings(prev => ({
                    name: res.data.store_name || prev.name,
                    email: res.data.store_email || prev.email,
                    phone: res.data.store_phone || prev.phone,
                    address: res.data.store_address || prev.address,
                    currency: res.data.store_currency || prev.currency,
                }));
            }
        }).catch(() => { });
    }, []);

    useEffect(() => {
        const fetchSubscription = async () => {
            try {
                setLoadingSub(true);
                const res = await tenantApi.getCurrentSubscription();
                if (res.success) setSubscription(res.data);
            } catch (err) {
                console.error("Failed to fetch subscription:", err);
            } finally {
                setLoadingSub(false);
            }
        };
        if (activeTab === 'subscription') fetchSubscription();
    }, [activeTab]);

    const handleSaveGeneral = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await storeSettingsApi.save({
                store_name: generalSettings.name,
                store_email: generalSettings.email,
                store_phone: generalSettings.phone,
                store_address: generalSettings.address,
                store_currency: generalSettings.currency,
            });
            alert('Settings saved successfully!');
        } catch (e) {
            alert('Failed to save settings');
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Store Settings</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Manage your store details, payment providers, and preferences.
                </p>
            </div>

            <div className="flex flex-col md:flex-row gap-6">

                {/* Settings Sidebar nav */}
                <div className="w-full md:w-64 shrink-0 space-y-1">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'general' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <Store className="w-5 h-5" /> General Details
                    </button>
                    <button
                        onClick={() => setActiveTab('payments')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'payments' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <CreditCard className="w-5 h-5" /> Payment Providers
                    </button>
                    <button
                        onClick={() => setActiveTab('subscription')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'subscription' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <Wallet className="w-5 h-5" /> Subscription Details
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'security' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <Shield className="w-5 h-5" /> Security
                    </button>
                    <button
                        onClick={() => setActiveTab('tax')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'tax' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <Percent className="w-5 h-5" /> Tax Configuration
                    </button>
                </div>

                {/* Settings Content Area */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200">

                    {activeTab === 'general' && (
                        <div className="p-6">
                            <h2 className="text-lg font-semibold text-slate-900 mb-4">Store Information</h2>
                            <form onSubmit={handleSaveGeneral} className="space-y-6 max-w-2xl">
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700">Store Name</label>
                                        <input type="text" className="input-field mt-1" value={generalSettings.name} onChange={e => setGeneralSettings({ ...generalSettings, name: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Contact Email</label>
                                        <input type="email" className="input-field mt-1" value={generalSettings.email} onChange={e => setGeneralSettings({ ...generalSettings, email: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Phone Number</label>
                                        <input type="tel" className="input-field mt-1" value={generalSettings.phone} onChange={e => setGeneralSettings({ ...generalSettings, phone: e.target.value })} />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700">Store Address</label>
                                        <textarea rows={3} className="input-field mt-1 resize-none" value={generalSettings.address} onChange={e => setGeneralSettings({ ...generalSettings, address: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Currency</label>
                                        <select className="input-field mt-1" value={generalSettings.currency} onChange={e => setGeneralSettings({ ...generalSettings, currency: e.target.value })}>
                                            <option value="SLE">LE (Sierra Leonean Leone)</option>
                                            <option value="USD">USD (US Dollar)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-200 flex justify-end">
                                    <button type="submit" disabled={loading} className="btn-primary px-6">
                                        {loading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'payments' && (
                        <div className="p-6">
                            <h2 className="text-lg font-semibold text-slate-900 mb-6">Payment Integrations</h2>

                            <div className="space-y-6 max-w-2xl">
                                {/* Orange Money */}
                                <div className={`border rounded-lg p-5 transition-colors ${paymentConfig.orangeMoneyActive ? 'border-orange-500 bg-orange-50/30' : 'border-slate-200 bg-white'}`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-[#FF7900] text-white rounded-lg flex items-center justify-center font-bold text-xl">O</div>
                                            <div>
                                                <h3 className="font-semibold text-slate-900">Orange Money</h3>
                                                <p className="text-sm text-slate-500">Accept mobile money payments from Orange customers.</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={paymentConfig.orangeMoneyActive} onChange={e => setPaymentConfig({ ...paymentConfig, orangeMoneyActive: e.target.checked })} />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                                        </label>
                                    </div>

                                    {paymentConfig.orangeMoneyActive && (
                                        <div className="mt-4 pt-4 border-t border-slate-200/60">
                                            <label className="block text-sm font-medium text-slate-700">Merchant Code</label>
                                            <input type="text" className="input-field mt-1" value={paymentConfig.orangeMoneyMerchantId} onChange={e => setPaymentConfig({ ...paymentConfig, orangeMoneyMerchantId: e.target.value })} placeholder="e.g. 123456" />
                                            <p className="text-xs text-slate-500 mt-2">Find this in your Orange Money Merchant Portal.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Afrimoney */}
                                <div className={`border rounded-lg p-5 transition-colors ${paymentConfig.afrimoneyActive ? 'border-[#E3000F] bg-red-50/30' : 'border-slate-200 bg-white'}`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-[#E3000F] text-white rounded-lg flex items-center justify-center font-bold text-xl">A</div>
                                            <div>
                                                <h3 className="font-semibold text-slate-900">Afrimoney</h3>
                                                <p className="text-sm text-slate-500">Accept mobile money payments from Africell customers.</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={paymentConfig.afrimoneyActive} onChange={e => setPaymentConfig({ ...paymentConfig, afrimoneyActive: e.target.checked })} />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                                        </label>
                                    </div>

                                    {paymentConfig.afrimoneyActive && (
                                        <div className="mt-4 pt-4 border-t border-slate-200/60">
                                            <label className="block text-sm font-medium text-slate-700">Merchant Till Number</label>
                                            <input type="text" className="input-field mt-1" value={paymentConfig.afrimoneyMerchantId} onChange={e => setPaymentConfig({ ...paymentConfig, afrimoneyMerchantId: e.target.value })} placeholder="e.g. 10456" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end">
                                    <button className="btn-primary px-6" onClick={handleSaveGeneral}>Save API Config</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'subscription' && (
                        <div className="p-6">
                            <h2 className="text-lg font-semibold text-slate-900 mb-6">Current Subscription</h2>
                            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white max-w-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Store className="w-32 h-32" />
                                </div>
                                <div className="relative z-10">
                                    {loadingSub ? (
                                        <div className="flex items-center gap-2 text-slate-300">
                                            <span className="w-5 h-5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></span>
                                            Loading subscription details...
                                        </div>
                                    ) : subscription ? (
                                        <>
                                            <div className="flex items-center justify-between">
                                                <span className="bg-brand-500/20 text-brand-300 px-3 py-1 rounded-full text-sm font-bold border border-brand-500/30">
                                                    {subscription.plan_name} Plan
                                                </span>
                                                <span className={`font-mono ${subscription.status === 'ACTIVE' || subscription.status === 'TRIAL' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {subscription.status}
                                                </span>
                                            </div>
                                            <div className="mt-6 mb-2">
                                                <span className="text-4xl font-bold">{subscription.billing_cycle === 'MONTHLY' ? 'Monthly' : 'Yearly'} Cycle</span>
                                            </div>
                                            <p className="text-slate-300 text-sm mb-6">
                                                Next billing date: {new Date(subscription.current_period_end).toLocaleDateString()}
                                                {subscription.status === 'TRIAL' && (
                                                    <span className="ml-2 text-indigo-300">
                                                        (Trial ends: {new Date(subscription.trial_ends_at).toLocaleDateString()})
                                                    </span>
                                                )}
                                            </p>

                                            <div className="space-y-3 pt-4 border-t border-slate-700 text-sm text-slate-300">
                                                <div className="flex justify-between">
                                                    <span>User Licenses (Allowed)</span>
                                                    <span className="font-mono font-medium text-white">{subscription.max_users}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Product Limit</span>
                                                    <span className="font-mono font-medium text-white">{subscription.max_products}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Mobile Money Integration</span>
                                                    <span className="font-mono font-medium text-white">
                                                        {subscription.has_mobile_money ? 'Enabled' : 'Not Available'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mt-8 flex gap-4">
                                                <button className="bg-white text-slate-900 px-4 py-2 font-medium rounded hover:bg-slate-100 transition-colors">Upgrade Plan</button>
                                                <button className="bg-slate-700/50 text-white px-4 py-2 font-medium rounded hover:bg-slate-700 transition-colors border border-slate-600">View Invoices</button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-slate-300">No active subscription found.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <SecurityTab />
                    )}

                    {activeTab === 'tax' && (
                        <TaxConfigTab />
                    )}

                </div>
            </div>
        </div>
    );
};

export default Settings;
