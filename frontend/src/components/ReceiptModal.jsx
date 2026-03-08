import React, { useRef, useMemo } from 'react';
import { X, Printer, Download } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { QRCodeSVG } from 'qrcode.react';

const ReceiptModal = ({ isOpen, onClose, sale, storeName = 'ShopFlow Store' }) => {
    const receiptRef = useRef(null);

    const qrData = useMemo(() => {
        if (!sale) return '';
        const items = sale.items || [];
        const subtotal = items.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0);
        const discount = sale.discount_amount || sale.discount || 0;
        const tax = sale.tax_amount || 0;
        const total = sale.total_amount || (subtotal - discount + tax);
        const itemNames = items.map(i => `${i.product_name || i.name} (x${i.quantity})`).join(', ');
        return `Shop: ${storeName}\nSale: ${sale.sale_number || sale.id}\nCustomer: ${sale.customer_name || 'Guest'}\nItems: ${itemNames}\nTotal: ${total}`;
    }, [sale, storeName]);

    if (!isOpen || !sale) return null;

    const items = sale.items || [];
    const subtotal = items.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0);
    const discount = sale.discount_amount || sale.discount || 0;
    const tax = sale.tax_amount || 0;
    const total = sale.total_amount || (subtotal - discount + tax);

    const handlePrint = () => {
        const content = receiptRef.current;
        if (!content) return;

        const printWindow = window.open('', '_blank', 'width=400,height=600');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Receipt #${sale.sale_number || sale.id}</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; width: 300px; margin: 0 auto; }
                        .header { text-align: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px dashed #333; }
                        .header h2 { font-size: 16px; margin-bottom: 4px; }
                        .header p { font-size: 11px; color: #555; }
                        .info { margin: 8px 0; font-size: 11px; }
                        .info div { display: flex; justify-content: space-between; margin-bottom: 2px; }
                        .items { border-top: 1px dashed #333; border-bottom: 1px dashed #333; padding: 8px 0; margin: 8px 0; box-sizing: border-box; }
                        .item { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px; }
                        .item-name { flex: 1; padding-right: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 120px; }
                        .item-qty { width: 30px; text-align: center; }
                        .item-price { width: 60px; text-align: right; }
                        .totals { padding: 8px 0; border-bottom: 1px dashed #333; }
                        .totals div { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 12px; }
                        .totals .grand-total { font-weight: bold; font-size: 14px; margin-top: 4px; }
                        .payment { margin: 8px 0; font-size: 11px; }
                        .footer { text-align: center; margin-top: 12px; padding-top: 8px; border-top: 1px dashed #333; font-size: 10px; color: #777; }
                        @media print { body { width: 100%; box-sizing: border-box; } }
                    </style>
                </head>
                <body>${content.innerHTML}</body>
                <script>window.onload = function() { window.print(); window.close(); }</script>
            </html>
        `);
        printWindow.document.close();
    };

    const handleDownload = () => {
        const content = receiptRef.current;
        if (!content) return;

        const opt = {
            margin: [0.1, 0.1, 0.1, 0.1],
            filename: `Receipt_${sale.sale_number || sale.id}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, windowWidth: 320, useCORS: true },
            jsPDF: { unit: 'in', format: [3.4, 6], orientation: 'portrait' }
        };

        // We wrap the content in a temporary div to apply print styles for PDF generation
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = `
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; width: 300px; max-width: 100%; margin: 0 auto; line-height: 1.4; color: #000; box-sizing: border-box; }
                .header { text-align: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px dashed #333; }
                .header h2 { font-size: 16px; margin-bottom: 4px; }
                .header p { font-size: 11px; color: #555; }
                .info { margin: 8px 0; font-size: 11px; }
                .info div { display: flex; justify-content: space-between; margin-bottom: 2px; }
                .items { border-top: 1px dashed #333; border-bottom: 1px dashed #333; padding: 8px 0; margin: 8px 0; box-sizing: border-box;}
                .item { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px; }
                .item-name { flex: 1; padding-right: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 120px; }
                .item-qty { width: 30px; text-align: center; }
                .item-price { width: 60px; text-align: right; }
                .totals { padding: 8px 0; border-bottom: 1px dashed #333; }
                .totals div { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 12px; }
                .totals .grand-total { font-weight: bold; font-size: 14px; margin-top: 4px; }
                .payment { margin: 8px 0; font-size: 11px; }
                .footer { text-align: center; margin-top: 12px; padding-top: 8px; border-top: 1px dashed #333; font-size: 10px; color: #777; }
            </style>
            ${content.innerHTML}
        `;

        html2pdf().set(opt).from(tempContainer).save();
    };

    const formatCurrency = (v) => `LE ${parseFloat(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatDate = (d) => {
        const dt = new Date(d || Date.now());
        return dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm" onClick={onClose} />
                <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
                    {/* Modal Header */}
                    <div className="px-6 pt-5 pb-3 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-900">Sales Receipt</h3>
                        <div className="flex items-center gap-2">
                            <button onClick={handleDownload} className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5 border border-slate-200 bg-white">
                                <Download className="w-3.5 h-3.5" /> Download
                            </button>
                            <button onClick={handlePrint} className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1.5">
                                <Printer className="w-3.5 h-3.5" /> Print
                            </button>
                            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                    </div>

                    {/* Receipt Content */}
                    <div className="p-6 max-h-[70vh] overflow-y-auto">
                        <div ref={receiptRef} className="font-mono text-xs leading-relaxed">
                            {/* Store Header */}
                            <div className="header text-center pb-3 mb-3 border-b border-dashed border-slate-300">
                                <h2 className="text-base font-bold">{storeName}</h2>
                                <p className="text-slate-500 text-[10px] mt-1">Thank you for your purchase!</p>
                            </div>

                            {/* Sale Info */}
                            <div className="info space-y-1 mb-3 text-[11px]">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Receipt #:</span>
                                    <span className="font-semibold">{sale.sale_number || `#${sale.id}`}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Date:</span>
                                    <span>{formatDate(sale.created_at)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Cashier:</span>
                                    <span>{sale.cashier_name || sale.user_name || 'Staff'}</span>
                                </div>
                                {sale.customer_name && (
                                    <div className="bg-slate-50 border border-slate-200 rounded-md p-2 mt-2">
                                        <div className="text-[9px] uppercase font-bold text-slate-400">Customer</div>
                                        <div className="text-sm font-bold text-slate-900">{sale.customer_name}</div>
                                    </div>
                                )}
                            </div>

                            {/* Items Header */}
                            <div className="items border-t border-b border-dashed border-slate-300 py-2 my-2">
                                <div className="flex justify-between font-bold text-[10px] text-slate-500 uppercase mb-2">
                                    <span className="flex-1">Item</span>
                                    <span className="w-10 text-center">Qty</span>
                                    <span className="w-16 text-right">Price</span>
                                    <span className="w-20 text-right">Total</span>
                                </div>
                                {items.map((item, i) => (
                                    <div key={i} className="item flex justify-between mb-1.5">
                                        <span className="flex-1 truncate pr-1">{item.product_name || item.name}</span>
                                        <span className="w-10 text-center">{item.quantity}</span>
                                        <span className="w-16 text-right">{formatCurrency(item.unit_price)}</span>
                                        <span className="w-20 text-right font-medium">{formatCurrency(item.quantity * item.unit_price)}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Totals */}
                            <div className="totals py-2 space-y-1.5 border-b border-dashed border-slate-300">
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-slate-500">Subtotal:</span>
                                    <span>{formatCurrency(subtotal)}</span>
                                </div>
                                {discount > 0 && (
                                    <div className="flex justify-between text-[11px] text-emerald-600">
                                        <span>Discount:</span>
                                        <span>-{formatCurrency(discount)}</span>
                                    </div>
                                )}
                                {tax > 0 && (
                                    <div className="flex justify-between text-[11px]">
                                        <span className="text-slate-500">Tax:</span>
                                        <span>{formatCurrency(tax)}</span>
                                    </div>
                                )}
                                <div className="grand-total flex justify-between text-sm font-bold pt-2 border-t border-slate-200">
                                    <span>TOTAL:</span>
                                    <span>{formatCurrency(total)}</span>
                                </div>
                            </div>

                            {/* Payment Info */}
                            {sale.payments && sale.payments.length > 0 && (
                                <div className="payment py-2 space-y-1">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase">Payment</div>
                                    {sale.payments.map((p, i) => (
                                        <div key={i} className="flex justify-between text-[11px]">
                                            <span>{p.method || p.payment_method}</span>
                                            <span>{formatCurrency(p.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* QR Code */}
                            <div className="qr-code flex flex-col items-center justify-center my-4 py-3 border-t border-b border-dashed border-slate-300">
                                <QRCodeSVG value={qrData} size={100} level="L" includeMargin={true} />
                                <p className="text-[8px] text-slate-400 mt-2 font-sans">Scan for sale details</p>
                            </div>

                            {/* Footer */}
                            <div className="footer text-center mt-2 pt-3">
                                <p className="text-[10px] text-slate-400">Thank you for shopping with us!</p>
                                <p className="text-[9px] text-slate-300 mt-1">Powered by ShopFlow</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReceiptModal;
