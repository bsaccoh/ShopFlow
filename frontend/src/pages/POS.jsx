import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ScanLine, CreditCard, Trash2, Plus, Minus, ShoppingCart, Banknote, Wallet, Phone, X } from 'lucide-react';
import { posApi, categoryApi, customerApi } from '../services/api';
import ReceiptModal from '../components/ReceiptModal';
import { useAuth } from '../context/AuthContext';

const POS = () => {
    const { user } = useAuth();
    const [barcode, setBarcode] = useState('');
    const [cart, setCart] = useState([]);

    // Product & Category State
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerSearch, setCustomerSearch] = useState('');

    // Checkout Modal State
    const [showCheckout, setShowCheckout] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [amountTendered, setAmountTendered] = useState('');
    const [processingPayment, setProcessingPayment] = useState(false);

    const [showReceipt, setShowReceipt] = useState(false);
    const [receiptData, setReceiptData] = useState(null);
    const barcodeInputRef = useRef(null);

    // Fetch initial data
    useEffect(() => {
        const fetchInitialData = async () => {
            setLoadingProducts(true);
            try {
                const [prodRes, catRes, custRes] = await Promise.all([
                    posApi.getProducts(''),
                    categoryApi.getCategories(),
                    customerApi.getCustomers('')
                ]);

                if (prodRes.success) setProducts(prodRes.data);
                if (catRes.success) setCategories(catRes.data);
                if (custRes.success) setCustomers(custRes.data);
            } catch (err) {
                console.error('Failed to fetch POS data', err);
            } finally {
                setLoadingProducts(false);
            }
        };

        fetchInitialData();
    }, []);

    // Keep focus on scanner if no modal is open
    useEffect(() => {
        if (!showReceipt && !showCheckout && barcodeInputRef.current) {
            barcodeInputRef.current.focus();
        }
    }, [showReceipt, showCheckout]);

    // Handle Search Filter (local to avoid constant API calls if we have all products)
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesCategory = selectedCategory === 'ALL' || p.category_id === parseInt(selectedCategory);
            return matchesSearch && matchesCategory;
        });
    }, [products, searchQuery, selectedCategory]);

    // Generate Initials for Product Card Watermark
    const getInitials = (name) => {
        if (!name) return 'PR';
        const words = name.trim().split(' ');
        if (words.length >= 2) {
            return (words[0][0] + words[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const toMoneyNumber = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    };

    const formatLE = (value) =>
        `LE ${toMoneyNumber(value).toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        })}`;

    const handleBarcodeScan = async (e) => {
        e.preventDefault();
        if (!barcode.trim()) return;

        // Try local lookup first for speed
        const localProduct = products.find(p => p.sku === barcode || p.barcode === barcode);

        if (localProduct) {
            addToCart(localProduct);
            setBarcode(''); // Clear input
            return;
        }

        // Fallback to API
        try {
            const res = await posApi.lookupBarcode(barcode);
            if (res.success && res.data) {
                addToCart(res.data);
            } else {
                alert('Product not found');
            }
        } catch (err) {
            console.error('Barcode lookup failed');
        } finally {
            setBarcode('');
        }
    };

    const addToCart = (product) => {
        setCart(prev => {
            const existingRow = prev.find(item => item.product_id === product.id);
            if (existingRow) {
                if (existingRow.quantity >= product.quantity) {
                    alert(`Not enough stock. Only ${product.quantity} available.`);
                    return prev;
                }
                return prev.map(item =>
                    item.product_id === product.id
                        ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.unit_price }
                        : item
                );
            }

            if (product.quantity <= 0) {
                alert('Product is out of stock');
                return prev;
            }

            return [...prev, {
                product_id: product.id,
                name: product.name,
                sku: product.sku,
                unit_price: toMoneyNumber(product.selling_price),
                quantity: 1,
                max_quantity: product.quantity,
                subtotal: toMoneyNumber(product.selling_price)
            }];
        });
    };

    const updateQuantity = (productId, delta) => {
        setCart(prev => prev.map(item => {
            if (item.product_id === productId) {
                const newQty = item.quantity + delta;
                if (newQty < 1) return item;
                if (newQty > item.max_quantity) {
                    alert(`Not enough stock. Only ${item.max_quantity} available.`);
                    return item;
                }
                return { ...item, quantity: newQty, subtotal: newQty * toMoneyNumber(item.unit_price) };
            }
            return item;
        }));
    };

    const removeFromCart = (productId) => {
        setCart(prev => prev.filter(item => item.product_id !== productId));
    };

    const clearCart = () => {
        if (window.confirm('Are you sure you want to clear the current sale?')) {
            setCart([]);
        }
    };

    const subtotal = cart.reduce((sum, item) => sum + toMoneyNumber(item.subtotal), 0);

    const openCheckout = () => {
        if (cart.length === 0) return;
        setPaymentMethod('CASH');
        setAmountTendered('');
        setShowCheckout(true);
    };

    const completeSale = async () => {
        if (cart.length === 0) return;

        let paymentAmount = subtotal;
        if (paymentMethod === 'CASH') {
            const tendered = parseFloat(amountTendered || 0);
            if (tendered < subtotal) {
                alert('Amount tendered is less than the total.');
                return;
            }
        }

        setProcessingPayment(true);
        try {
            const payload = {
                items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity, discount_type: 'NONE', discount_value: 0 })),
                customer_id: selectedCustomer?.id || null,
                payment_methods: [{ method: paymentMethod, amount: paymentAmount }],
                status: 'COMPLETED'
            };

            const res = await posApi.processSale(payload);

            if (res.success) {
                setReceiptData({
                    ...res.data,
                    sale_number: res.data.saleNumber,
                    total_amount: subtotal,
                    items: cart.map(i => ({
                        product_name: i.name,
                        quantity: i.quantity,
                        unit_price: i.unit_price
                    })),
                    payments: [{ method: paymentMethod, amount: paymentAmount }],
                    customer_id: selectedCustomer?.id,
                    customer_name: selectedCustomer?.name,
                    customer_phone: selectedCustomer?.phone,
                    customer_address: selectedCustomer?.address,
                    created_at: new Date().toISOString(),
                    amount_tendered: paymentMethod === 'CASH' ? parseFloat(amountTendered) : paymentAmount,
                    change_due: paymentMethod === 'CASH' ? parseFloat(amountTendered) - subtotal : 0
                });
                setShowCheckout(false);
                setShowReceipt(true);
                setCart([]);
                setSelectedCustomer(null);
                setCustomerSearch('');

                // Refresh product stock in the background
                posApi.getProducts('').then(r => { if (r.success) setProducts(r.data); });
            }
        } catch (err) {
            console.error('Checkout error:', err);
            alert(err.error || err.message || 'Checkout failed');
        } finally {
            setProcessingPayment(false);
        }
    };

    const changeDue = paymentMethod === 'CASH' && amountTendered
        ? Math.max(0, parseFloat(amountTendered) - subtotal)
        : 0;

    return (
        <div className="flex h-[calc(100vh-4rem)] -m-4 bg-slate-50 relative overflow-hidden font-sans">
            {/* Left side: Products (70%) */}
            <div className="flex-[7] flex flex-col bg-slate-50 border-r border-slate-200">
                {/* Search & Scan Header */}
                <div className="p-4 bg-white border-b border-slate-200 flex gap-4">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-md bg-slate-50 focus:bg-white text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 transition-colors"
                            placeholder="Search products by name or SKU..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <form onSubmit={handleBarcodeScan} className="w-64">
                        <input
                            ref={barcodeInputRef}
                            type="text"
                            className="w-full px-4 py-2 border border-slate-200 rounded-md bg-slate-50 focus:bg-white text-sm text-center focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 transition-colors placeholder:text-slate-400"
                            placeholder="Scan Barcode"
                            value={barcode}
                            onChange={e => setBarcode(e.target.value)}
                        />
                    </form>
                </div>

                {/* Category Pills */}
                <div className="px-4 py-3 bg-white border-b border-slate-200 flex gap-2 overflow-x-auto custom-scrollbar whitespace-nowrap">
                    <button
                        onClick={() => setSelectedCategory('ALL')}
                        className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedCategory === 'ALL'
                            ? 'bg-green-600 text-white border border-green-600'
                            : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                            }`}
                    >
                        All
                    </button>
                    {categories.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setSelectedCategory(c.id.toString())}
                            className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedCategory === c.id.toString()
                                ? 'bg-green-600 text-white border border-green-600'
                                : 'bg-white text-slate-700 border border-slate-400 hover:bg-slate-50 hover:border-slate-500'
                                }`}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {loadingProducts ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-300"></div>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <p>No products found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                            {filteredProducts.map(product => {
                                const isOutOfStock = product.quantity <= 0;
                                return (
                                    <div
                                        key={product.id}
                                        onClick={() => !isOutOfStock && addToCart(product)}
                                        className={`rounded-xl border border-slate-200 overflow-hidden flex flex-col h-[200px] transition-all bg-white
                                            ${isOutOfStock ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer hover:shadow-md hover:border-slate-300 active:scale-[0.98]'}`}
                                    >
                                        {/* Top Grey Area with Watermark & Badge */}
                                        <div className="bg-slate-50 h-[60%] relative flex items-center justify-center border-b border-slate-100">
                                            <div className="absolute top-2 right-2 bg-white px-2 py-0.5 rounded text-xs font-bold text-slate-700 border border-slate-200 shadow-sm">
                                                Qty: {product.quantity}
                                            </div>
                                            <span className="text-5xl font-black text-slate-200 tracking-tighter w-full text-center truncate px-2 select-none">
                                                {getInitials(product.name)}
                                            </span>
                                        </div>

                                        {/* Bottom White Area with Details */}
                                        <div className="h-[40%] p-3 flex flex-col justify-between">
                                            <div>
                                                <p className="text-xs font-bold text-slate-800 leading-tight line-clamp-1">{product.name}</p>
                                                <p className="text-[10px] text-slate-500 mt-0.5 truncate">{product.sku || 'No SKU'}</p>
                                            </div>
                                            <div className="font-bold text-slate-900 text-sm mt-1">
                                                LE {parseFloat(product.selling_price).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Right side: Cart (30%) */}
            <div className="flex-[3] flex flex-col bg-white w-full max-w-[400px]">
                {/* Cart Header */}
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                        <ShoppingCart className="w-5 h-5 text-green-600" />
                        Current Sale
                    </div>
                    {cart.length > 0 && (
                        <button onClick={clearCart} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Clear Sale">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Customer Selector */}
                <div className="p-3 bg-white border-b border-slate-200">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Customer</label>
                        {selectedCustomer ? (
                            <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                                <span className="text-sm font-semibold text-green-700">{selectedCustomer.name}</span>
                                <button onClick={() => setSelectedCustomer(null)} className="text-green-400 hover:text-green-600">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <select
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
                                onChange={(e) => {
                                    const cust = customers.find(c => String(c.id) === String(e.target.value));
                                    if (cust) setSelectedCustomer(cust);
                                }}
                                defaultValue=""
                            >
                                <option value="" disabled>Select Customer (Optional)</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {/* Cart Items List */}
                <div className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300">
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {cart.map(item => (
                                <div key={item.product_id} className="p-3 hover:bg-slate-50 border-b border-slate-100 group flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-semibold text-slate-900 truncate">{item.name}</h3>
                                        <div className="flex items-center justify-between mt-1">
                                            <div className="flex items-center bg-white border border-slate-200 rounded text-slate-700 overflow-hidden shadow-sm">
                                                <button onClick={() => updateQuantity(item.product_id, -1)} className="px-2 py-1 hover:bg-slate-100 transition-colors">
                                                    <Minus className="w-3 h-3" />
                                                </button>
                                                <span className="w-8 text-center text-xs font-bold pointer-events-none border-x border-slate-200 py-1">
                                                    {item.quantity}
                                                </span>
                                                <button onClick={() => updateQuantity(item.product_id, 1)} className="px-2 py-1 hover:bg-slate-100 transition-colors">
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <span className="text-slate-500 text-xs text-right ml-2 line-clamp-1">
                                                @ {toMoneyNumber(item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-1 shrink-0">
                                        <span className="font-bold text-slate-900 text-sm">
                                            {formatLE(item.quantity * toMoneyNumber(item.unit_price))}
                                        </span>
                                        <button onClick={() => removeFromCart(item.product_id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Cart Footer / Totals */}
                <div className="bg-white border-t border-slate-200 p-4">
                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between items-center text-sm text-slate-500">
                            <span>Subtotal</span>
                            <span className="font-medium tabular-nums">{formatLE(subtotal)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-slate-500 pb-2 border-b border-slate-100">
                            <span>Tax (0%)</span>
                            <span className="font-medium tabular-nums">{formatLE(0)}</span>
                        </div>
                        <div className="flex justify-between items-center text-lg font-black text-slate-900 pt-1">
                            <span>Total</span>
                            <span className="tabular-nums">{formatLE(subtotal)}</span>
                        </div>
                    </div>

                    <button
                        onClick={openCheckout}
                        disabled={cart.length === 0}
                        className={`w-full py-4 rounded font-bold text-lg transition-all ${cart.length > 0
                            ? 'bg-green-500 hover:bg-green-600 text-white shadow-md'
                            : 'bg-green-300 text-white/80 cursor-not-allowed'
                            }`}
                    >
                        Checkout
                    </button>
                </div>
            </div>

            {/* Checkout Modal */}
            {showCheckout && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !processingPayment && setShowCheckout(false)} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Complete Payment</h2>
                                <p className="text-sm text-slate-500 mt-0.5">Select payment method to finish</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-0.5">Total Due</p>
                                <p className="text-2xl font-black text-green-600 leading-none">
                                    LE {subtotal.toLocaleString()}
                                </p>
                            </div>
                        </div>

                        {/* Body - Payment Method Tabs */}
                        <div className="p-6">
                            <div className="grid grid-cols-4 gap-2 mb-6 p-1 bg-slate-100 rounded-lg">
                                {[
                                    { id: 'CASH', label: 'Cash', icon: Banknote },
                                    { id: 'CARD', label: 'Card', icon: CreditCard },
                                    { id: 'MOBILE_MONEY', label: 'Orange', icon: Phone },
                                    { id: 'CREDIT', label: 'Credit', icon: Wallet },
                                ].map((method) => (
                                    <button
                                        key={method.id}
                                        onClick={() => setPaymentMethod(method.id)}
                                        className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-md font-medium text-xs transition-colors duration-200 ${paymentMethod === method.id
                                            ? 'bg-white text-green-600 shadow-sm ring-1 ring-slate-200/50'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                                            }`}
                                    >
                                        <method.icon className={`w-5 h-5 ${paymentMethod === method.id ? 'text-green-500' : 'text-slate-400'}`} />
                                        {method.label}
                                    </button>
                                ))}
                            </div>

                            {/* Dynamic Input Area */}
                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 min-h-[140px] flex flex-col justify-center">
                                {paymentMethod === 'CASH' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Amount Tendered</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">LE</span>
                                                <input
                                                    type="number"
                                                    className="w-full px-4 py-3 pl-12 border border-slate-200 rounded-lg bg-white text-xl font-bold focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                                    value={amountTendered}
                                                    onChange={(e) => setAmountTendered(e.target.value)}
                                                    placeholder={subtotal.toString()}
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center px-2">
                                            <span className="text-slate-600 font-medium">Change Due:</span>
                                            <span className={`text-xl font-bold ${changeDue > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                LE {changeDue.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {paymentMethod === 'CARD' && (
                                    <div className="text-center animate-in fade-in slide-in-from-bottom-2">
                                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mx-auto mb-3 border border-slate-200">
                                            <CreditCard className="w-6 h-6 text-green-500" />
                                        </div>
                                        <p className="text-slate-700 font-medium">Process payment via card terminal</p>
                                        <p className="text-sm text-slate-500 mt-1">Then click confirm below to complete sale</p>
                                    </div>
                                )}

                                {paymentMethod === 'MOBILE_MONEY' && (
                                    <div className="text-center animate-in fade-in slide-in-from-bottom-2">
                                        <div className="w-12 h-12 bg-[#FF7900] rounded-full flex items-center justify-center shadow-sm mx-auto mb-3">
                                            <Phone className="w-6 h-6 text-white" />
                                        </div>
                                        <p className="text-slate-700 font-medium">Process via Orange Money terminal</p>
                                        <p className="text-sm text-slate-500 mt-1">Direct integration coming soon</p>
                                    </div>
                                )}

                                {paymentMethod === 'CREDIT' && (
                                    <div className="text-center animate-in fade-in slide-in-from-bottom-2">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm mx-auto mb-3 border ${selectedCustomer ? 'bg-amber-100 border-amber-200' : 'bg-rose-100 border-rose-200'}`}>
                                            <Wallet className={`w-6 h-6 ${selectedCustomer ? 'text-amber-600' : 'text-rose-600'}`} />
                                        </div>
                                        <p className="text-slate-700 font-medium">Issue order as Customer Credit</p>
                                        <p className={`text-sm mt-1 font-semibold ${selectedCustomer ? 'text-emerald-600' : 'text-rose-600 pulse'}`}>
                                            {selectedCustomer
                                                ? `Customer: ${selectedCustomer.name}`
                                                : '⚠️ Please select a customer first'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="px-6 py-4 bg-white border-t border-slate-100 flex gap-3">
                            <button
                                onClick={() => setShowCheckout(false)}
                                disabled={processingPayment}
                                className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={completeSale}
                                disabled={processingPayment ||
                                    (paymentMethod === 'CASH' && amountTendered && parseFloat(amountTendered) < subtotal) ||
                                    (paymentMethod === 'CREDIT' && !selectedCustomer)}
                                className="flex-[2] px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
                            >
                                {processingPayment ? (
                                    <>
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        Confirm Payment — LE {subtotal.toLocaleString()}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Receipt Modal */}
            <ReceiptModal
                isOpen={showReceipt}
                onClose={() => setShowReceipt(false)}
                sale={receiptData}
                storeName={user?.tenant_name || 'ShopFlow Store'}
            />
        </div>
    );
};

export default POS;

