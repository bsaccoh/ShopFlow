import React, { useState, useEffect } from 'react';
import { Layers, Plus, Edit2, Trash2 } from 'lucide-react';
import DataTable from '../components/DataTable';
import CategoryFormModal from '../components/CategoryFormModal';
import { categoryApi } from '../services/api';

const Categories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const res = await categoryApi.getCategories();
            if (res.success) {
                setCategories(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch categories', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this category?")) return;

        try {
            const res = await categoryApi.deleteCategory(id);
            if (res.success) {
                fetchCategories();
            } else {
                alert(res.message);
            }
        } catch (error) {
            alert(error.message || "Failed to delete category. It may be in use.");
        }
    };

    const openEditModal = (category) => {
        setSelectedCategory(category);
        setIsFormOpen(true);
    };

    const openCreateModal = () => {
        setSelectedCategory(null);
        setIsFormOpen(true);
    };

    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const getParentName = (parentId) => {
        if (!parentId) return null;
        const parent = categories.find(c => c.id === parentId);
        return parent ? parent.name : 'Unknown';
    };

    const columns = [
        {
            header: 'Category Name',
            accessor: 'name',
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                        <Layers className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="font-semibold text-slate-900">{row.name}</div>
                        <div className="text-xs text-slate-500">{row.slug}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Parent',
            accessor: 'parent_id',
            render: (row) => (
                <div className="text-sm">
                    {row.parent_id ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
                            <Layers className="w-3.5 h-3.5 text-slate-400" />
                            {getParentName(row.parent_id)}
                        </span>
                    ) : (
                        <span className="text-slate-400 italic">None</span>
                    )}
                </div>
            )
        },
        {
            header: 'Description',
            accessor: 'description',
            render: (row) => (
                <div className="text-sm text-slate-600 max-w-sm truncate" title={row.description}>
                    {row.description || <span className="text-slate-400 italic">No description</span>}
                </div>
            )
        },
        {
            header: 'Created At',
            accessor: 'created_at',
            render: (row) => (
                <div className="text-sm text-slate-600">
                    {new Date(row.created_at).toLocaleDateString()}
                </div>
            )
        },
        {
            header: 'Actions',
            render: (row) => (
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => openEditModal(row)}
                        className="p-1.5 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:bg-brand-50 border border-transparent hover:border-brand-200 rounded transition-colors" title="Edit">
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleDelete(row.id)}
                        className="p-1.5 flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
            className: 'text-right'
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Product Categories</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Organize your products into categories.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="btn-primary h-10 px-4 text-sm flex items-center gap-2 shadow-sm" onClick={openCreateModal}>
                        <Plus className="w-4 h-4" /> Add Category
                    </button>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={filteredCategories}
                loading={loading}
                onSearch={setSearchQuery}
                searchPlaceholder="Search categories..."
                emptyMessage={searchQuery ? "No categories found." : "No categories yet. Create one to get started!"}
                actions={false}
            />

            <CategoryFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSuccess={() => fetchCategories()}
                category={selectedCategory}
            />
        </div>
    );
};

export default Categories;
