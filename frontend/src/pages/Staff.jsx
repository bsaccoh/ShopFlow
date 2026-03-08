import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, ShieldAlert, Mail } from 'lucide-react';
import DataTable from '../components/DataTable';
import StaffFormModal from '../components/StaffFormModal';
import { staffApi } from '../services/api';

const Staff = () => {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState(null);

    useEffect(() => {
        fetchStaff();
    }, [searchQuery]);

    const fetchStaff = async () => {
        setLoading(true);
        try {
            const res = await staffApi.getStaff(searchQuery);
            if (res.success) {
                setStaff(res.data);
            } else {
                setStaff([]);
            }
        } catch (error) {
            console.error('Failed to fetch staff', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (user) => {
        // Map backend lowercase role string for the form comparison, e.g. "inventory_manager" -> "Inventory Manager"
        let normalizedRole = 'Cashier';
        if (user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'administrator') normalizedRole = 'Administrator';
        else if (user.role?.toLowerCase() === 'manager') normalizedRole = 'Manager';
        else if (user.role?.toLowerCase() === 'cashier') normalizedRole = 'Cashier';
        else if (user.role?.toLowerCase() === 'inventory_manager' || user.role?.toLowerCase() === 'inventory manager') normalizedRole = 'Inventory Manager';

        setSelectedStaff({ ...user, role: normalizedRole });
        setIsModalOpen(true);
    };

    const handleOpenAdd = () => {
        setSelectedStaff(null);
        setIsModalOpen(true);
    };

    const columns = [
        {
            header: 'Staff Member',
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                        {row.first_name?.[0]}{row.last_name?.[0]}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">{row.first_name} {row.last_name}</span>
                        <span className="text-xs flex items-center gap-1 text-slate-500 mt-0.5">
                            <Mail className="w-3 h-3" />
                            {row.email}
                        </span>
                    </div>
                </div>
            )
        },
        {
            header: 'Role',
            accessor: 'role',
            render: (row) => {
                let badgeColor = "bg-slate-100 text-slate-700";
                if (row.role?.toLowerCase() === 'administrator' || row.role?.toLowerCase() === 'admin') badgeColor = "bg-indigo-100 text-indigo-700";
                if (row.role?.toLowerCase() === 'manager') badgeColor = "bg-emerald-100 text-emerald-700";

                return (
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 w-max capitalize ${badgeColor}`}>
                        {(row.role?.toLowerCase() === 'administrator' || row.role?.toLowerCase() === 'admin') ? <ShieldAlert className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                        {row.role?.replace('_', ' ')}
                    </span>
                )
            }
        },
        {
            header: 'Branch',
            accessor: 'branch_name',
            render: (row) => (
                <span className="text-slate-600 text-sm italic">
                    {row.branch_name || 'Not assigned'}
                </span>
            )
        },
        {
            header: 'Status',
            accessor: 'is_active',
            render: (row) => (
                row.is_active ?
                    <span className="text-emerald-600 font-medium text-sm flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active</span> :
                    <span className="text-slate-500 font-medium text-sm flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-300"></span> Inactive</span>
            )
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Staff & Roles</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Manage user accounts, roles, and system access permissions.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleOpenAdd} className="btn-primary h-10 px-4 text-sm flex items-center gap-2 shadow-sm">
                        <UserPlus className="w-4 h-4" /> Add Staff Member
                    </button>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={staff}
                loading={loading}
                onSearch={setSearchQuery}
                searchPlaceholder="Search staff by name or email..."
                onEdit={handleEdit}
                emptyMessage={searchQuery ? "No staff found matching your search." : "No staff members added yet."}
            />

            {/* Modals */}
            <StaffFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onRefresh={fetchStaff}
                initialData={selectedStaff}
            />
        </div>
    );
};

export default Staff;
