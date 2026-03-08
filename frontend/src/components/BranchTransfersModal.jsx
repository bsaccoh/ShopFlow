import React, { useState, useEffect } from 'react';
import { inventoryApi, branchApi } from '../services/api';
import { X, Plus, Trash2 } from 'lucide-react';

const BranchTransfersModal = ({ isOpen, onClose, onRefresh }) => {
    const [branches, setBranches] = useState([]);
    const [products, setProducts] = useState([]);

    const [formData, setFormData] = useState({
        from_branch: '',
        to_branch: ''
    });

    const [items, setItems] = useState([{ product_id: '', quantity: 1, maxQty: 0 }]);

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
            setFormData({ from_branch: '', to_branch: '' });
            setItems([{ product_id: '', quantity: 1, maxQty: 0 }]);
            setError('');
        }
    }, [isOpen]);

    const fetchInitialData = async () => {
        setFetching(true);
        try {
            const [bRes, pRes] = await Promise.all([
                branchApi.getAll(),
                inventoryApi.getLevels({}) // Get all products with stock info
            ]);
            if (bRes.success) setBranches(bRes.data);
            if (pRes.success) setProducts(pRes.data);
        } catch (err) {
            setError('Failed to load branches and products');
        } finally {
            setFetching(false);
        }
    };

    const handleFormChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;

        // If product changed, update maxQty based on selected from_branch (we approximate here by total stock or require strict checking)
        // For accurate UI, we should fetch stock per branch, but for now we just show total stock as guide. The backend strictly validates it.
        if (field === 'product_id') {
            const p = products.find(p => String(p.product_id) === String(value));
            newItems[index].maxQty = p ? p.quantity : 0;
            if (newItems[index].quantity > newItems[index].maxQty) {
                newItems[index].quantity = newItems[index].maxQty || 1;
            }
        }

        setItems(newItems);
    };

    const addItem = () => setItems([...items, { product_id: '', quantity: 1, maxQty: 0 }]);
    const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.from_branch === formData.to_branch) {
            return setError('Source and destination branches must be different');
        }

        const validItems = items.filter(i => i.product_id && i.quantity > 0);
        if (validItems.length === 0) {
            return setError('Please add at least one valid item to transfer');
        }

        setLoading(true);
        try {
            const payload = {
                from_branch: formData.from_branch,
                to_branch: formData.to_branch,
                items: validItems.map(i => ({ product_id: i.product_id, quantity: parseInt(i.quantity) }))
            };

            const res = await branchApi.createTransfer(payload);
            if (res.success) {
                onRefresh();
                onClose();
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to create transfer');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between shadow-sm z-10">
                    <h2 className="text-xl font-bold text-slate-800">Process Stock Transfer</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                    {fetching ? (
                        <div className="flex justify-center py-8 text-slate-500">Loading data...</div>
                    ) : (
                        <>
                            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}

                            <form id="transferForm" onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">From Branch *</label>
                                        <select name="from_branch" required value={formData.from_branch} onChange={handleFormChange} className="input-field bg-white">
                                            <option value="">-- Select Source --</option>
                                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}{b.is_main ? ' (Main)' : ''}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">To Branch *</label>
                                        <select name="to_branch" required value={formData.to_branch} onChange={handleFormChange} className="input-field bg-white">
                                            <option value="">-- Select Destination --</option>
                                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}{b.is_main ? ' (Main)' : ''}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-semibold text-slate-800">Items to Transfer</h3>
                                        <button type="button" onClick={addItem} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                                            <Plus className="w-4 h-4" /> Add Item
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {items.map((item, index) => (
                                            <div key={index} className="flex gap-3 items-end p-3 border border-slate-100 rounded-lg bg-slate-50">
                                                <div className="flex-1">
                                                    <label className="block text-xs font-medium text-slate-500 mb-1">Product</label>
                                                    <select required value={item.product_id} onChange={(e) => handleItemChange(index, 'product_id', e.target.value)} className="input-field bg-white">
                                                        <option value="">-- Select --</option>
                                                        {products.map(p => (
                                                            <option key={p.product_id} value={p.product_id}>{p.product_name} (Total Stock: {p.quantity || 0})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="w-32">
                                                    <label className="block text-xs font-medium text-slate-500 mb-1">Quantity</label>
                                                    <input type="number" min="1" required value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} className="input-field bg-white" />
                                                </div>
                                                <button type="button" onClick={() => removeItem(index)} disabled={items.length === 1} className="p-2.5 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors disabled:opacity-50">
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">Note: Stock availability is strictly checked by the system during transfer.</p>
                                </div>
                            </form>
                        </>
                    )}
                </div>

                <div className="p-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50 shrink-0">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
                        Cancel
                    </button>
                    <button type="submit" form="transferForm" disabled={loading || fetching} className="btn-primary px-6 py-2 text-sm flex items-center gap-2">
                        {loading ? 'Processing...' : 'Submit Transfer'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BranchTransfersModal;
