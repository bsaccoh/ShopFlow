import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Gift, AlertCircle, Phone, Mail, HistoryIcon } from 'lucide-react';
import DataTable from '../components/DataTable';
import CustomerFormModal from '../components/CustomerFormModal';
import CustomerHistoryModal from '../components/CustomerHistoryModal';
import { customerApi } from '../services/api';

const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);

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

    const handleViewHistory = (customer) => {
        setSelectedCustomer(customer);
        setIsHistoryOpen(true);
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
        },
        {
            header: 'Actions',
            render: (row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleViewHistory(row)}
                        className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors group relative"
                        title="View Purchase History"
                    >
                        <HistoryIcon className="w-5 h-5" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
                            Purchase History
                        </span>
                    </button>
                    {/* Add edit button here if needed later */}
                </div>
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

            <CustomerHistoryModal
                isOpen={isHistoryOpen}
                onClose={() => {
                    setIsHistoryOpen(false);
                    setSelectedCustomer(null);
                }}
                customer={selectedCustomer}
            />
        </div>
    );
};

export default Customers;
