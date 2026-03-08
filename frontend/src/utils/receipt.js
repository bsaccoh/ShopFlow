import html2pdf from 'html2pdf.js';

export const formatCurrency = (v) => `LE ${parseFloat(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatDate = (d) => {
    const dt = new Date(d || Date.now());
    return dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const generateReceiptHTML = (sale, storeName) => {
    const items = sale.items || [];
    const subtotal = items.reduce((sum, i) => sum + (i.quantity * parseFloat(i.unit_price || 0)), 0);
    const discount = parseFloat(sale.discount_amount || sale.discount || 0);
    const tax = parseFloat(sale.tax_amount || 0);
    const total = parseFloat(sale.total_amount) || (subtotal - discount + tax);
    const itemNames = items.map(i => `${i.product_name || i.name} (x${i.quantity})`).join(', ');
    const qrText = encodeURIComponent(`Shop: ${storeName}\nSale: ${sale.sale_number || sale.id}\nCustomer: ${sale.customer_name || 'Guest'}\nItems: ${itemNames}\nTotal: ${total}`);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrText}`;

    const itemRows = items.map(item => {
        const qty = item.quantity;
        const price = parseFloat(item.unit_price || 0);
        const lineTotal = qty * price;
        return `
            <tr>
                <td style="padding: 3px 2px; word-break: break-word;">${item.product_name || item.name}</td>
                <td style="padding: 3px 2px; text-align: center;">${qty}</td>
                <td style="padding: 3px 2px; text-align: right;">${formatCurrency(price)}</td>
                <td style="padding: 3px 2px; text-align: right; font-weight: bold;">${formatCurrency(lineTotal)}</td>
            </tr>`;
    }).join('');

    const paymentsRows = (sale.payments || []).map(p => `
        <tr>
            <td style="padding: 2px 0;">${p.method || p.payment_method}</td>
            <td style="padding: 2px 0; text-align: right;">${formatCurrency(p.amount)}</td>
        </tr>
    `).join('');

    return `
        <div style="font-family: 'Courier New', monospace; font-size: 11px; width: 280px; margin: 0 auto; padding: 8px; color: #000; line-height: 1.4; border: 1px solid #eee; background: #fff;">
            <!-- Store Header -->
            <div style="text-align: center; padding-bottom: 8px; border-bottom: 1px dashed #333; margin-bottom: 8px;">
                <div style="font-size: 16px; font-weight: bold; margin-bottom: 4px;">${storeName}</div>
                <div style="font-size: 10px; color: #555;">Thank you for your purchase!</div>
            </div>

            <!-- Sale Info -->
            <table style="width: 100%; font-size: 11px; margin-bottom: 8px; border-collapse: collapse;">
                <tr>
                    <td style="color: #555; padding: 1px 0;">Receipt #:</td>
                    <td style="text-align: right; font-weight: bold; padding: 1px 0;">${sale.sale_number || '#' + sale.id}</td>
                </tr>
                <tr>
                    <td style="color: #555; padding: 1px 0;">Date:</td>
                    <td style="text-align: right; padding: 1px 0;">${formatDate(sale.created_at)}</td>
                </tr>
                <tr>
                    <td style="color: #555; padding: 1px 0;">Cashier:</td>
                    <td style="text-align: right; padding: 1px 0;">${sale.cashier_name || sale.user_name || ((sale.first_name || '') + ' ' + (sale.last_name || '')).trim() || 'Staff'}</td>
                </tr>
            </table>

            ${sale.customer_name ? `
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px; margin-bottom: 8px;">
                <div style="font-size: 8px; text-transform: uppercase; font-weight: bold; color: #94a3b8;">Customer</div>
                <div style="font-size: 11px; font-weight: bold; color: #1e293b;">${sale.customer_name}</div>
            </div>` : ''}

            <!-- Items Table -->
            <table style="width: 100%; font-size: 11px; border-collapse: collapse; border-top: 1px dashed #333; border-bottom: 1px dashed #333;">
                <thead>
                    <tr style="font-size: 9px; color: #555; text-transform: uppercase; font-weight: bold;">
                        <th style="text-align: left; padding: 5px 2px;">Item</th>
                        <th style="text-align: center; padding: 5px 2px; width: 28px;">Qty</th>
                        <th style="text-align: right; padding: 5px 2px; width: 60px;">Price</th>
                        <th style="text-align: right; padding: 5px 2px; width: 65px;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemRows}
                </tbody>
            </table>

            <!-- Totals -->
            <table style="width: 100%; font-size: 11px; border-collapse: collapse; padding-top: 6px; border-bottom: 1px dashed #333; margin-bottom: 6px;">
                <tr>
                    <td style="color: #555; padding: 3px 0;">Subtotal:</td>
                    <td style="text-align: right; padding: 3px 0;">${formatCurrency(subtotal)}</td>
                </tr>
                ${discount > 0 ? `
                <tr>
                    <td style="padding: 3px 0;">Discount:</td>
                    <td style="text-align: right; padding: 3px 0;">-${formatCurrency(discount)}</td>
                </tr>` : ''}
                ${tax > 0 ? `
                <tr>
                    <td style="color: #555; padding: 3px 0;">Tax:</td>
                    <td style="text-align: right; padding: 3px 0;">${formatCurrency(tax)}</td>
                </tr>` : ''}
                <tr style="border-top: 1px solid #ddd text-align: left;">
                    <td style="font-size: 13px; font-weight: bold; padding: 6px 0 3px;">TOTAL:</td>
                    <td style="font-size: 13px; font-weight: bold; text-align: right; padding: 6px 0 3px;">${formatCurrency(total)}</td>
                </tr>
            </table>

            <!-- Payment -->
            ${paymentsRows ? `
            <div style="margin: 6px 0;">
                <div style="font-size: 9px; font-weight: bold; color: #555; text-transform: uppercase; margin-bottom: 4px;">Payment</div>
                <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
                    ${paymentsRows}
                </table>
            </div>` : ''}

            <!-- QR Code -->
            <div style="text-align: center; margin: 12px 0; padding: 8px 0; border-top: 1px dashed #333; border-bottom: 1px dashed #333;">
                <img src="${qrUrl}" style="width: 100px; height: 100px;" alt="QR Code" />
                <div style="font-size: 8px; color: #777; margin-top: 4px;">Scan for sale details</div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 10px; font-size: 10px; color: #777;">
                <div>Thank you for shopping with us!</div>
                <div style="font-size: 9px; margin-top: 4px; color: #999;">Powered by ShopFlow</div>
            </div>
        </div>
    `;
};

export const downloadReceiptPDF = (sale, storeName) => {
    const htmlContent = generateReceiptHTML(sale, storeName);
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = htmlContent;

    const opt = {
        margin: [0.1, 0.1, 0.1, 0.1],
        filename: `Receipt_${sale.sale_number || sale.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, windowWidth: 320, useCORS: true },
        jsPDF: { unit: 'in', format: [3.4, 8], orientation: 'portrait' }
    };

    html2pdf().set(opt).from(tempContainer).save();
};

export const printReceiptHTML = (sale, storeName) => {
    const htmlContent = generateReceiptHTML(sale, storeName);
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write(`
    < html >
            <head>
                <title>Receipt #${sale.sale_number || sale.id}</title>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                </style>
            </head>
            <body>${htmlContent}</body>
            <script>window.onload = function() { window.print(); window.close(); }</script>
        </html >
    `);
    printWindow.document.close();
};
