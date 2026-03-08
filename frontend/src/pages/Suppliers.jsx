import React, { useState, useEffect } from 'react';
import { Truck, Plus, Pencil, Trash2, X, Search, Phone, Mail, MapPin } from 'lucide-react';
import { supplierApi } from '../services/api';

const Suppliers = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState({ name: '', contact_person: '', email: '', phone: '', address: '', notes: '' });

    useEffect(() => { loadSuppliers(); }, []);

    const loadSuppliers = async () => {
        try {
            setLoading(true);
            const res = await supplierApi.getAll(search);
            if (res.success) setSuppliers(res.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editing) {
                await supplierApi.update(editing.id, form);
            } else {
                await supplierApi.create(form);
            }
            setShowModal(false);
            setEditing(null);
            setForm({ name: '', contact_person: '', email: '', phone: '', address: '', notes: '' });
            loadSuppliers();
        } catch (err) { alert(err.message || 'Failed to save supplier'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this supplier?')) return;
        try {
            await supplierApi.delete(id);
            loadSuppliers();
        } catch (err) { alert(err.message || 'Cannot delete supplier'); }
    };

    const openEdit = (s) => {
        setEditing(s);
        setForm({ name: s.name, contact_person: s.contact_person || '', email: s.email || '', phone: s.phone || '', address: s.address || '', notes: s.notes || '' });
        setShowModal(true);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Truck className="w-6 h-6 text-brand-600" /> Suppliers
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">Manage your product suppliers and vendor contacts.</p>
                </div>
                <button onClick={() => { setEditing(null); setForm({ name: '', contact_person: '', email: '', phone: '', address: '', notes: '' }); setShowModal(true); }}
                    className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
                    <Plus className="w-4 h-4" /> Add Supplier
                </button>
            </div>

            <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Search suppliers..." className="input-field pl-10" value={search}
                    onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadSuppliers()} />
            </div>

            {loading ? (
                <div className="p-12 text-center text-slate-400">Loading...</div>
            ) : suppliers.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                    <Truck className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-medium">No suppliers yet</p>
                    <p className="text-sm">Add your first supplier to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {suppliers.map(s => (
                        <div key={s.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold text-slate-900">{s.name}</h3>
                                    {s.contact_person && <p className="text-sm text-slate-500">{s.contact_person}</p>}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => openEdit(s)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                                        <Pencil className="w-3.5 h-3.5 text-slate-400" />
                                    </button>
                                    <button onClick={() => handleDelete(s.id)} className="p-1.5 hover:bg-rose-50 rounded-lg">
                                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1.5 text-xs text-slate-500">
                                {s.phone && <div className="flex items-center gap-2"><Phone className="w-3 h-3" />{s.phone}</div>}
                                {s.email && <div className="flex items-center gap-2"><Mail className="w-3 h-3" />{s.email}</div>}
                                {s.address && <div className="flex items-center gap-2"><MapPin className="w-3 h-3" /><span className="truncate">{s.address}</span></div>}
                            </div>
                            {s.notes && <p className="mt-3 text-xs text-slate-400 line-clamp-2 italic">{s.notes}</p>}
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen p-4">
                        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                        <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full">
                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="text-lg font-bold">{editing ? 'Edit Supplier' : 'Add Supplier'}</h3>
                                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Supplier Name *</label>
                                    <input type="text" className="input-field" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                                        <input type="text" className="input-field" value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                                        <input type="tel" className="input-field" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                    <input type="email" className="input-field" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                                    <textarea className="input-field resize-none" rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                                    <textarea className="input-field resize-none" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
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

export default Suppliers;
