import React, { useState, useEffect } from 'react';
import { X, Building2, User, Mail, Phone, Lock, CreditCard, Wallet, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../services/api';

const TenantFormModal = ({ isOpen, onClose, onSuccess, editTenant }) => {
    const { registerTenant } = useAuth();

    const [formData, setFormData] = useState({
        tenantName: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        planId: '',
        billingCycle: 'MONTHLY',
        paymentProvider: '',
        enabledFeatures: []
    });

    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadPlans();
            if (editTenant) {
                setFormData({
                    tenantName: editTenant.name || '',
                    firstName: '',
                    lastName: '',
                    email: editTenant.email || '',
                    phone: editTenant.phone || '',
                    password: '',
                    confirmPassword: '',
                    planId: editTenant.plan_id?.toString() || '',
                    billingCycle: editTenant.billing_cycle || 'MONTHLY',
                    paymentProvider: '',
                    enabledFeatures: editTenant.settings?.enabled_features || []
                });
            } else {
                setFormData({
                    tenantName: '', firstName: '', lastName: '', email: '', phone: '',
                    password: '', confirmPassword: '', planId: '', billingCycle: 'MONTHLY', paymentProvider: '',
                    enabledFeatures: ['POS', 'Products', 'Sales History', 'Customers', 'Staff & Roles', 'Branch Management'] // Default features
                });
            }
        }
    }, [isOpen, editTenant]);

    const loadPlans = async () => {
        try {
            const res = await adminApi.getPlans();
            if (res.success) {
                setPlans(res.data);
            }
        } catch (e) {
            console.error('Failed to load plans', e);
        }
    };

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (error) setError('');
    };

    const handleFeatureToggle = (feature) => {
        const current = formData.enabledFeatures || [];
        if (current.includes(feature)) {
            setFormData({ ...formData, enabledFeatures: current.filter(f => f !== feature) });
        } else {
            setFormData({ ...formData, enabledFeatures: [...current, feature] });
        }
    };

    const FEATURES_LIST = [
        { id: 'Cash Register', icon: 'Calculator' },
        { id: 'Inventory Control', icon: 'Package' },
        { id: 'Expenses', icon: 'Banknote' },
        { id: 'Sales Reports', icon: 'BarChart3' },
        { id: 'Profit & Loss', icon: 'PieChart' },
        { id: 'Discounts & Coupons', icon: 'Tag' },
        { id: 'Loyalty Points', icon: 'Gift' },
        { id: 'Customer Credits', icon: 'Wallet' },
        { id: 'Suppliers', icon: 'Truck' },
        { id: 'Purchase Orders', icon: 'ClipboardList' },
        { id: 'Returns & Refunds', icon: 'RotateCcw' },
        { id: 'Branch Management', icon: 'Store' },
        { id: 'Activity Logs', icon: 'Activity' }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (editTenant) {
            // Update existing tenant
            setLoading(true);
            setError('');
            try {
                const res = await adminApi.updateTenant(editTenant.id, {
                    name: formData.tenantName,
                    email: formData.email,
                    phone: formData.phone,
                    settings: {
                        ...(typeof editTenant.settings === 'string' ? JSON.parse(editTenant.settings) : (editTenant.settings || {})),
                        enabled_features: formData.enabledFeatures
                    }
                });
                if (res.success) {
                    onSuccess();
                    onClose();
                } else {
                    setError(res.message || 'Failed to update tenant');
                }
            } catch (err) {
                setError(err.message || 'Failed to update tenant');
            } finally {
                setLoading(false);
            }
            return;
        }

        // Create new tenant
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError('');

        const result = await registerTenant({
            ...formData,
            planId: formData.planId ? parseInt(formData.planId) : undefined,
            paymentProvider: formData.paymentProvider || undefined
        });

        if (result.success) {
            setLoading(false);
            onSuccess();
            onClose();
        } else {
            setError(result.message);
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-slate-900/75 backdrop-blur-sm" onClick={onClose}></div>

                <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full border border-slate-200">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100">
                            <h3 className="text-xl leading-6 font-bold text-slate-900 flex items-center gap-2">
                                <div className="p-2 bg-brand-100 text-brand-600 rounded-lg">
                                    <Building2 className="w-5 h-5" />
                                </div>
                                {editTenant ? 'Update Client Details' : 'Register New Client'}
                            </h3>
                            <button
                                onClick={onClose}
                                className="text-slate-400 hover:text-slate-500 hover:bg-slate-100 p-2 rounded-full transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {error && (
                            <div className="mb-4 bg-rose-50 text-rose-600 p-3 rounded-lg text-sm flex items-center gap-2 border border-rose-100">
                                <X className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        <form id="tenant-form" onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Business / Tenant Name *</label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Building2 className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <input type="text" name="tenantName" required className="input-field pl-10"
                                        placeholder="E.g., Salone Tech Solutions"
                                        value={formData.tenantName} onChange={handleChange} />
                                </div>
                            </div>

                            {!editTenant && (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Admin First Name *</label>
                                        <div className="mt-1 relative rounded-md shadow-sm">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <User className="h-4 w-4 text-slate-400" />
                                            </div>
                                            <input type="text" name="firstName" required className="input-field pl-10"
                                                placeholder="John" value={formData.firstName} onChange={handleChange} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Admin Last Name *</label>
                                        <div className="mt-1 relative rounded-md shadow-sm">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <User className="h-4 w-4 text-slate-400" />
                                            </div>
                                            <input type="text" name="lastName" required className="input-field pl-10"
                                                placeholder="Karimu" value={formData.lastName} onChange={handleChange} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Email Address *</label>
                                    <div className="mt-1 relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Mail className="h-4 w-4 text-slate-400" />
                                        </div>
                                        <input type="email" name="email" required className="input-field pl-10"
                                            placeholder="admin@business.com" value={formData.email} onChange={handleChange}
                                            disabled={!!editTenant} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Phone Number</label>
                                    <div className="mt-1 relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Phone className="h-4 w-4 text-slate-400" />
                                        </div>
                                        <input type="tel" name="phone" className="input-field pl-10"
                                            placeholder="+232 7X YYY YYY" value={formData.phone} onChange={handleChange} />
                                    </div>
                                </div>
                            </div>

                            {/* Subscription Plan & Billing */}
                            <div className="border-t border-slate-100 pt-4 mt-4">
                                <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-brand-500" /> Subscription & Billing
                                </h4>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Subscription Plan</label>
                                        <select name="planId" className="input-field mt-1" value={formData.planId} onChange={handleChange}>
                                            <option value="">Trial (Default)</option>
                                            {plans.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} — LE {Number(p.price_monthly).toLocaleString()}/mo
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Billing Cycle</label>
                                        <select name="billingCycle" className="input-field mt-1" value={formData.billingCycle} onChange={handleChange}>
                                            <option value="MONTHLY">Monthly</option>
                                            <option value="YEARLY">Yearly</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Provider */}
                            {!editTenant && (
                                <div className="border-t border-slate-100 pt-4 mt-2">
                                    <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                        <Wallet className="w-4 h-4 text-brand-500" /> Payment Provider
                                    </h4>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { value: '', label: 'None', color: 'bg-slate-50 border-slate-200 text-slate-600' },
                                            { value: 'ORANGE', label: 'Orange Money', color: 'bg-orange-50 border-orange-300 text-orange-700' },
                                            { value: 'AFRIMONEY', label: 'Afrimoney', color: 'bg-red-50 border-red-300 text-red-700' }
                                        ].map(opt => (
                                            <label key={opt.value}
                                                className={`flex items-center justify-center px-3 py-2.5 rounded-lg border-2 cursor-pointer text-sm font-medium transition-all ${formData.paymentProvider === opt.value
                                                    ? opt.color + ' ring-2 ring-brand-400 ring-offset-1'
                                                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                                    }`}
                                            >
                                                <input type="radio" name="paymentProvider" value={opt.value}
                                                    checked={formData.paymentProvider === opt.value}
                                                    onChange={handleChange} className="sr-only" />
                                                {opt.label}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Feature Toggles */}
                            <div className="border-t border-slate-100 pt-4 mt-2">
                                <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-brand-500" /> Enabled Features
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {FEATURES_LIST.map(feature => (
                                        <label key={feature.id}
                                            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${formData.enabledFeatures.includes(feature.id)
                                                ? 'bg-brand-50 border-brand-200 text-brand-700'
                                                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                                }`}
                                        >
                                            <input type="checkbox" className="sr-only"
                                                checked={formData.enabledFeatures.includes(feature.id)}
                                                onChange={() => handleFeatureToggle(feature.id)} />
                                            <span className={`text-xs font-medium ${formData.enabledFeatures.includes(feature.id) ? 'text-brand-700' : 'text-slate-600'}`}>
                                                {feature.id}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2 italic">Standard features (POS, Products, Sales History, Customers) are enabled by default.</p>
                            </div>

                            {/* Password (only for new tenant) */}
                            {!editTenant && (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-slate-100 pt-4 mt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Password *</label>
                                        <div className="mt-1 relative rounded-md shadow-sm">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Lock className="h-4 w-4 text-slate-400" />
                                            </div>
                                            <input type="password" name="password" required className="input-field pl-10"
                                                placeholder="••••••••" value={formData.password} onChange={handleChange} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Confirm Password *</label>
                                        <div className="mt-1 relative rounded-md shadow-sm">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Lock className="h-4 w-4 text-slate-400" />
                                            </div>
                                            <input type="password" name="confirmPassword" required className="input-field pl-10"
                                                placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                    <div className="bg-slate-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-slate-200">
                        <button type="submit" form="tenant-form" disabled={loading}
                            className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-brand-600 text-base font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-70 transition-colors">
                            {loading ? (editTenant ? 'Updating...' : 'Registering...') : (editTenant ? 'Save Changes' : 'Register Client')}
                        </button>
                        <button type="button" onClick={onClose}
                            className="mt-3 w-full inline-flex justify-center rounded-lg border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TenantFormModal;
