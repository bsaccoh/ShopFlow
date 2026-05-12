import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Users, 
    ChevronRight
} from 'lucide-react';
import DataTable from '../components/DataTable';
import { customerApi } from '../services/api';

const CustomerHistory = () => {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchCustomers();
    }, [searchQuery]);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const res = await customerApi.getCustomers(searchQuery);
            if (res.success) {
                setCustomers(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch customers', error);
        } finally {
            setLoading(false);
        }
    };

    const listColumns = [
        {
            header: 'Customer',
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold border border-brand-200 uppercase">
                        {row.name.substring(0, 2)}
                    </div>
                    <div>
                        <div className="font-semibold text-slate-900">{row.name}</div>
                        <div className="text-xs text-slate-500">{row.phone || row.email || 'No contact'}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Total Spent',
            render: (row) => <span className="font-medium">LE {parseFloat(row.total_spent || 0).toLocaleString()}</span>
        },
        {
            header: 'Loyalty Points',
            render: (row) => <span className="text-amber-600 font-semibold">{row.loyalty_points || 0} pts</span>
        },
        {
            header: 'Action',
            render: (row) => (
                <button 
                    onClick={() => navigate(`/customer-history/${row.id}`)}
                    className="flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium text-sm transition-colors"
                >
                    View History <ChevronRight className="w-4 h-4" />
                </button>
            )
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Users className="w-6 h-6 text-brand-600" /> Customer Purchase History
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Search and select a customer to track their buying habits and items.
                    </p>
                </div>
            </div>

            <DataTable 
                columns={listColumns}
                data={customers}
                loading={loading}
                onSearch={setSearchQuery}
                actions={false}
                searchPlaceholder="Search customers by name, phone or email..."
                emptyMessage={searchQuery ? "No customers found matching your search." : "Search for a customer to begin."}
            />
        </div>
    );
};

export default CustomerHistory;
