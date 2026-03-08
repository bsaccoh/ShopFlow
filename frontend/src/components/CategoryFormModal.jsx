import React, { useState, useEffect } from 'react';
import { X, Layers } from 'lucide-react';
import { categoryApi } from '../services/api';

const CategoryFormModal = ({ isOpen, onClose, onSuccess, category }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        parent_id: ''
    });
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingCats, setFetchingCats] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchCategories();
            if (category) {
                setFormData({
                    name: category.name || '',
                    description: category.description || '',
                    parent_id: category.parent_id || ''
                });
            } else {
                setFormData({ name: '', description: '', parent_id: '' });
            }
            setError('');
        }
    }, [category, isOpen]);

    const fetchCategories = async () => {
        setFetchingCats(true);
        try {
            const res = await categoryApi.getCategories();
            if (res.success) {
                setCategories(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch categories for dropdown', err);
        } finally {
            setFetchingCats(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const payload = {
            name: formData.name,
            description: formData.description,
            parentId: formData.parent_id ? parseInt(formData.parent_id) : null
        };

        try {
            let res;
            if (category) {
                res = await categoryApi.updateCategory(category.id, payload);
            } else {
                res = await categoryApi.createCategory(payload);
            }

            if (res.success) {
                onSuccess();
                onClose();
            } else {
                setError(res.message || 'Failed to save category');
            }
        } catch (err) {
            setError(err.message || 'Failed to save category. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    // Filter out the current category so it can't be its own parent
    const availableParents = categories.filter(c => !category || c.id !== category.id);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Layers className="w-5 h-5 text-brand-500" />
                        {category ? 'Edit Category' : 'Add New Category'}
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {error && (
                        <div className="mb-4 p-3 bg-rose-50 text-rose-700 rounded-lg text-sm border border-rose-100">
                            {error}
                        </div>
                    )}

                    <form id="categoryForm" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Category Name <span className="text-rose-500">*</span></label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="input-field"
                                placeholder="e.g. Electronics"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Parent Category <span className="text-slate-400 font-normal">(Optional)</span></label>
                            <select
                                value={formData.parent_id || ''}
                                onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                                className="input-field"
                                disabled={fetchingCats}
                            >
                                <option value="">None (Top Level Category)</option>
                                {availableParents.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            {fetchingCats && <p className="text-xs text-slate-500 mt-1">Loading options...</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Description <span className="text-slate-400 font-normal">(Optional)</span></label>
                            <textarea
                                rows="3"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="input-field resize-none"
                                placeholder="Details about this category"
                            ></textarea>
                        </div>
                    </form>
                </div>

                <div className="p-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="categoryForm"
                        disabled={loading}
                        className="btn-primary px-6 py-2 text-sm"
                    >
                        {loading ? 'Saving...' : (category ? 'Update Category' : 'Create Category')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CategoryFormModal;
