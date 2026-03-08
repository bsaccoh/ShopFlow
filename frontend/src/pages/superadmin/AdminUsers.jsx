import React, { useState, useEffect } from 'react';
import { Users, UserPlus, ShieldCheck, ShieldOff, X, Mail, Lock, User } from 'lucide-react';
import DataTable from '../../components/DataTable';
import { adminApi } from '../../services/api';

const AdminUserFormModal = ({ isOpen, onClose, onSuccess }) => {
    const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) { setForm({ first_name: '', last_name: '', email: '', password: '' }); setError(''); }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            const res = await adminApi.createAdminUser(form);
            if (res.success) { onSuccess(); onClose(); }
            else setError(res.message || 'Failed to create admin');
        } catch (err) { setError(err.message || 'Failed to create admin user'); }
        finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm" onClick={onClose} />
                <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
                    <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-brand-600" /> Add Super Admin
                        </h3>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
                    </div>

                    {error && <div className="mx-6 mt-4 bg-rose-50 text-rose-600 p-3 rounded-lg text-sm border border-rose-100">{error}</div>}

                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">First Name *</label>
                                <div className="mt-1 relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User className="h-4 w-4 text-slate-400" /></div>
                                    <input type="text" required className="input-field pl-10" value={form.first_name}
                                        onChange={e => setForm({ ...form, first_name: e.target.value })} placeholder="John" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Last Name *</label>
                                <div className="mt-1 relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User className="h-4 w-4 text-slate-400" /></div>
                                    <input type="text" required className="input-field pl-10" value={form.last_name}
                                        onChange={e => setForm({ ...form, last_name: e.target.value })} placeholder="Doe" />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Email *</label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-4 w-4 text-slate-400" /></div>
                                <input type="email" required className="input-field pl-10" value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })} placeholder="admin@shopflow.com" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Password *</label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-4 w-4 text-slate-400" /></div>
                                <input type="password" required minLength={6} className="input-field pl-10" value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={onClose} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
                            <button type="submit" disabled={loading} className="btn-primary px-5 py-2 text-sm">
                                {loading ? 'Creating...' : 'Create Admin'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

const AdminUsers = () => {
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);

    useEffect(() => { loadAdmins(); }, []);

    const loadAdmins = async () => {
        try {
            setLoading(true);
            const res = await adminApi.getAdminUsers();
            if (res.success) setAdmins(res.data);
        } catch (e) { console.error('Failed to load admins', e); }
        finally { setLoading(false); }
    };

    const handleToggleStatus = async (id, currentActive) => {
        if (!window.confirm(`Are you sure you want to ${currentActive ? 'deactivate' : 'activate'} this admin?`)) return;
        try {
            await adminApi.updateAdminStatus(id, !currentActive);
            loadAdmins();
        } catch (e) { alert('Failed to update status'); }
    };

    const columns = [
        {
            header: 'Admin User',
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm border border-indigo-200">
                        {row.first_name?.[0]}{row.last_name?.[0]}
                    </div>
                    <div>
                        <div className="font-semibold text-slate-900">{row.first_name} {row.last_name}</div>
                        <div className="text-xs text-slate-500">{row.email}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Last Login',
            render: (row) => <span className="text-sm text-slate-600">{row.last_login ? new Date(row.last_login).toLocaleString() : 'Never'}</span>
        },
        {
            header: 'Joined',
            render: (row) => <span className="text-sm text-slate-600">{new Date(row.created_at).toLocaleDateString()}</span>
        },
        {
            header: 'Status',
            render: (row) => (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${row.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {row.is_active ? 'Active' : 'Inactive'}
                </span>
            )
        },
        {
            header: 'Actions',
            render: (row) => (
                <button onClick={() => handleToggleStatus(row.id, row.is_active)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${row.is_active
                        ? 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                        : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'}`}>
                    {row.is_active ? <><ShieldOff className="w-3.5 h-3.5" /> Deactivate</> : <><ShieldCheck className="w-3.5 h-3.5" /> Activate</>}
                </button>
            )
        }
    ];

    const filtered = admins.filter(a =>
        `${a.first_name} ${a.last_name} ${a.email}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Users className="w-6 h-6 text-brand-600" /> Manage Admin Users
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">Add and manage platform super administrators.</p>
                </div>
                <button className="btn-primary flex items-center gap-2" onClick={() => setIsFormOpen(true)}>
                    <UserPlus className="w-5 h-5" /> Add Admin
                </button>
            </div>

            <DataTable columns={columns} data={filtered} loading={loading} actions={false}
                onSearch={setSearchTerm} searchPlaceholder="Search admin users..."
                emptyMessage="No admin users found." />

            <AdminUserFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSuccess={loadAdmins} />
        </div>
    );
};

export default AdminUsers;
