import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2 } from 'lucide-react';
import DataTable from '../components/DataTable';
import { branchApi } from '../services/api';

const Branches = () => {
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState(null);
    const [formData, setFormData] = useState({ name: '', address: '', phone: '', is_main: false, is_active: true });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchBranches();
    }, []);

    const fetchBranches = async () => {
        setLoading(true);
        try {
            const res = await branchApi.getAll();
            if (res.success) setBranches(res.data);
        } catch (error) {
            console.error('Failed to fetch branches', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (branch = null) => {
        if (branch) {
            setEditingBranch(branch);
            setFormData({
                name: branch.name,
                address: branch.address || '',
                phone: branch.phone || '',
                is_main: !!branch.is_main,
                is_active: !!branch.is_active
            });
        } else {
            setEditingBranch(null);
            setFormData({ name: '', address: '', phone: '', is_main: branches.length === 0, is_active: true });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingBranch) {
                await branchApi.update(editingBranch.id, formData);
            } else {
                await branchApi.create(formData);
            }
            fetchBranches();
            setIsModalOpen(false);
        } catch (error) {
            alert(error.response?.data?.message || error.message || 'Failed to save branch');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this branch?')) return;
        try {
            await branchApi.delete(id);
            fetchBranches();
        } catch (error) {
            alert(error.response?.data?.message || error.message || 'Failed to delete branch');
        }
    };

    const columns = [
        {
            header: 'Branch Name',
            accessor: 'name',
            render: (row) => (
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{row.name}</span>
                    {row.is_main === 1 && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">HQ / Main</span>}
                </div>
            )
        },
        { header: 'Address', accessor: 'address' },
        { header: 'Phone', accessor: 'phone' },
        {
            header: 'Status',
            render: (row) => (
                row.is_active ?
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Active</span> :
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">Inactive</span>
            )
        },
        {
            header: 'Actions',
            render: (row) => (
                <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => handleOpenModal(row)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                        <Edit2 className="w-4 h-4" />
                    </button>
                    {!row.is_main && (
                        <button onClick={() => handleDelete(row.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded" title="Delete">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            ),
            className: 'text-right'
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Branch Management</h1>
                    <p className="mt-1 text-sm text-slate-500">Manage your store locations and warehouses.</p>
                </div>
                <button onClick={() => handleOpenModal()} className="btn-primary h-10 px-4 text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add Branch
                </button>
            </div>

            <DataTable
                columns={columns}
                data={branches}
                loading={loading}
                onSearch={setSearchQuery}
                searchPlaceholder="Search branches..."
            />

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-4 border-b border-slate-200">
                            <h2 className="text-xl font-bold">{editingBranch ? 'Edit Branch' : 'Add Branch'}</h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Branch Name *</label>
                                <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-field" placeholder="e.g. Downtown Store" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                                <textarea value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="input-field" rows="2"></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                                <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="input-field" />
                            </div>

                            <div className="flex items-center gap-2 mt-2">
                                <input type="checkbox" id="is_main" checked={formData.is_main} onChange={e => setFormData({ ...formData, is_main: e.target.checked })} className="rounded text-indigo-600 focus:ring-indigo-500" />
                                <label htmlFor="is_main" className="text-sm font-medium text-slate-700">Set as Main Branch / HQ</label>
                            </div>

                            <div className="flex items-center gap-2 mt-2">
                                <input type="checkbox" id="is_active" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="rounded text-indigo-600 focus:ring-indigo-500" />
                                <label htmlFor="is_active" className="text-sm font-medium text-slate-700">Active branch</label>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
                                <button type="submit" disabled={submitting} className="btn-primary px-4 py-2 text-sm">{submitting ? 'Saving...' : 'Save Branch'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Branches;
