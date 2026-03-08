import React, { useState, useEffect } from 'react';
import { staffApi, branchApi } from '../services/api';

const StaffFormModal = ({ isOpen, onClose, onRefresh, initialData = null }) => {
    const isEditing = !!initialData;
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        role: 'Cashier',
        branch_id: '',
        is_active: true
    });
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingBranches, setFetchingBranches] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    first_name: initialData.first_name || '',
                    last_name: initialData.last_name || '',
                    email: initialData.email || '',
                    password: '',
                    role: initialData.role || 'Cashier',
                    branch_id: initialData.branch_id || '',
                    is_active: initialData.is_active !== undefined ? initialData.is_active : true
                });
            } else {
                setFormData({
                    first_name: '',
                    last_name: '',
                    email: '',
                    password: '',
                    role: 'Cashier',
                    branch_id: '',
                    is_active: true
                });
            }
        }
        fetchBranches();
        setError('');
    }, [isOpen, initialData, isEditing]);

    const fetchBranches = async () => {
        setFetchingBranches(true);
        try {
            const res = await branchApi.getAll();
            if (res.success) {
                setBranches(res.data);
                // If adding new, auto-select main branch if available
                if (!isEditing && res.data.length > 0) {
                    const main = res.data.find(b => b.is_main);
                    if (main) {
                        setFormData(prev => ({ ...prev, branch_id: main.id }));
                    }
                }
            }
        } catch (err) {
            console.error('Failed to fetch branches', err);
        } finally {
            setFetchingBranches(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const dataToSubmit = {
                ...formData,
                role: formData.role.toLowerCase()
            };

            if (isEditing) {
                // If editing, password is not required here unless we build that feature specifically
                if (!dataToSubmit.password) delete dataToSubmit.password;
                const res = await staffApi.updateStaff(initialData.id, dataToSubmit);
                if (res.success) {
                    onRefresh();
                    onClose();
                }
            } else {
                if (!dataToSubmit.password) throw new Error('Password is required for new staff');
                const res = await staffApi.createStaff(dataToSubmit);
                if (res.success) {
                    onRefresh();
                    onClose();
                }
            }
        } catch (err) {
            setError(err.message || `Failed to ${isEditing ? 'update' : 'create'} staff member`);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    // Check if the role is Administrator (tenant owner) - can't edit roles/status of main owner easily here depending on business logic, but we'll allow name edits
    const isOwner = initialData?.role === 'Administrator';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">{isEditing ? 'Edit Staff Member' : 'Add Staff Member'}</h2>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                    {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>}
                    <form id="staffForm" onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
                                <input type="text" name="first_name" required value={formData.first_name} onChange={handleChange} className="input-field" placeholder="John" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Last Name *</label>
                                <input type="text" name="last_name" required value={formData.last_name} onChange={handleChange} className="input-field" placeholder="Doe" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address *</label>
                            <input type="email" name="email" required={!isEditing} disabled={isEditing} value={formData.email} onChange={handleChange} className={`input-field ${isEditing ? 'bg-slate-100 cursor-not-allowed text-slate-500' : ''}`} placeholder="john@example.com" />
                            {isEditing && <p className="text-xs text-slate-500 mt-1">Email cannot be changed after creation.</p>}
                        </div>

                        {!isEditing && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Temporary Password *</label>
                                <input type="password" name="password" required minLength={6} value={formData.password} onChange={handleChange} className="input-field" />
                                <p className="text-xs text-slate-500 mt-1">They can change this after logging in.</p>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Assigned Branch *</label>
                            <select name="branch_id" required value={formData.branch_id} onChange={handleChange} className="input-field" disabled={fetchingBranches}>
                                <option value="">-- Select Branch --</option>
                                {branches.map(branch => (
                                    <option key={branch.id} value={branch.id}>
                                        {branch.name} {branch.is_main ? '(Main)' : ''}
                                    </option>
                                ))}
                            </select>
                            {fetchingBranches && <p className="text-xs text-slate-500 mt-1">Fetching branches...</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
                            <select name="role" required value={formData.role} onChange={handleChange} disabled={isOwner} className={`input-field ${isOwner ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}>
                                {isOwner && <option value="Administrator">Administrator</option>}
                                <option value="Manager">Manager</option>
                                <option value="Cashier">Cashier</option>
                                <option value="Inventory Manager">Inventory Manager</option>
                            </select>
                            {isOwner ? (
                                <p className="text-xs text-amber-600 mt-1">The primary tenant administrator role cannot be changed.</p>
                            ) : (
                                <p className="text-xs text-slate-500 mt-1">Managers see reports & expenses. Cashiers handle POS. Inventory Managers handle stock.</p>
                            )}
                        </div>

                        {isEditing && !isOwner && (
                            <div className="flex items-center gap-2 pt-2">
                                <input type="checkbox" id="is_active" name="is_active" checked={formData.is_active} onChange={handleChange} className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500" />
                                <label htmlFor="is_active" className="text-sm font-medium text-slate-700">Account is Active</label>
                            </div>
                        )}
                    </form>
                </div>

                <div className="p-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
                        Cancel
                    </button>
                    <button type="submit" form="staffForm" disabled={loading} className="btn-primary px-6 py-2 text-sm flex items-center gap-2">
                        {loading ? 'Saving...' : (isEditing ? 'Save Changes' : 'Add Staff Member')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StaffFormModal;
