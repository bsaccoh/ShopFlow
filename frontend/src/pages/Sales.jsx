import React, { useState, useEffect } from 'react';
import { CreditCard, FileText, Search, Printer, RotateCcw, Download } from 'lucide-react';
import DataTable from '../components/DataTable';
import SaleDetailsModal from '../components/SaleDetailsModal';
import ReceiptModal from '../components/ReceiptModal';
import { downloadReceiptPDF } from '../utils/receipt';
import { useAuth } from '../context/AuthContext';
import { posApi } from '../services/api';

const Sales = () => {
    const { user } = useAuth();
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSaleId, setSelectedSaleId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [receiptData, setReceiptData] = useState(null);

    useEffect(() => {
        fetchSales();
    }, [searchQuery]);

    const fetchSales = async () => {
        setLoading(true);
        try {
            const res = await posApi.getSalesHistory({ search: searchQuery });
            if (res.success) {
                setSales(res.data.data || res.data || []);
            } else {
                setSales([]);
            }
        } catch (error) {
            console.error('Failed to fetch sales', error);
            setSales([]);
        } finally {
            setLoading(false);
        }
    };

    const openReceipt = async (saleId) => {
        try {
            const res = await posApi.getSaleDetails(saleId);
            if (res.success && res.data) {
                const mappedData = {
                    ...res.data.sale,
                    items: res.data.items,
                    payments: res.data.payments
                };
                setReceiptData(mappedData);
                setShowReceipt(true);
            }
        } catch (e) {
            console.error('Failed to load receipt', e);
        }
    };

    const downloadReceipt = async (saleId) => {
        try {
            const res = await posApi.getSaleDetails(saleId);
            if (res.success && res.data) {
                const mappedData = {
                    ...res.data.sale,
                    items: res.data.items,
                    payments: res.data.payments
                };
                downloadReceiptPDF(mappedData, user?.tenant_name || 'ShopFlow Store');
            }
        } catch (e) {
            console.error('Failed to download receipt', e);
        }
    };

    const columns = [
        {
            header: 'Receipt no.',
            accessor: 'sale_number',
            render: (row) => (
                <div className="font-mono text-sm font-semibold text-brand-600">
                    #{row.sale_number}
                </div>
            )
        },
        {
            header: 'Date & Time',
            accessor: 'created_at',
            render: (row) => (
                <div className="text-slate-600">
                    {new Date(row.created_at).toLocaleString()}
                </div>
            )
        },
        {
            header: 'Items',
            accessor: 'items_summary',
            render: (row) => (
                <div className="text-sm text-slate-700 max-w-[200px] truncate" title={row.items_summary}>
                    {row.items_summary || '-'}
                </div>
            )
        },
        {
            header: 'Qty',
            accessor: 'total_items',
            render: (row) => (
                <div className="text-sm font-medium text-slate-600 text-center">
                    {row.total_items || 0}
                </div>
            )
        },
        {
            header: 'Amount',
            accessor: 'total_amount',
            render: (row) => (
                <span className="font-bold text-slate-900">LE {parseFloat(row.total_amount).toLocaleString()}</span>
            )
        },
        {
            header: 'Payment Status',
            accessor: 'payment_status',
            render: (row) => {
                const status = row.payment_status;
                let colorClasses = "bg-slate-100 text-slate-700";
                if (status === 'PAID') colorClasses = "bg-emerald-100 text-emerald-700";
                if (status === 'CREDIT' || status === 'PARTIAL_CREDIT') colorClasses = "bg-rose-100 text-rose-700";
                if (status === 'PENDING') colorClasses = "bg-amber-100 text-amber-700";
                if (status === 'REFUNDED') colorClasses = "bg-slate-100 text-slate-700";

                return (
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${colorClasses}`}>
                        {status}
                    </span>
                );
            }
        },
        {
            header: 'Actions',
            render: (row) => (
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => { setSelectedSaleId(row.id); setIsModalOpen(true); }}
                        className="p-1.5 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:bg-brand-50 border border-transparent hover:border-brand-200 rounded transition-colors" title="View Details">
                        <FileText className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => openReceipt(row.id)}
                        className="p-1.5 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 rounded transition-colors" title="Print Receipt">
                        <Printer className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => downloadReceipt(row.id)}
                        className="p-1.5 flex items-center justify-center text-slate-500 hover:text-teal-600 hover:bg-teal-50 border border-transparent hover:border-teal-200 rounded transition-colors" title="Download Receipt">
                        <Download className="w-4 h-4" />
                    </button>
                    {row.payment_status === 'PAID' && (
                        <button className="p-1.5 flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded transition-colors" title="Process Refund">
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    )}
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
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sales History</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        View past transactions, print receipts, and process refunds.
                    </p>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={sales}
                loading={loading}
                onSearch={setSearchQuery}
                searchPlaceholder="Search by receipt number..."
                actions={false}
                emptyMessage={searchQuery ? "No sales found matching your search." : "No sales transactions recorded yet."}
            />

            {/* Modals */}
            <SaleDetailsModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setSelectedSaleId(null); }}
                saleId={selectedSaleId}
            />

            {showReceipt && receiptData && (
                <ReceiptModal
                    sale={receiptData}
                    storeName={user?.tenant_name || 'ShopFlow Store'}
                    onClose={() => { setShowReceipt(false); setReceiptData(null); }}
                />
            )}
        </div>
    );
};

export default Sales;
