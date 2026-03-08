import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, X, Truck, Package, CheckCircle, XCircle, Eye } from 'lucide-react';
import { purchaseOrderApi, supplierApi, posApi } from '../services/api';

const PurchaseOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showDetail, setShowDetail] = useState(null);
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [form, setForm] = useState({ supplier_id: '', notes: '', items: [{ product_id: '', quantity_ordered: 1, unit_cost: 0 }] });

    useEffect(() => { loadOrders(); }, []);

    const loadOrders = async () => {
        try {
            setLoading(true);
            const res = await purchaseOrderApi.getAll();
            if (res.success) setOrders(res.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const openCreateModal = async () => {
        try {
            const [supRes, prodRes] = await Promise.all([supplierApi.getAll(), posApi.getProducts()]);
            if (supRes.success) setSuppliers(supRes.data);
            if (prodRes.success) setProducts(prodRes.data);
        } catch (e) { console.error(e); }
        setForm({ supplier_id: '', notes: '', items: [{ product_id: '', quantity_ordered: 1, unit_cost: 0 }] });
        setShowModal(true);
    };

    const addItem = () => setForm(prev => ({ ...prev, items: [...prev.items, { product_id: '', quantity_ordered: 1, unit_cost: 0 }] }));
    const removeItem = (idx) => setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
    const updateItem = (idx, field, value) => setForm(prev => ({
        ...prev, items: prev.items.map((it, i) => i === idx ? { ...it, [field]: value } : it)
    }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validItems = form.items.filter(i => i.product_id && i.quantity_ordered > 0);
        if (!form.supplier_id || validItems.length === 0) return alert('Please select a supplier and add items');
        try {
            await purchaseOrderApi.create({ supplier_id: form.supplier_id, notes: form.notes, items: validItems });
            setShowModal(false);
            loadOrders();
        } catch (err) { alert(err.message || 'Failed to create PO'); }
    };

    const handleStatusChange = async (id, status) => {
        const msg = status === 'RECEIVED' ? 'This will add all items to your inventory. Continue?' : `Mark this PO as ${status}?`;
        if (!confirm(msg)) return;
        try {
            await purchaseOrderApi.updateStatus(id, status);
            loadOrders();
            if (showDetail?.id === id) viewDetails(id);
        } catch (err) { alert(err.message || 'Failed to update status'); }
    };

    const viewDetails = async (id) => {
        try {
            const res = await purchaseOrderApi.getDetails(id);
            if (res.success) setShowDetail(res.data);
        } catch (e) { console.error(e); }
    };

    const statusBadge = (status) => {
        const map = {
            DRAFT: 'bg-slate-100 text-slate-600',
            ORDERED: 'bg-blue-100 text-blue-700',
            PARTIAL: 'bg-amber-100 text-amber-700',
            RECEIVED: 'bg-emerald-100 text-emerald-700',
            CANCELLED: 'bg-rose-100 text-rose-700',
        };
        return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${map[status] || 'bg-slate-100'}`}>{status}</span>;
    };

    const fmt = (v) => `LE ${parseFloat(v || 0).toLocaleString()}`;
    const total = form.items.reduce((s, i) => s + (i.quantity_ordered * i.unit_cost), 0);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <ClipboardList className="w-6 h-6 text-brand-600" /> Purchase Orders
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">Create and track purchase orders from suppliers.</p>
                </div>
                <button onClick={openCreateModal} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
                    <Plus className="w-4 h-4" /> New Purchase Order
                </button>
            </div>

            {loading ? (
                <div className="p-12 text-center text-slate-400">Loading...</div>
            ) : orders.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                    <ClipboardList className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-medium">No purchase orders</p>
                    <p className="text-sm">Create your first PO to track incoming stock.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">PO #</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Supplier</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Items</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Total</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {orders.map(o => (
                                    <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 text-sm font-mono font-semibold text-brand-600">{o.po_number}</td>
                                        <td className="px-4 py-3 text-sm text-slate-700">{o.supplier_name}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{o.item_count} item(s)</td>
                                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">{fmt(o.total_amount)}</td>
                                        <td className="px-4 py-3">{statusBadge(o.status)}</td>
                                        <td className="px-4 py-3 text-sm text-slate-500">{new Date(o.created_at).toLocaleDateString()}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => viewDetails(o.id)} title="View Details" className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500">
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {o.status === 'DRAFT' && (
                                                    <button onClick={() => handleStatusChange(o.id, 'ORDERED')} title="Mark as Ordered" className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600">
                                                        <Truck className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {(o.status === 'ORDERED' || o.status === 'PARTIAL') && (
                                                    <button onClick={() => handleStatusChange(o.id, 'RECEIVED')} title="Mark as Received" className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600">
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {o.status === 'DRAFT' && (
                                                    <button onClick={() => handleStatusChange(o.id, 'CANCELLED')} title="Cancel" className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-500">
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {showDetail && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen p-4">
                        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm" onClick={() => setShowDetail(null)} />
                        <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full">
                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="text-lg font-bold">PO: {showDetail.po_number}</h3>
                                <button onClick={() => setShowDetail(null)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Supplier:</span>
                                    <span className="font-medium">{showDetail.supplier_name}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Status:</span>
                                    {statusBadge(showDetail.status)}
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Total:</span>
                                    <span className="font-bold">{fmt(showDetail.total_amount)}</span>
                                </div>
                                {showDetail.notes && <p className="text-xs text-slate-400 italic">{showDetail.notes}</p>}
                                <div className="border-t pt-3">
                                    <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Items</h4>
                                    <div className="space-y-2">
                                        {(showDetail.items || []).map((it, i) => (
                                            <div key={i} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg text-xs">
                                                <div>
                                                    <span className="font-medium text-slate-700">{it.product_name}</span>
                                                    {it.sku && <span className="ml-2 text-slate-400">({it.sku})</span>}
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-slate-600">{it.quantity_received}/{it.quantity_ordered} @ {fmt(it.unit_cost)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create PO Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen p-4">
                        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                        <div className="relative bg-white rounded-2xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                                <h3 className="text-lg font-bold">New Purchase Order</h3>
                                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Supplier *</label>
                                    <select className="input-field" required value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })}>
                                        <option value="">Select supplier</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm font-medium text-slate-700">Items *</label>
                                        <button type="button" onClick={addItem} className="text-xs text-brand-600 font-medium hover:underline">+ Add Item</button>
                                    </div>
                                    <div className="space-y-2">
                                        {form.items.map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                                                <select className="input-field flex-1 text-xs py-1.5" value={item.product_id}
                                                    onChange={e => updateItem(idx, 'product_id', e.target.value)}>
                                                    <option value="">Product</option>
                                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                                <input type="number" min="1" placeholder="Qty" className="input-field w-16 text-xs py-1.5"
                                                    value={item.quantity_ordered} onChange={e => updateItem(idx, 'quantity_ordered', parseInt(e.target.value) || 1)} />
                                                <input type="number" min="0" step="0.01" placeholder="Cost" className="input-field w-20 text-xs py-1.5"
                                                    value={item.unit_cost} onChange={e => updateItem(idx, 'unit_cost', parseFloat(e.target.value) || 0)} />
                                                {form.items.length > 1 && (
                                                    <button type="button" onClick={() => removeItem(idx)} className="p-1 text-rose-400 hover:text-rose-600"><X className="w-4 h-4" /></button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                                    <textarea className="input-field resize-none" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                                </div>

                                <div className="bg-slate-50 rounded-lg p-3 text-sm font-semibold text-slate-900">
                                    Order Total: {fmt(total)}
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                    <button type="button" onClick={() => setShowModal(false)} className="btn-secondary px-4">Cancel</button>
                                    <button type="submit" className="btn-primary px-6">Create PO</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseOrders;
