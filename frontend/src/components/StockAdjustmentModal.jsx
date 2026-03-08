import React, { useState, useEffect } from 'react';
import { inventoryApi } from '../services/api';
import { X } from 'lucide-react';

const StockAdjustmentModal = ({ isOpen, onClose, onRefresh, products, preselectedProduct, preselectedType }) => {
    const [formData, setFormData] = useState({
        product_id: '',
        adjustment_type: 'ADD',
        quantity: '',
        reason: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setFormData({
                product_id: preselectedProduct?.product_id || '',
                adjustment_type: preselectedType || 'ADD',
                quantity: '',
                reason: ''
            });
            setError('');
        }
    }, [isOpen, preselectedProduct, preselectedType]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const selectedProduct = products.find(p => String(p.product_id) === String(formData.product_id));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const dataToSubmit = {
                ...formData,
                quantity: parseInt(formData.quantity)
            };

            const res = await inventoryApi.adjustStock(dataToSubmit);
            if (res.success) {
                onRefresh();
                onClose();
            }
        } catch (err) {
            setError(err.message || 'Failed to adjust stock');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const typeLabels = {
        'ADD': { label: 'Stock In (Add)', color: 'text-emerald-600' },
        'REMOVE': { label: 'Stock Out (Remove)', color: 'text-rose-600' },
        'SET': { label: 'Manual Count (Set)', color: 'text-amber-600' }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-800">Stock Adjustment</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                    {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>}

                    {selectedProduct && (
                        <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <p className="text-sm text-slate-600">Current stock for <strong>{selectedProduct.product_name}</strong>:</p>
                            <p className="text-2xl font-bold text-slate-900">{selectedProduct.quantity || 0} units</p>
                        </div>
                    )}

                    <form id="adjustmentForm" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Select Product *</label>
                            <select name="product_id" required value={formData.product_id} onChange={handleChange} className="input-field">
                                <option value="">-- Choose Product --</option>
                                {products.map(p => (
                                    <option key={p.product_id} value={p.product_id}>
                                        {p.product_name} (Stock: {p.quantity || 0})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
                                <select name="adjustment_type" required value={formData.adjustment_type} onChange={handleChange} className="input-field">
                                    <option value="ADD">Stock In (Add)</option>
                                    <option value="REMOVE">Stock Out (Remove)</option>
                                    <option value="SET">Manual Count (Set)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity *</label>
                                <input type="number" min="0" name="quantity" required value={formData.quantity} onChange={handleChange} className="input-field" placeholder="e.g. 10" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Reason / Notes</label>
                            <input type="text" name="reason" value={formData.reason} onChange={handleChange} className="input-field" placeholder="e.g. Supplier delivery, damage, count" />
                        </div>
                    </form>
                </div>

                <div className="p-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
                        Cancel
                    </button>
                    <button type="submit" form="adjustmentForm" disabled={loading} className="btn-primary px-6 py-2 text-sm flex items-center gap-2">
                        {loading ? 'Processing...' : 'Process Adjustment'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StockAdjustmentModal;
