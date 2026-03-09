import React, { useState, useEffect, useRef, useMemo } from 'react';
import { posApi } from '../services/api';
import { Printer, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const SaleDetailsModal = ({ isOpen, onClose, saleId }) => {
    const [saleDetails, setSaleDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const receiptRef = useRef(null);

    useEffect(() => {
        if (isOpen && saleId) {
            fetchDetails();
        } else {
            setSaleDetails(null);
        }
    }, [isOpen, saleId]);

    const fetchDetails = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await posApi.getSaleDetails(saleId);
            if (res.success) {
                setSaleDetails(res.data);
            }
        } catch (err) {
            setError('Failed to fetch sale details');
        } finally {
            setLoading(false);
        }
    };

    const qrData = useMemo(() => {
        if (!saleDetails) return '';
        const { sale, items } = saleDetails;
        const itemNames = items.map(i => `${i.product_name} (x${i.quantity})`).join(', ');
        return `Shop: ${sale.tenant_name || 'ShopFlow'}\nSale: ${sale.sale_number}\nCustomer: ${sale.customer_name || 'Guest'}\nItems: ${itemNames}\nTotal: ${sale.total_amount}`;
    }, [saleDetails]);

    const handlePrint = () => {
        const content = receiptRef.current.innerHTML;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Receipt</title>
                    <style>
                        body { font-family: monospace; font-size: 14px; margin: 0; padding: 20px; text-align: center; }
                        h2 { margin: 5px 0; font-size: 18px; }
                        p { margin: 3px 0; }
                        .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
                        .item { display: flex; justify-content: space-between; margin: 5px 0; text-align: left; }
                        .total { display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; margin-top: 10px; }
                        .qr-code { margin: 20px auto; opacity: 0.8; }
                    </style>
                </head>
                <body>
                    ${content}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h2 className="text-xl font-bold text-slate-800">Sale Receipt</h2>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 bg-slate-100/50 flex justify-center">
                    {loading ? (
                        <div className="text-center text-slate-500 py-10 w-full animate-pulse">Loading receipt details...</div>
                    ) : error ? (
                        <div className="p-3 bg-red-100 text-red-700 rounded-lg w-full text-center">{error}</div>
                    ) : saleDetails ? (
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 w-full max-w-sm relative">
                            {/* Decorative Receipt Edge */}
                            <div className="absolute top-0 left-0 right-0 h-3 bg-[radial-gradient(circle,transparent_4px,#fff_4px)] bg-[length:12px_12px] -mt-1.5 opacity-50"></div>

                            <div ref={receiptRef}>
                                <div className="text-center mb-6">
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                                        {saleDetails.sale.tenant_name || 'ShopFlow Retail'}
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-1 font-mono">Receipt #{saleDetails.sale.sale_number}</p>
                                    <p className="text-sm text-slate-500">{new Date(saleDetails.sale.created_at).toLocaleString()}</p>
                                    <div className="divider mt-4 border-b-2 border-dashed border-slate-200"></div>
                                </div>

                                {saleDetails.sale.customer_name && (
                                    <div className="bg-slate-50 border border-slate-200 rounded-md p-2 mb-4">
                                        <div className="text-[9px] uppercase font-bold text-slate-400">Customer</div>
                                        <div className="text-sm font-bold text-slate-900">{saleDetails.sale.customer_name}</div>
                                    </div>
                                )}

                                {/* Items Header */}
                                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                                    <span>Item</span>
                                    <span>Amount</span>
                                </div>

                                <div className="space-y-4 mb-6">
                                    {saleDetails.items.map((item, idx) => (
                                        <div key={idx} className="item flex justify-between text-sm group">
                                            <div className="flex-1 text-left pr-4">
                                                <div className="font-bold text-slate-800 leading-snug">{item.product_name}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">
                                                    Qty: {item.quantity} × LE {parseFloat(item.unit_price).toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="font-bold text-slate-900 text-right">
                                                LE {(item.quantity * parseFloat(item.unit_price)).toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="divider border-b-2 border-dashed border-slate-200 mb-4"></div>

                                <div className="space-y-2 mb-6 px-1">
                                    <div className="flex justify-between text-sm text-slate-500 font-medium">
                                        <span>Subtotal</span>
                                        <span>LE {parseFloat(saleDetails.sale.subtotal || saleDetails.sale.total_amount).toLocaleString()}</span>
                                    </div>
                                    <div className="total flex justify-between text-xl font-black text-slate-900 pt-2 border-t border-slate-100">
                                        <span>TOTAL</span>
                                        <span>LE {parseFloat(saleDetails.sale.total_amount).toLocaleString()}</span>
                                    </div>
                                    {saleDetails.sale.payment_status && (saleDetails.sale.payment_status === 'CREDIT' || saleDetails.sale.payment_status === 'PARTIAL_CREDIT') && (
                                        <div className="mt-3 space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Amount Paid</span>
                                                <span className="font-bold text-emerald-600">LE {parseFloat(saleDetails.sale.paid_amount || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500 font-bold">BALANCE DUE</span>
                                                <span className="font-bold text-rose-600">LE {(parseFloat(saleDetails.sale.total_amount) - parseFloat(saleDetails.sale.paid_amount || 0)).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 bg-slate-50 rounded-lg space-y-2 text-sm text-slate-600 border border-slate-100">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-slate-500">Status</span>
                                        <span className={`font-bold ${saleDetails.sale.payment_status === 'CREDIT' || saleDetails.sale.payment_status === 'PARTIAL_CREDIT' ? 'text-rose-600' : 'text-slate-800'}`}>
                                            {saleDetails.sale.payment_status}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-slate-500">Cashier</span>
                                        <span className="font-bold text-slate-800">
                                            {saleDetails.sale.cashier_first} {saleDetails.sale.cashier_last}
                                        </span>
                                    </div>
                                </div>

                                {/* QR Code */}
                                <div className="qr-code flex flex-col items-center justify-center my-6 py-4 border-t border-b border-dashed border-slate-200">
                                    <QRCodeSVG value={qrData} size={100} level="L" includeMargin={true} />
                                    <p className="text-[8px] text-slate-400 mt-2 font-sans">Scan for sale details</p>
                                </div>

                                <div className="mt-8 text-center text-xs font-bold tracking-widest uppercase text-slate-400">
                                    Thank you for your business!
                                </div>
                            </div>

                            {/* Decorative Receipt Edge Bottom */}
                            <div className="absolute bottom-0 left-0 right-0 h-3 bg-[radial-gradient(circle,transparent_4px,#fff_4px)] bg-[length:12px_12px] -mb-1.5 opacity-50 rotate-180"></div>
                        </div>
                    ) : null}
                </div>

                <div className="p-4 border-t border-slate-200 flex justify-between gap-3 bg-white">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
                        Close
                    </button>
                    <button
                        type="button"
                        onClick={handlePrint}
                        disabled={loading || !saleDetails}
                        className="btn-primary px-6 py-2 text-sm flex items-center gap-2"
                    >
                        <Printer className="w-4 h-4" /> Print Receipt
                    </button>
                </div>
            </div >
        </div >
    );
};

export default SaleDetailsModal;
