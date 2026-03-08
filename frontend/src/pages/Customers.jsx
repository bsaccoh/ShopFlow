import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Gift, AlertCircle, Phone, Mail } from 'lucide-react';
import DataTable from '../components/DataTable';
import CustomerFormModal from '../components/CustomerFormModal';
import { customerApi } from '../services/api';

const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);

    useEffect(() => {
        fetchCustomers();
    }, [searchQuery]);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const res = await customerApi.getCustomers(searchQuery);
            if (res.success) {
                setCustomers(res.data);
            } else {
                setCustomers([]);
            }
        } catch (error) {
            console.error('Failed to fetch customers', error);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            header: 'Customer Details',
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold border border-brand-200 uppercase">
                        {row.name.substring(0, 2)}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">{row.name}</span>
                        {row.email && (
                            <span className="text-xs flex items-center gap-1 text-slate-500 mt-0.5">
                                <Mail className="w-3 h-3" />
                                {row.email}
                            </span>
                        )}
                    </div>
                </div>
            )
        },
        {
            header: 'Contact',
            render: (row) => (
                row.phone ?
                    <span className="text-sm text-slate-600 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {row.phone}
                    </span> :
                    <span className="text-sm text-slate-400 italic">Not provided</span>
            )
        },
        {
            header: 'Total Spent',
            accessor: 'total_spent',
            render: (row) => (
                <span className="font-medium text-slate-900">LE {parseFloat(row.total_spent || 0).toLocaleString()}</span>
            )
        },
        {
            header: 'Loyalty Points',
            accessor: 'loyalty_points',
            render: (row) => (
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700 flex items-center gap-1.5 w-max">
                    <Gift className="w-3.5 h-3.5" />
                    {row.loyalty_points || 0} pts
                </span>
            )
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customers</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Manage your customer database and track loyalty points.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="btn-primary h-10 px-4 text-sm flex items-center gap-2 shadow-sm" onClick={() => setIsFormOpen(true)}>
                        <UserPlus className="w-4 h-4" /> Add Customer
                    </button>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={customers}
                loading={loading}
                onSearch={setSearchQuery}
                searchPlaceholder="Search customers by name, phone or email..."
                emptyMessage={searchQuery ? "No customers found matching your search." : "No customers added yet."}
            />

            <CustomerFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSuccess={(newCustomer) => {
                    fetchCustomers(); // Refresh the list
                }}
            />
        </div>
    );
};

export default Customers;
