import React, { useState, useEffect } from 'react';
import { Package, TrendingUp, TrendingDown, ArrowRightLeft, FileDown } from 'lucide-react';
import DataTable from '../components/DataTable';
import StockAdjustmentModal from '../components/StockAdjustmentModal';
import BranchTransfersModal from '../components/BranchTransfersModal';
import { inventoryApi } from '../services/api';
import { exportToExcel } from '../utils/excel';

const Inventory = () => {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [preselectedProduct, setPreselectedProduct] = useState(null);
    const [preselectedType, setPreselectedType] = useState('ADD');

    useEffect(() => {
        fetchInventory();
    }, [searchQuery]);

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const res = await inventoryApi.getLevels({ search: searchQuery || undefined });
            if (res.success) {
                setInventory(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch inventory', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!inventory.length) return alert('No data to export.');
        const dataToExport = inventory.map(row => ({
            SKU: row.sku || '',
            'Product Name': row.product_name,
            'Current Stock': row.quantity || 0,
            'Min Level': row.min_stock_level || 0,
            'Status': (row.quantity || 0) <= 0 ? 'Out of Stock' : (row.quantity || 0) <= (row.min_stock_level || 5) ? 'Low Stock' : 'Healthy',
        }));
        exportToExcel(dataToExport, `Inventory_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const openQuickAction = (product, type) => {
        setPreselectedProduct(product);
        setPreselectedType(type);
        setIsModalOpen(true);
    };

    const columns = [
        {
            header: 'SKU / Item',
            accessor: 'product_name',
            render: (row) => (
                <div>
                    <div className="font-semibold text-slate-900">{row.product_name}</div>
                    <div className="text-xs font-mono text-slate-500 mt-0.5">{row.sku}</div>
                </div>
            )
        },
        {
            header: 'In Stock (Main WH)',
            render: (row) => {
                const stock = row.quantity || 0;
                return (
                    <span className="text-lg font-bold text-slate-800">{stock}</span>
                )
            },
            className: 'w-32'
        },
        {
            header: 'Min. Level',
            accessor: 'min_stock_level',
            render: (row) => (
                <span className="text-slate-500 font-medium">{row.min_stock_level || 0}</span>
            ),
            className: 'w-32'
        },
        {
            header: 'Status',
            render: (row) => {
                const stock = row.quantity || 0;
                const min = row.min_stock_level || 5;
                if (stock <= 0) return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">Out of Stock</span>;
                if (stock <= min) return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">Low Stock</span>;
                return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Healthy</span>;
            },
            className: 'w-32'
        },
        {
            header: 'Quick Actions',
            render: (row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => openQuickAction(row, 'ADD')}
                        className="p-1.5 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded transition-colors"
                        title="Stock In"
                    >
                        <TrendingUp className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => openQuickAction(row, 'REMOVE')}
                        className="p-1.5 flex items-center justify-center text-rose-600 hover:bg-rose-50 border border-rose-200 rounded transition-colors"
                        title="Stock Out"
                    >
                        <TrendingDown className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => openQuickAction(row, 'SET')}
                        className="p-1.5 flex items-center justify-center text-amber-600 hover:bg-amber-50 border border-amber-200 rounded transition-colors"
                        title="Adjust / Count"
                    >
                        <ArrowRightLeft className="w-4 h-4" />
                    </button>
                </div>
            ),
            className: 'w-48 text-right'
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inventory Management</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Track stock levels, movements, and perform manual adjustments.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleExport} className="btn-secondary h-10 px-4 text-sm flex items-center gap-2 shadow-sm">
                        <FileDown className="w-4 h-4" /> Export Report
                    </button>
                    <button onClick={() => setIsTransferModalOpen(true)} className="btn-secondary h-10 px-4 text-sm flex items-center gap-2 shadow-sm">
                        <ArrowRightLeft className="w-4 h-4" /> Process Transfer
                    </button>
                    <button onClick={() => { setPreselectedProduct(null); setPreselectedType('ADD'); setIsModalOpen(true); }} className="btn-primary h-10 px-4 text-sm flex items-center gap-2 shadow-sm">
                        <Package className="w-4 h-4" /> Stock Adjustment
                    </button>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Package className="w-6 h-6" /></div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total Unique SKUs</p>
                        <p className="text-2xl font-bold text-slate-900">{inventory.length}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-lg"><TrendingDown className="w-6 h-6" /></div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Low Stock Items</p>
                        <p className="text-2xl font-bold text-slate-900">{inventory.filter(i => (i.quantity || 0) <= (i.min_stock_level || 5)).length}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp className="w-6 h-6" /></div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total Stock Units</p>
                        <p className="text-2xl font-bold text-slate-900">{inventory.reduce((acc, curr) => acc + (curr.quantity || 0), 0).toLocaleString()}</p>
                    </div>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={inventory}
                loading={loading}
                onSearch={setSearchQuery}
                searchPlaceholder="Search inventory by SKU or product name..."
                actions={false}
                emptyMessage={searchQuery ? "No inventory items found matching your search." : "No inventory data available."}
            />

            {/* Modals */}
            <StockAdjustmentModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setPreselectedProduct(null); }}
                onRefresh={fetchInventory}
                products={inventory}
                preselectedProduct={preselectedProduct}
                preselectedType={preselectedType}
            />

            <BranchTransfersModal
                isOpen={isTransferModalOpen}
                onClose={() => setIsTransferModalOpen(false)}
                onRefresh={fetchInventory}
            />
        </div>
    );
};

export default Inventory;
