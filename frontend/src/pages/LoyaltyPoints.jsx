import React, { useState, useEffect } from 'react';
import { Gift, Search, Plus, X, ArrowUp, ArrowDown, RefreshCw, Award, History, Star, Minus } from 'lucide-react';
import { loyaltyApi } from '../services/api';

const LoyaltyPoints = () => {
    const [customers, setCustomers] = useState([]);
    const [totalPoints, setTotalPoints] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerHistory, setCustomerHistory] = useState([]);
    const [customerBalance, setCustomerBalance] = useState(0);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({ type: 'EARNED', points: '', description: '' });
    const [addTarget, setAddTarget] = useState(null);

    useEffect(() => { loadSummary(); }, []);

    const loadSummary = async () => {
        try {
            setLoading(true);
            const res = await loyaltyApi.getSummary();
            if (res.success) {
                setCustomers(res.data.customers || []);
                setTotalPoints(res.data.totalPoints || 0);
            }
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const loadCustomerHistory = async (customer) => {
        try {
            setLoadingHistory(true);
            setSelectedCustomer(customer);
            const res = await loyaltyApi.getCustomerHistory(customer.id);
            if (res.success) {
                setCustomerHistory(res.data.records || []);
                setCustomerBalance(res.data.balance || 0);
            }
        } catch (err) { console.error(err); } finally { setLoadingHistory(false); }
    };

    const handleAddTransaction = async (e) => {
        e.preventDefault();
        if (!addTarget || !addForm.points) return;
        try {
            const res = await loyaltyApi.addTransaction(addTarget.id, {
                type: addForm.type,
                points: parseInt(addForm.points),
                description: addForm.description
            });
            if (res.success) {
                setShowAddModal(false);
                setAddForm({ type: 'EARNED', points: '', description: '' });
                loadSummary();
                if (selectedCustomer?.id === addTarget.id) loadCustomerHistory(addTarget);
            }
        } catch (err) {
            alert(err.message || 'Failed to add transaction');
        }
    };

    const openAdd = (customer, type = 'EARNED') => {
        setAddTarget(customer);
        setAddForm({ type, points: '', description: '' });
        setShowAddModal(true);
    };

    const filtered = customers.filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search)
    );

    const getTypeIcon = (type) => {
        switch (type) {
            case 'EARNED': return <ArrowUp className="w-4 h-4 text-emerald-500" />;
            case 'REDEEMED': return <ArrowDown className="w-4 h-4 text-rose-500" />;
            case 'ADJUSTED': return <RefreshCw className="w-4 h-4 text-amber-500" />;
            case 'EXPIRED': return <Minus className="w-4 h-4 text-slate-400" />;
            default: return null;
        }
    };

    const getTypeBadge = (type) => {
        const styles = {
            EARNED: 'bg-emerald-100 text-emerald-700',
            REDEEMED: 'bg-rose-100 text-rose-700',
            ADJUSTED: 'bg-amber-100 text-amber-700',
            EXPIRED: 'bg-slate-100 text-slate-500'
        };
        return `inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${styles[type] || 'bg-slate-100 text-slate-500'}`;
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl text-white shadow-lg shadow-amber-200/50">
                            <Gift className="w-6 h-6" />
                        </div>
                        Loyalty Points
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">Manage customer reward points and redemptions.</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card-modern p-5 relative group overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Award className="w-14 h-14 text-brand-600" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">Total Active Points</p>
                    <p className="text-3xl font-black text-slate-900 mt-1">{totalPoints.toLocaleString()}</p>
                </div>
                <div className="card-modern p-5 relative group overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Star className="w-14 h-14 text-amber-500" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">Members with Points</p>
                    <p className="text-3xl font-black text-slate-900 mt-1">{customers.filter(c => parseInt(c.balance) > 0).length}</p>
                </div>
                <div className="card-modern p-5 relative group overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Gift className="w-14 h-14 text-emerald-500" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">Total Customers</p>
                    <p className="text-3xl font-black text-slate-900 mt-1">{customers.length}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Customer List */}
                <div className="lg:col-span-2 card-modern overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text" className="input-field pl-10 h-10 text-sm"
                                placeholder="Search customers by name, email, phone..."
                                value={search} onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-100">
                                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Customer</th>
                                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Earned</th>
                                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Redeemed</th>
                                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Balance</th>
                                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={5} className="text-center py-12 text-slate-400">Loading...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center py-12 text-slate-400">
                                        <Gift className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                                        <p className="text-sm font-medium">{search ? 'No matching customers' : 'No customers found'}</p>
                                    </td></tr>
                                ) : filtered.map(c => (
                                    <tr key={c.id}
                                        className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer ${selectedCustomer?.id === c.id ? 'bg-brand-50/50' : ''}`}
                                        onClick={() => loadCustomerHistory(c)}
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                                                    {c.name?.[0]?.toUpperCase() || '?'}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">{c.name}</p>
                                                    <p className="text-xs text-slate-400">{c.phone || c.email || 'No contact'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-center px-4 py-3">
                                            <span className="text-emerald-600 font-semibold">{parseInt(c.total_earned || 0).toLocaleString()}</span>
                                        </td>
                                        <td className="text-center px-4 py-3">
                                            <span className="text-rose-500 font-semibold">{parseInt(c.total_redeemed || 0).toLocaleString()}</span>
                                        </td>
                                        <td className="text-center px-4 py-3">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${parseInt(c.balance) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {parseInt(c.balance || 0).toLocaleString()} pts
                                            </span>
                                        </td>
                                        <td className="text-center px-4 py-3">
                                            <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => openAdd(c, 'EARNED')} className="p-1.5 hover:bg-emerald-50 rounded-lg transition-colors" title="Earn Points">
                                                    <Plus className="w-3.5 h-3.5 text-emerald-500" />
                                                </button>
                                                <button onClick={() => openAdd(c, 'REDEEMED')} className="p-1.5 hover:bg-rose-50 rounded-lg transition-colors" title="Redeem Points">
                                                    <ArrowDown className="w-3.5 h-3.5 text-rose-500" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Customer History Panel */}
                <div className="card-modern overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <History className="w-4 h-4 text-amber-500" />
                            Transaction History
                        </h3>
                        {selectedCustomer && (
                            <div className="mt-2 flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-bold text-xs">
                                    {selectedCustomer.name?.[0]?.toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900">{selectedCustomer.name}</p>
                                    <p className="text-xs text-slate-500">Balance: <span className="font-bold text-emerald-600">{customerBalance.toLocaleString()} pts</span></p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 max-h-[500px] overflow-y-auto">
                        {!selectedCustomer ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                <Gift className="w-10 h-10 mb-2 text-slate-300" />
                                <p className="text-sm font-medium">Select a customer</p>
                                <p className="text-xs">Click a row to view their history</p>
                            </div>
                        ) : loadingHistory ? (
                            <p className="text-sm text-slate-400 text-center py-8">Loading...</p>
                        ) : customerHistory.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                <History className="w-10 h-10 mb-2 text-slate-300" />
                                <p className="text-sm font-medium">No transactions yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {customerHistory.map(r => (
                                    <div key={r.id} className="flex items-start gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-white transition-colors">
                                        <div className="mt-0.5">{getTypeIcon(r.type)}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={getTypeBadge(r.type)}>{r.type}</span>
                                                <span className="text-sm font-bold text-slate-900">
                                                    {(r.type === 'EARNED' || r.type === 'ADJUSTED') ? '+' : '-'}{parseInt(r.points).toLocaleString()}
                                                </span>
                                            </div>
                                            {r.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.description}</p>}
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <span className="text-[10px] text-slate-400">{new Date(r.created_at).toLocaleString()}</span>
                                                {r.sale_number && <span className="text-[10px] text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">#{r.sale_number}</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Transaction Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen p-4">
                        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
                        <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full">
                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Gift className="w-5 h-5 text-amber-500" />
                                    {addForm.type === 'EARNED' ? 'Earn Points' : addForm.type === 'REDEEMED' ? 'Redeem Points' : 'Adjust Points'}
                                </h3>
                                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                            <form onSubmit={handleAddTransaction} className="p-6 space-y-4">
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-bold text-sm">
                                        {addTarget?.name?.[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">{addTarget?.name}</p>
                                        <p className="text-xs text-slate-500">{addTarget?.phone || addTarget?.email}</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Transaction Type *</label>
                                    <select className="input-field" value={addForm.type}
                                        onChange={e => setAddForm({ ...addForm, type: e.target.value })}>
                                        <option value="EARNED">🟢 Earn Points</option>
                                        <option value="REDEEMED">🔴 Redeem Points</option>
                                        <option value="ADJUSTED">🟡 Adjustment</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Points *</label>
                                    <input type="number" min="1" className="input-field" required
                                        value={addForm.points} onChange={e => setAddForm({ ...addForm, points: e.target.value })}
                                        placeholder="e.g. 100" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                    <input type="text" className="input-field"
                                        value={addForm.description} onChange={e => setAddForm({ ...addForm, description: e.target.value })}
                                        placeholder="e.g. Purchase reward, Birthday bonus..." />
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                    <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary px-4">Cancel</button>
                                    <button type="submit" className="btn-primary px-6">
                                        {addForm.type === 'EARNED' ? 'Award Points' : addForm.type === 'REDEEMED' ? 'Redeem Points' : 'Apply Adjustment'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoyaltyPoints;
