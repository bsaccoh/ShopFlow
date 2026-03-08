import React, { useState, useEffect } from 'react';
import { Banknote, Plus, Trash2, X, Download, Filter } from 'lucide-react';
import { expenseApi } from '../services/api';

const CATEGORIES = [
    { value: 'RENT', label: 'Rent', color: 'bg-blue-100 text-blue-700' },
    { value: 'UTILITIES', label: 'Utilities', color: 'bg-cyan-100 text-cyan-700' },
    { value: 'SALARIES', label: 'Salaries', color: 'bg-purple-100 text-purple-700' },
    { value: 'SUPPLIES', label: 'Supplies', color: 'bg-amber-100 text-amber-700' },
    { value: 'TRANSPORT', label: 'Transport', color: 'bg-emerald-100 text-emerald-700' },
    { value: 'MARKETING', label: 'Marketing', color: 'bg-pink-100 text-pink-700' },
    { value: 'MAINTENANCE', label: 'Maintenance', color: 'bg-orange-100 text-orange-700' },
    { value: 'TAXES', label: 'Taxes', color: 'bg-rose-100 text-rose-700' },
    { value: 'OTHER', label: 'Other', color: 'bg-slate-100 text-slate-700' },
];

const Expenses = () => {
    const [data, setData] = useState({ expenses: [], summary: { total: 0, byCategory: [] } });
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [filters, setFilters] = useState({ start_date: '', end_date: '', category: '' });
    const [form, setForm] = useState({ category: 'OTHER', description: '', amount: '', expense_date: new Date().toISOString().split('T')[0], payment_method: 'CASH', reference: '' });

    useEffect(() => { loadExpenses(); }, []);

    const loadExpenses = async (f) => {
        try {
            setLoading(true);
            const params = f || filters;
            const res = await expenseApi.getAll(params);
            if (res.success) setData(res.data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleFilter = () => loadExpenses(filters);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await expenseApi.create({ ...form, amount: parseFloat(form.amount) });
            setShowModal(false);
            setForm({ category: 'OTHER', description: '', amount: '', expense_date: new Date().toISOString().split('T')[0], payment_method: 'CASH', reference: '' });
            loadExpenses();
        } catch (err) { alert(err.message || 'Failed to record expense'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this expense?')) return;
        try { await expenseApi.delete(id); loadExpenses(); }
        catch (err) { alert(err.message || 'Failed to delete'); }
    };

    const exportCSV = () => {
        const rows = [['Date', 'Category', 'Description', 'Amount', 'Payment Method', 'Reference']];
        data.expenses.forEach(e => rows.push([e.expense_date, e.category, e.description, e.amount, e.payment_method, e.reference || '']));
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `expenses_${Date.now()}.csv`; a.click();
    };

    const getCatColor = (cat) => CATEGORIES.find(c => c.value === cat)?.color || 'bg-slate-100 text-slate-700';
    const fmt = (v) => `LE ${parseFloat(v || 0).toLocaleString()}`;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Banknote className="w-6 h-6 text-brand-600" /> Expense Tracking
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">Track and manage business expenses.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 px-3 py-2 text-sm">
                        <Download className="w-4 h-4" /> Export
                    </button>
                    <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
                        <Plus className="w-4 h-4" /> Record Expense
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card-modern p-5">
                    <p className="text-sm text-slate-500">Total Expenses</p>
                    <p className="text-2xl font-bold text-slate-900">{fmt(data.summary.total)}</p>
                </div>
                {data.summary.byCategory?.slice(0, 3).map((c, i) => (
                    <div key={i} className="card-modern p-5">
                        <p className="text-sm text-slate-500">{c.category}</p>
                        <p className="text-xl font-bold text-slate-900">{fmt(c.cat_total)}</p>
                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${getCatColor(c.category)}`}>{c.count} entries</span>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-end gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
                    <input type="date" className="input-field text-sm py-1.5" value={filters.start_date} onChange={e => setFilters({ ...filters, start_date: e.target.value })} />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
                    <input type="date" className="input-field text-sm py-1.5" value={filters.end_date} onChange={e => setFilters({ ...filters, end_date: e.target.value })} />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
                    <select className="input-field text-sm py-1.5" value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })}>
                        <option value="">All</option>
                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                </div>
                <button onClick={handleFilter} className="btn-primary px-4 py-1.5 text-sm flex items-center gap-1">
                    <Filter className="w-3 h-3" /> Filter
                </button>
            </div>

            {/* Table */}
            {loading ? (
                <div className="p-12 text-center text-slate-400">Loading...</div>
            ) : data.expenses.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                    <Banknote className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-medium">No expenses recorded</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Category</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Description</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Amount</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Payment</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Recorded By</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.expenses.map(e => (
                                    <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 text-sm text-slate-600">{new Date(e.expense_date).toLocaleDateString()}</td>
                                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getCatColor(e.category)}`}>{e.category}</span></td>
                                        <td className="px-4 py-3 text-sm text-slate-700 max-w-[250px] truncate">{e.description}</td>
                                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">{fmt(e.amount)}</td>
                                        <td className="px-4 py-3 text-xs text-slate-500">{e.payment_method?.replace('_', ' ')}</td>
                                        <td className="px-4 py-3 text-xs text-slate-500">{e.recorded_by_name || '—'}</td>
                                        <td className="px-4 py-3">
                                            <button onClick={() => handleDelete(e.id)} className="p-1.5 hover:bg-rose-50 rounded-lg">
                                                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add Expense Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen p-4">
                        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                        <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full">
                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="text-lg font-bold">Record Expense</h3>
                                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                                        <select className="input-field" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
                                        <input type="number" step="0.01" className="input-field" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                                    <input type="text" className="input-field" required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Monthly rent payment" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                                        <input type="date" className="input-field" required value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                                        <select className="input-field" value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>
                                            <option value="CASH">Cash</option>
                                            <option value="BANK_TRANSFER">Bank Transfer</option>
                                            <option value="MOBILE_MONEY">Mobile Money</option>
                                            <option value="OTHER">Other</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Reference #</label>
                                    <input type="text" className="input-field" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="Optional receipt/invoice number" />
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                    <button type="button" onClick={() => setShowModal(false)} className="btn-secondary px-4">Cancel</button>
                                    <button type="submit" className="btn-primary px-6">Record Expense</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Expenses;
