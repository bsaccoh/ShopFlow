import React, { useState, useEffect } from 'react';
import { Tag, Plus, Pencil, Trash2, X, Copy, ToggleLeft, ToggleRight } from 'lucide-react';
import { discountApi } from '../services/api';

const Discounts = () => {
    const [discounts, setDiscounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({
        name: '', code: '', type: 'PERCENTAGE', value: '', min_order_amount: '',
        max_uses: '', start_date: '', end_date: '', is_active: 1
    });

    useEffect(() => { loadDiscounts(); }, []);

    const loadDiscounts = async () => {
        try {
            setLoading(true);
            const res = await discountApi.getAll();
            if (res.success) setDiscounts(res.data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = { ...form, value: parseFloat(form.value), min_order_amount: parseFloat(form.min_order_amount) || 0, max_uses: form.max_uses ? parseInt(form.max_uses) : null };
            if (editing) await discountApi.update(editing.id, data);
            else await discountApi.create(data);
            setShowModal(false);
            setEditing(null);
            loadDiscounts();
        } catch (err) { alert(err.message || 'Failed to save discount'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this discount?')) return;
        try { await discountApi.delete(id); loadDiscounts(); }
        catch (err) { alert(err.message || 'Failed to delete'); }
    };

    const toggleActive = async (d) => {
        try {
            await discountApi.update(d.id, { ...d, is_active: d.is_active ? 0 : 1 });
            loadDiscounts();
        } catch (err) { console.error(err); }
    };

    const openEdit = (d) => {
        setEditing(d);
        setForm({
            name: d.name, code: d.code || '', type: d.type, value: d.value,
            min_order_amount: d.min_order_amount || '', max_uses: d.max_uses || '',
            start_date: d.start_date ? d.start_date.split('T')[0] : '',
            end_date: d.end_date ? d.end_date.split('T')[0] : '', is_active: d.is_active ? 1 : 0
        });
        setShowModal(true);
    };

    const generateCode = () => {
        const code = 'DISC-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        setForm(prev => ({ ...prev, code }));
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Tag className="w-6 h-6 text-brand-600" /> Discounts & Coupons
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">Create and manage promotional discounts and coupon codes.</p>
                </div>
                <button onClick={() => { setEditing(null); setForm({ name: '', code: '', type: 'PERCENTAGE', value: '', min_order_amount: '', max_uses: '', start_date: '', end_date: '', is_active: 1 }); setShowModal(true); }}
                    className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
                    <Plus className="w-4 h-4" /> Create Discount
                </button>
            </div>

            {loading ? (
                <div className="p-12 text-center text-slate-400">Loading...</div>
            ) : discounts.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                    <Tag className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-medium">No discounts yet</p>
                    <p className="text-sm">Create your first discount or coupon code.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {discounts.map(d => (
                        <div key={d.id} className={`bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition-shadow ${d.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}>
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold text-slate-900">{d.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-lg font-bold ${d.type === 'PERCENTAGE' ? 'text-emerald-600' : 'text-blue-600'}`}>
                                            {d.type === 'PERCENTAGE' ? `${d.value}%` : `LE ${parseFloat(d.value).toLocaleString()}`}
                                        </span>
                                        <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{d.type}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => toggleActive(d)} className="p-1.5 hover:bg-slate-100 rounded-lg" title={d.is_active ? 'Deactivate' : 'Activate'}>
                                        {d.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-slate-300" />}
                                    </button>
                                    <button onClick={() => openEdit(d)} className="p-1.5 hover:bg-slate-100 rounded-lg"><Pencil className="w-3.5 h-3.5 text-slate-400" /></button>
                                    <button onClick={() => handleDelete(d.id)} className="p-1.5 hover:bg-rose-50 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-rose-400" /></button>
                                </div>
                            </div>
                            <div className="space-y-1 text-xs text-slate-500">
                                {d.code && (
                                    <div className="flex items-center gap-1">
                                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-brand-600 font-bold">{d.code}</span>
                                    </div>
                                )}
                                {d.min_order_amount > 0 && <p>Min order: LE {parseFloat(d.min_order_amount).toLocaleString()}</p>}
                                {d.max_uses && <p>Uses: {d.used_count}/{d.max_uses}</p>}
                                {(d.start_date || d.end_date) && (
                                    <p>{d.start_date ? new Date(d.start_date).toLocaleDateString() : '—'} → {d.end_date ? new Date(d.end_date).toLocaleDateString() : '—'}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen p-4">
                        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                        <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full">
                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="text-lg font-bold">{editing ? 'Edit Discount' : 'Create Discount'}</h3>
                                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                                    <input type="text" className="input-field" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Weekend Sale 10%" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
                                        <select className="input-field" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                            <option value="PERCENTAGE">Percentage (%)</option>
                                            <option value="FIXED">Fixed Amount (Le)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Value *</label>
                                        <input type="number" step="0.01" className="input-field" required value={form.value} onChange={e => setForm({ ...form, value: e.target.value })}
                                            placeholder={form.type === 'PERCENTAGE' ? 'e.g. 10' : 'e.g. 5000'} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Coupon Code</label>
                                    <div className="flex gap-2">
                                        <input type="text" className="input-field flex-1 font-mono uppercase" value={form.code}
                                            onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. SAVE10" />
                                        <button type="button" onClick={generateCode} className="btn-secondary px-3 text-xs flex items-center gap-1">
                                            <Copy className="w-3 h-3" /> Generate
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">Leave empty for auto-applied discounts</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Min Order Amount</label>
                                        <input type="number" step="0.01" className="input-field" value={form.min_order_amount} onChange={e => setForm({ ...form, min_order_amount: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Max Uses</label>
                                        <input type="number" className="input-field" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })} placeholder="Unlimited" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                                        <input type="date" className="input-field" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                                        <input type="date" className="input-field" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                                    </div>
                                </div>
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

export default Discounts;
