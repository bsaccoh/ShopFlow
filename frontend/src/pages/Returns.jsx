import React, { useState, useEffect } from 'react';
import { RotateCcw, Plus, X, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { returnApi, posApi } from '../services/api';

const Returns = () => {
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ sale_id: '', reason: '', refund_method: 'CASH', items: [] });
    const [saleDetails, setSaleDetails] = useState(null);
    const [lookingUpSale, setLookingUpSale] = useState(false);

    useEffect(() => { loadReturns(); }, []);

    const loadReturns = async () => {
        try {
            setLoading(true);
            const res = await returnApi.getAll();
            if (res.success) setReturns(res.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const lookupSale = async () => {
        if (!form.sale_id) return;
        try {
            setLookingUpSale(true);
            const res = await posApi.getSaleDetails(form.sale_id);
            if (res.success) {
                setSaleDetails(res.data);
                setForm(prev => ({
                    ...prev,
                    items: (res.data.items || []).map(i => ({
                        product_id: i.product_id,
                        product_name: i.product_name || i.name,
                        quantity: 0,
                        max_qty: i.quantity,
                        unit_price: i.unit_price
                    }))
                }));
            }
        } catch (err) {
            alert('Sale not found');
            setSaleDetails(null);
        } finally { setLookingUpSale(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const returnItems = form.items.filter(i => i.quantity > 0);
        if (returnItems.length === 0) return alert('Select at least one item to return');
        try {
            await returnApi.create({
                sale_id: form.sale_id,
                reason: form.reason,
                refund_method: form.refund_method,
                items: returnItems.map(i => ({ product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price }))
            });
            setShowModal(false);
            setSaleDetails(null);
            setForm({ sale_id: '', reason: '', refund_method: 'CASH', items: [] });
            loadReturns();
        } catch (err) { alert(err.message || 'Failed to create return'); }
    };

    const handleProcess = async (id, status) => {
        if (!confirm(`Are you sure you want to ${status.toLowerCase()} this return?`)) return;
        try {
            await returnApi.process(id, status);
            loadReturns();
        } catch (err) { alert(err.message || 'Failed to process return'); }
    };

    const statusBadge = (status) => {
        const map = {
            PENDING: 'bg-amber-100 text-amber-700',
            APPROVED: 'bg-emerald-100 text-emerald-700',
            REJECTED: 'bg-rose-100 text-rose-700',
            REFUNDED: 'bg-blue-100 text-blue-700',
        };
        return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${map[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>;
    };

    const fmt = (v) => `LE ${parseFloat(v || 0).toLocaleString()}`;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <RotateCcw className="w-6 h-6 text-brand-600" /> Returns & Refunds
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">Process customer returns and manage refunds.</p>
                </div>
                <button onClick={() => { setShowModal(true); setSaleDetails(null); setForm({ sale_id: '', reason: '', refund_method: 'CASH', items: [] }); }}
                    className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
                    <Plus className="w-4 h-4" /> New Return
                </button>
            </div>

            {loading ? (
                <div className="p-12 text-center text-slate-400">Loading...</div>
            ) : returns.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                    <RotateCcw className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-medium">No returns yet</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Return #</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Sale #</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Customer</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Reason</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Refund</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {returns.map(r => (
                                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 text-sm font-mono font-semibold text-brand-600">{r.return_number}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{r.sale_number || `#${r.sale_id}`}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{r.customer_name || '—'}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600 max-w-[200px] truncate">{r.reason}</td>
                                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">{fmt(r.refund_amount)}</td>
                                        <td className="px-4 py-3">{statusBadge(r.status)}</td>
                                        <td className="px-4 py-3 text-sm text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td>
                                        <td className="px-4 py-3">
                                            {r.status === 'PENDING' && (
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => handleProcess(r.id, 'APPROVED')} title="Approve"
                                                        className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600">
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleProcess(r.id, 'REJECTED')} title="Reject"
                                                        className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-500">
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* New Return Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen p-4">
                        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                        <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full">
                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="text-lg font-bold">New Return</h3>
                                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Sale ID *</label>
                                    <div className="flex gap-2">
                                        <input type="text" className="input-field flex-1" placeholder="Enter sale ID"
                                            value={form.sale_id} onChange={e => setForm({ ...form, sale_id: e.target.value })} />
                                        <button type="button" onClick={lookupSale} disabled={lookingUpSale}
                                            className="btn-secondary px-4 text-sm">{lookingUpSale ? '...' : 'Lookup'}</button>
                                    </div>
                                </div>

                                {saleDetails && (
                                    <>
                                        <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600">
                                            <p><strong>Sale:</strong> {saleDetails.sale_number} | <strong>Total:</strong> {fmt(saleDetails.total_amount)}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Items to Return</label>
                                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                                {form.items.map((item, idx) => (
                                                    <div key={idx} className="flex items-center justify-between bg-slate-50 rounded-lg p-2 text-xs">
                                                        <span className="font-medium text-slate-700 truncate max-w-[150px]">{item.product_name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-slate-400">max: {item.max_qty}</span>
                                                            <input type="number" min="0" max={item.max_qty} className="input-field w-16 text-xs py-1"
                                                                value={item.quantity}
                                                                onChange={e => {
                                                                    const v = Math.min(parseInt(e.target.value) || 0, item.max_qty);
                                                                    setForm(prev => ({ ...prev, items: prev.items.map((it, i) => i === idx ? { ...it, quantity: v } : it) }));
                                                                }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Reason *</label>
                                    <textarea className="input-field resize-none" rows={2} required
                                        value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Refund Method</label>
                                    <select className="input-field" value={form.refund_method} onChange={e => setForm({ ...form, refund_method: e.target.value })}>
                                        <option value="CASH">Cash</option>
                                        <option value="ORIGINAL_METHOD">Original Payment Method</option>
                                        <option value="STORE_CREDIT">Store Credit</option>
                                    </select>
                                </div>

                                {form.items.some(i => i.quantity > 0) && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                                        <p className="font-semibold text-amber-800">Refund Total: {fmt(form.items.reduce((s, i) => s + (i.quantity * i.unit_price), 0))}</p>
                                    </div>
                                )}

                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                    <button type="button" onClick={() => setShowModal(false)} className="btn-secondary px-4">Cancel</button>
                                    <button type="submit" className="btn-primary px-6" disabled={!saleDetails}>Create Return</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Returns;
