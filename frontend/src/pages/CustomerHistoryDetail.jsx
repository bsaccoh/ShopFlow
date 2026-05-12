import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, 
    ShoppingBag, 
    Calendar, 
    CreditCard, 
    Clock, 
    TrendingUp, 
    Package,
    FileText,
    ChevronRight
} from 'lucide-react';
import DataTable from '../components/DataTable';
import SaleDetailsModal from '../components/SaleDetailsModal';
import { customerApi, reportsApi } from '../services/api';

const CustomerHistoryDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [customer, setCustomer] = useState(null);
    const [historyData, setHistoryData] = useState(null);
    const [itemsData, setItemsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSaleId, setSelectedSaleId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (id) {
            fetchData();
        }
    }, [id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [historyRes, itemsRes, customersRes] = await Promise.all([
                reportsApi.getCustomerHistory(id),
                reportsApi.getCustomerItems(id),
                customerApi.getCustomers('') 
            ]);

            if (historyRes.success) setHistoryData(historyRes.data);
            if (itemsRes.success) setItemsData(itemsRes.data);
            
            if (customersRes.success) {
                const found = customersRes.data.find(c => c.id.toString() === id.toString());
                if (found) setCustomer(found);
            }
        } catch (error) {
            console.error('Failed to fetch customer history details', error);
        } finally {
            setLoading(false);
        }
    };

    const itemsColumns = [
        {
            header: 'Item Name',
            accessor: 'product_name',
            render: (row) => <span className="font-medium text-slate-900">{row.product_name}</span>
        },
        {
            header: 'Sale Date',
            accessor: 'sale_date',
            render: (row) => (
                <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(row.sale_date).toLocaleDateString()}
                </div>
            )
        },
        {
            header: 'Sale #',
            accessor: 'sale_number',
            render: (row) => <span className="font-mono text-xs text-brand-600">{row.sale_number}</span>
        },
        {
            header: 'Qty',
            accessor: 'quantity',
            render: (row) => <span className="text-slate-700">{row.quantity}</span>
        },
        {
            header: 'Unit Price',
            render: (row) => <span>LE {parseFloat(row.unit_price).toLocaleString()}</span>
        },
        {
            header: 'Total',
            render: (row) => <span className="font-bold text-slate-900">LE {parseFloat(row.total).toLocaleString()}</span>
        }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-slate-400 animate-pulse font-medium">Loading customer history details...</div>
            </div>
        );
    }

    if (!historyData && !loading) {
        return (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-slate-500">Customer history not found or no data available.</p>
                <button onClick={() => navigate('/customer-history')} className="mt-4 text-brand-600 font-medium">Go back</button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Header with Back Button */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/customer-history')}
                        className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all text-slate-500"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{customer?.name || 'Customer Details'}</h1>
                        <p className="text-sm text-slate-500">Purchase History & Analytics</p>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Spent', value: `LE ${parseFloat(historyData?.summary?.total_spent || 0).toLocaleString()}`, icon: CreditCard, color: 'text-emerald-600 bg-emerald-50' },
                    { label: 'Total Visits', value: historyData?.summary?.total_visits || 0, icon: ShoppingBag, color: 'text-blue-600 bg-blue-50' },
                    { label: 'Loyalty Points', value: `${customer?.loyalty_points || 0} pts`, icon: TrendingUp, color: 'text-amber-600 bg-amber-50' },
                    { label: 'Last Visit', value: historyData?.summary?.last_visit ? new Date(historyData.summary.last_visit).toLocaleDateString() : 'Never', icon: Clock, color: 'text-purple-600 bg-purple-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${stat.color}`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                                <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Products */}
                <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-brand-600" />
                        Top Purchased Products
                    </h3>
                    <div className="space-y-4">
                        {historyData?.topProducts?.length > 0 ? (
                            historyData.topProducts.map((product, i) => (
                                <div key={i} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">{product.name}</p>
                                            <p className="text-xs text-slate-500">{product.total_qty} units bought</p>
                                        </div>
                                    </div>
                                    <p className="text-sm font-bold text-slate-900">LE {parseFloat(product.total_revenue).toLocaleString()}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-slate-400 text-center py-4">No product data available</p>
                        )}
                    </div>
                </div>

                {/* Recent Transactions List */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-brand-600" />
                        Recent Transactions
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="text-slate-400 border-b border-slate-100">
                                    <th className="pb-3 font-medium">Sale #</th>
                                    <th className="pb-3 font-medium">Date</th>
                                    <th className="pb-3 font-medium text-right">Amount</th>
                                    <th className="pb-3 font-medium text-center">Status</th>
                                    <th className="pb-3 font-medium text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {historyData?.recentSales?.length > 0 ? (
                                    historyData.recentSales.map((sale) => (
                                        <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3 font-mono text-brand-600 font-medium">#{sale.sale_number}</td>
                                            <td className="py-3 text-slate-500">{new Date(sale.created_at).toLocaleDateString()}</td>
                                            <td className="py-3 text-right font-bold text-slate-900">LE {parseFloat(sale.total_amount).toLocaleString()}</td>
                                            <td className="py-3 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    sale.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                                }`}>
                                                    {sale.status}
                                                </span>
                                            </td>
                                            <td className="py-3 text-right">
                                                <button 
                                                    onClick={() => { setSelectedSaleId(sale.id); setIsModalOpen(true); }}
                                                    className="p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-all"
                                                    title="View Details"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="py-8 text-center text-slate-400">No transactions found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Detailed Items Purchased Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Package className="w-5 h-5 text-brand-600" />
                        All Items Purchased
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded-lg">
                            {itemsData.length} Items Total
                        </span>
                    </div>
                </div>
                <DataTable 
                    columns={itemsColumns}
                    data={itemsData}
                    loading={false}
                    actions={false}
                    searchPlaceholder="Search purchased items..."
                    emptyMessage="No items found in this customer's history."
                />
            </div>

            <SaleDetailsModal 
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setSelectedSaleId(null); }}
                saleId={selectedSaleId}
            />
        </div>
    );
};

export default CustomerHistoryDetail;
