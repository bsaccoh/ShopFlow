import React, { useState, useEffect, useRef } from 'react';
import { Package, Plus, FileDown, FileUp, ScanBarcode } from 'lucide-react';
import DataTable from '../components/DataTable';
import ProductFormModal from '../components/ProductFormModal';
import { posApi } from '../services/api';
import { exportToExcel, importFromExcel } from '../utils/excel';

const Products = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchProducts();
    }, [searchQuery]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            // Re-using posApi.getProducts which passes user tenant context natively
            const res = await posApi.getProducts(searchQuery);
            if (res.success) {
                setProducts(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch products', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!products.length) return alert('No data to export.');
        const dataToExport = products.map(p => ({
            ID: p.id,
            Name: p.name,
            SKU: p.sku || '',
            Barcode: p.barcode || '',
            Category: p.category_name || '',
            'Cost Price': p.cost_price,
            'Selling Price': p.selling_price,
            'Current Stock': p.stock_quantity,
            'Min Stock Level': p.min_stock_level
        }));
        exportToExcel(dataToExport, `Products_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleImportClick = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setLoading(true);
            const data = await importFromExcel(file);
            if (!data || data.length === 0) {
                alert('File is empty or invalid.');
                return;
            }

            let successCount = 0;
            // Basic serial creation to not overwhelm backend rate limits/conn limits
            for (const row of data) {
                try {
                    const payload = {
                        name: row.Name || row.name,
                        sku: row.SKU || row.sku || '',
                        barcode: String(row.Barcode || row.barcode || ''),
                        cost_price: parseFloat(row['Cost Price'] || row.cost_price || 0),
                        selling_price: parseFloat(row['Selling Price'] || row.selling_price || 0),
                        current_stock: parseInt(row['Current Stock'] || row.current_stock || 0),
                        min_stock_level: parseInt(row['Min Stock Level'] || row.min_stock_level || 5)
                    };
                    if (payload.name && payload.selling_price) {
                        await posApi.createProduct(payload);
                        successCount++;
                    }
                } catch (err) {
                    console.error('Failed to import row', row, err);
                }
            }
            alert(`Successfully imported ${successCount} products.`);
            fetchProducts();
        } catch (error) {
            alert('Failed to process Excel file.');
        } finally {
            setLoading(false);
            e.target.value = ''; // Reset input
        }
    };

    const columns = [
        {
            header: 'Product Details',
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden shrink-0">
                        {row.image_url && row.image_url.startsWith('http') ? (
                            <img src={row.image_url} alt={row.name} className="h-full w-full object-cover" />
                        ) : (
                            <Package className="h-5 w-5 text-slate-400" />
                        )}
                    </div>
                    <div>
                        <div className="font-medium text-slate-900">{row.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px] border border-slate-200">{row.sku}</span>
                        </div>
                    </div>
                </div>
            )
        },
        {
            header: 'Category',
            accessor: 'category_name',
            render: (row) => (
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">
                    {row.category_name || 'Uncategorized'}
                </span>
            ),
            className: 'w-48'
        },
        {
            header: 'Barcode',
            render: (row) => (
                <div className="flex items-center gap-2 text-slate-600 font-mono text-xs">
                    <ScanBarcode className="w-3.5 h-3.5" />
                    {row.barcode || 'N/A'}
                </div>
            ),
            className: 'w-48'
        },
        {
            header: 'Price',
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-bold text-brand-600">LE {parseFloat(row.selling_price).toLocaleString()}</span>
                    {row.cost_price && <span className="text-xs text-slate-400">Cost: LE {parseFloat(row.cost_price).toLocaleString()}</span>}
                </div>
            ),
            className: 'w-32'
        },
        {
            header: 'Stock',
            render: (row) => {
                const stock = row.stock_quantity || 0;
                const isLow = stock <= (row.min_stock_level || 5);
                return (
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${isLow ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {stock}
                        </span>
                        {isLow && <span className="text-[10px] font-bold text-rose-500 uppercase">Low</span>}
                    </div>
                )
            },
            className: 'w-24'
        }
    ];

    const handleEdit = (product) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    }

    const handleDelete = async (product) => {
        if (window.confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
            try {
                const res = await posApi.deleteProduct(product.id);
                if (res.success) {
                    fetchProducts();
                }
            } catch (err) {
                alert(err.message || 'Failed to delete product');
            }
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Products Catalog</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Manage your products, pricing, and barcodes.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".xlsx, .xls, .csv"
                        className="hidden"
                    />
                    <button onClick={handleImportClick} className="btn-secondary h-10 px-4 text-sm flex items-center gap-2 shadow-sm">
                        <FileUp className="w-4 h-4" /> Import
                    </button>
                    <button onClick={handleExport} className="btn-secondary h-10 px-4 text-sm flex items-center gap-2 shadow-sm">
                        <FileDown className="w-4 h-4" /> Export
                    </button>
                    <button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }} className="btn-primary h-10 px-4 text-sm flex items-center gap-2 shadow-sm">
                        <Plus className="w-4 h-4" /> Add Product
                    </button>
                </div>
            </div>

            {/* Table wrapper */}
            <DataTable
                columns={columns}
                data={products}
                loading={loading}
                onSearch={setSearchQuery}
                searchPlaceholder="Search product name, SKU, or barcode..."
                onEdit={handleEdit}
                onDelete={handleDelete}
                emptyMessage={searchQuery ? "No products found matching your search." : "No products have been added yet."}
            />

            {/* Modals */}
            <ProductFormModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingProduct(null); }}
                onRefresh={fetchProducts}
                editProduct={editingProduct}
            />
        </div>
    );
};

export default Products;
