import React, { useState, useEffect } from 'react';
import { posApi, categoryApi } from '../services/api';
import { X } from 'lucide-react';

const ProductFormModal = ({ isOpen, onClose, onRefresh, editProduct }) => {
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        barcode: '',
        description: '',
        category_id: '',
        cost_price: '',
        selling_price: '',
        min_stock_level: 5,
        current_stock: 0
    });
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const isEditMode = !!editProduct;

    useEffect(() => {
        if (isOpen) {
            fetchCategories();
            if (editProduct) {
                setFormData({
                    name: editProduct.name || '',
                    sku: editProduct.sku || '',
                    barcode: editProduct.barcode || '',
                    description: editProduct.description || '',
                    category_id: editProduct.category_id || '',
                    cost_price: editProduct.cost_price || '',
                    selling_price: editProduct.selling_price || '',
                    min_stock_level: editProduct.min_stock_level || 5,
                    current_stock: editProduct.current_stock || 0
                });
            } else {
                setFormData({
                    name: '', sku: '', barcode: '', description: '',
                    category_id: '', cost_price: '', selling_price: '',
                    min_stock_level: 5, current_stock: 0
                });
            }
            setError('');
        }
    }, [isOpen, editProduct]);

    const fetchCategories = async () => {
        try {
            const res = await categoryApi.getCategories();
            if (res.success) {
                setCategories(res.data);
            }
        } catch (err) {
            console.error('Failed to load categories', err);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const dataToSubmit = {
                ...formData,
                cost_price: parseFloat(formData.cost_price),
                selling_price: parseFloat(formData.selling_price),
                min_stock_level: parseInt(formData.min_stock_level),
            };
            if (!isEditMode) {
                dataToSubmit.initial_stock = parseInt(formData.current_stock);
            }
            if (!dataToSubmit.category_id) delete dataToSubmit.category_id;

            let res;
            if (isEditMode) {
                res = await posApi.updateProduct(editProduct.id, dataToSubmit);
            } else {
                res = await posApi.createProduct(dataToSubmit);
            }

            if (res.success) {
                onRefresh();
                onClose();
            }
        } catch (err) {
            setError(err.message || `Failed to ${isEditMode ? 'update' : 'create'} product`);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-800">
                        {isEditMode ? 'Edit Product' : 'Add New Product'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                    {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>}
                    <form id="productForm" onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Product Name *</label>
                            <input type="text" name="name" required value={formData.name} onChange={handleChange} className="input-field" placeholder="e.g. Coca Cola 330ml" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
                            <input type="text" name="sku" value={formData.sku} onChange={handleChange} className="input-field" placeholder="Optional" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Barcode</label>
                            <input type="text" name="barcode" value={formData.barcode} onChange={handleChange} className="input-field" placeholder="Optional" />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                            <select name="category_id" value={formData.category_id} onChange={handleChange} className="input-field">
                                <option value="">Select Category</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Cost Price *</label>
                            <input type="number" step="0.01" name="cost_price" required value={formData.cost_price} onChange={handleChange} className="input-field" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Selling Price *</label>
                            <input type="number" step="0.01" name="selling_price" required value={formData.selling_price} onChange={handleChange} className="input-field" />
                        </div>

                        {!isEditMode && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Initial Stock</label>
                                <input type="number" name="current_stock" required value={formData.current_stock} onChange={handleChange} className="input-field" />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Min Stock Level</label>
                            <input type="number" name="min_stock_level" required value={formData.min_stock_level} onChange={handleChange} className="input-field" />
                        </div>
                    </form>
                </div>

                <div className="p-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
                        Cancel
                    </button>
                    <button type="submit" form="productForm" disabled={loading} className="btn-primary px-6 py-2 text-sm">
                        {loading ? 'Saving...' : (isEditMode ? 'Update Product' : 'Save Product')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductFormModal;
