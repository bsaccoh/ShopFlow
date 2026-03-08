const { query } = require('../../database/connection');
const { sendSuccess, sendError } = require('../../utils/response');

const getTenantDashboardStats = async (req, res) => {
    try {
        const tenantId = req.tenantId;

        const [[{ todays_sales }]] = await query(`
            SELECT COALESCE(SUM(total_amount), 0) as todays_sales 
            FROM sales 
            WHERE tenant_id = ? AND DATE(created_at) = CURRENT_DATE AND status != 'VOIDED'
        `, [tenantId]);

        const [[{ total_orders }]] = await query(`
            SELECT COUNT(id) as total_orders 
            FROM sales 
            WHERE tenant_id = ? AND DATE(created_at) = CURRENT_DATE AND status != 'VOIDED'
        `, [tenantId]);

        const [[{ low_stock }]] = await query(`
            SELECT COUNT(p.id) as low_stock 
            FROM products p
            JOIN inventory i ON p.id = i.product_id
            WHERE p.tenant_id = ? AND i.quantity <= p.min_stock_level
        `, [tenantId]);

        const [[{ active_customers }]] = await query(`
            SELECT COUNT(id) as active_customers 
            FROM customers 
            WHERE tenant_id = ?
        `, [tenantId]);

        const [recentTransactions] = await query(`
            SELECT id, sale_number as reference, total_amount, payment_status, created_at 
            FROM sales 
            WHERE tenant_id = ? AND status != 'VOIDED'
            ORDER BY created_at DESC 
            LIMIT 5
        `, [tenantId]);

        const [[{ total_sales }]] = await query(`
            SELECT COALESCE(SUM(total_amount), 0) as total_sales
            FROM sales
            WHERE tenant_id = ? AND status != 'VOIDED'
        `, [tenantId]);

        const [[{ total_purchases }]] = await query(`
            SELECT COALESCE(SUM(total_amount), 0) as total_purchases
            FROM purchase_orders
            WHERE tenant_id = ? AND status = 'RECEIVED'
        `, [tenantId]);

        const [weeklySalesRows] = await query(`
            SELECT DATE(created_at) as day, COALESCE(SUM(total_amount), 0) as amount
            FROM sales
            WHERE tenant_id = ?
              AND status != 'VOIDED'
              AND DATE(created_at) BETWEEN CURRENT_DATE - INTERVAL '6 days' AND CURRENT_DATE
            GROUP BY DATE(created_at)
            ORDER BY day ASC
        `, [tenantId]);

        const weeklySalesMap = new Map(
            weeklySalesRows.map((row) => {
                const dayKey = new Date(row.day).toISOString().split('T')[0];
                return [dayKey, parseFloat(row.amount || 0)];
            })
        );

        const weeklySales = Array.from({ length: 7 }).map((_, idx) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - idx));
            const dayKey = date.toISOString().split('T')[0];
            return {
                day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                date: dayKey,
                amount: weeklySalesMap.get(dayKey) || 0
            };
        });

        const [bestSellingProducts] = await query(`
            SELECT p.name, COALESCE(SUM(si.quantity), 0) as quantity, COALESCE(SUM(si.total), 0) as revenue
            FROM sale_items si
            JOIN products p ON si.product_id = p.id
            JOIN sales s ON si.sale_id = s.id
            WHERE s.tenant_id = ?
              AND s.status != 'VOIDED'
              AND DATE(s.created_at) BETWEEN CURRENT_DATE - INTERVAL '30 days' AND CURRENT_DATE
            GROUP BY si.product_id, p.name
            ORDER BY quantity DESC, revenue DESC
            LIMIT 5
        `, [tenantId]);

        const [revenueRows] = await query(`
            SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as day_key, COALESCE(SUM(total_amount), 0) as revenue
            FROM sales
            WHERE tenant_id = ?
              AND status != 'VOIDED'
              AND DATE(created_at) BETWEEN CURRENT_DATE - INTERVAL '6 days' AND CURRENT_DATE
            GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
            ORDER BY day_key ASC
        `, [tenantId]);


        const [expenseRows] = await query(`
            SELECT TO_CHAR(expense_date, 'YYYY-MM-DD') as day_key, COALESCE(SUM(amount), 0) as expense
            FROM expenses
            WHERE tenant_id = ?
              AND expense_date BETWEEN CURRENT_DATE - INTERVAL '6 days' AND CURRENT_DATE
            GROUP BY TO_CHAR(expense_date, 'YYYY-MM-DD')
            ORDER BY day_key ASC
        `, [tenantId]);


        const revenueMap = new Map(
            revenueRows.map((row) => [row.day_key, Number(row.revenue || 0)])
        );
        const expenseMap = new Map(
            expenseRows.map((row) => [row.day_key, Number(row.expense || 0)])
        );

        const revenueExpenseTrend = Array.from({ length: 7 }).map((_, idx) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - idx));
            const dayKey = date.toLocaleDateString('en-CA');
            return {
                date: dayKey,
                day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                revenue: revenueMap.get(dayKey) || 0,
                expense: expenseMap.get(dayKey) || 0
            };
        });


        return sendSuccess(res, 'Dashboard stats retrieved', {
            stats: {
                todaysSales: todays_sales || 0,
                totalOrders: total_orders || 0,
                lowStock: low_stock || 0,
                activeCustomers: active_customers || 0,
                totalSales: total_sales || 0,
                totalPurchases: total_purchases || 0,
            },
            recentTransactions,
            weeklySales,
            bestSellingProducts,
            revenueExpenseTrend
        });
    } catch (error) {
        return sendError(res, 'Failed to fetch dashboard stats', error.message, 500);
    }
};

const getSalesReport = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { start_date, end_date, group_by = 'day' } = req.query;

        const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const endDate = end_date || new Date().toISOString().split('T')[0];

        let dateFormat;
        switch (group_by) {
            case 'week': dateFormat = '%Y-W%u'; break;
            case 'month': dateFormat = '%Y-%m'; break;
            default: dateFormat = '%Y-%m-%d';
        }

        // Summary totals
        const [[summary]] = await query(`
            SELECT 
                COUNT(id) as total_sales,
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COALESCE(AVG(total_amount), 0) as avg_sale,
                COALESCE(MAX(total_amount), 0) as largest_sale,
                COUNT(CASE WHEN status = 'VOIDED' THEN 1 END) as voided_count
            FROM sales 
            WHERE tenant_id = ? AND DATE(created_at) BETWEEN ? AND ? 
        `, [tenantId, startDate, endDate]);

        // Revenue by date
        const [revenueByDate] = await query(`
            SELECT TO_CHAR(created_at, ?) as period,
                   COUNT(id) as sales_count,
                   COALESCE(SUM(total_amount), 0) as revenue
            FROM sales 
            WHERE tenant_id = ? AND DATE(created_at) BETWEEN ? AND ? AND status != 'VOIDED'
            GROUP BY period ORDER BY period
        `, [dateFormat, tenantId, startDate, endDate]);

        // Top selling products
        const [topProducts] = await query(`
            SELECT p.name, SUM(si.quantity) as total_qty, SUM(si.total) as total_revenue
            FROM sale_items si
            JOIN products p ON si.product_id = p.id
            JOIN sales s ON si.sale_id = s.id
            WHERE s.tenant_id = ? AND DATE(s.created_at) BETWEEN ? AND ? AND s.status != 'VOIDED'
            GROUP BY si.product_id, p.name
            ORDER BY total_revenue DESC
            LIMIT 10
        `, [tenantId, startDate, endDate]);

        // Revenue by payment method
        const [byPaymentMethod] = await query(`
            SELECT p.method, COALESCE(SUM(p.amount), 0) as total
            FROM payments p
            JOIN sales s ON p.sale_id = s.id
            WHERE s.tenant_id = ? AND DATE(s.created_at) BETWEEN ? AND ? AND s.status != 'VOIDED'
            GROUP BY p.method
        `, [tenantId, startDate, endDate]);

        // Revenue by category
        const [byCategory] = await query(`
            SELECT COALESCE(c.name, 'Uncategorized') as category, COALESCE(SUM(si.total), 0) as revenue
            FROM sale_items si
            JOIN products p ON si.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            JOIN sales s ON si.sale_id = s.id
            WHERE s.tenant_id = ? AND DATE(s.created_at) BETWEEN ? AND ? AND s.status != 'VOIDED'
            GROUP BY c.id, c.name
            ORDER BY revenue DESC
        `, [tenantId, startDate, endDate]);

        return sendSuccess(res, 'Sales report generated', {
            period: { start: startDate, end: endDate, groupBy: group_by },
            summary,
            revenueByDate,
            topProducts,
            byPaymentMethod,
            byCategory
        });
    } catch (error) {
        return sendError(res, 'Failed to generate sales report', error.message, 500);
    }
};

const getLowStockItems = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const [items] = await query(`
            SELECT p.id, p.name, p.sku, p.barcode, p.min_stock_level,
                   i.quantity as current_stock,
                   (p.min_stock_level - i.quantity) as deficit
            FROM products p
            JOIN inventory i ON p.id = i.product_id
            WHERE p.tenant_id = ? AND i.quantity <= p.min_stock_level
            ORDER BY deficit DESC
        `, [tenantId]);

        return sendSuccess(res, 'Low stock items retrieved', items);
    } catch (error) {
        return sendError(res, 'Failed to fetch low stock items', error.message, 500);
    }
};

const getProfitAndLoss = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { start_date, end_date } = req.query;
        const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const endDate = end_date || new Date().toISOString().split('T')[0];

        // Total Revenue from sales
        const [[revenue]] = await query(`
            SELECT COALESCE(SUM(total_amount), 0) as total_revenue,
                   COUNT(*) as total_sales
            FROM sales
            WHERE tenant_id = ? AND DATE(created_at) BETWEEN ? AND ? AND status != 'VOIDED'
        `, [tenantId, startDate, endDate]);

        // Cost of Goods Sold (from purchase orders received in period)
        const [[cogs]] = await query(`
            SELECT COALESCE(SUM(poi.quantity_ordered * poi.unit_cost), 0) as total_cogs
            FROM purchase_order_items poi
            JOIN purchase_orders po ON poi.purchase_order_id = po.id
            WHERE po.tenant_id = ? AND po.status = 'RECEIVED'
              AND DATE(po.received_at) BETWEEN ? AND ?
        `, [tenantId, startDate, endDate]);

        // Total Expenses
        const [[expenseData]] = await query(`
            SELECT COALESCE(SUM(amount), 0) as total_expenses
            FROM expenses
            WHERE tenant_id = ? AND expense_date BETWEEN ? AND ?
        `, [tenantId, startDate, endDate]);

        // Expenses by category
        const [expensesByCategory] = await query(`
            SELECT category, COALESCE(SUM(amount), 0) as amount
            FROM expenses
            WHERE tenant_id = ? AND expense_date BETWEEN ? AND ?
            GROUP BY category ORDER BY amount DESC
        `, [tenantId, startDate, endDate]);

        // Revenue by category
        const [revenueByCategory] = await query(`
            SELECT COALESCE(c.name, 'Uncategorized') as category, COALESCE(SUM(si.total), 0) as revenue
            FROM sale_items si
            JOIN products p ON si.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            JOIN sales s ON si.sale_id = s.id
            WHERE s.tenant_id = ? AND DATE(s.created_at) BETWEEN ? AND ? AND s.status != 'VOIDED'
            GROUP BY c.id, c.name ORDER BY revenue DESC
        `, [tenantId, startDate, endDate]);

        // Returns/Refunds
        const [[refunds]] = await query(`
            SELECT COALESCE(SUM(refund_amount), 0) as total_refunds
            FROM returns
            WHERE tenant_id = ? AND DATE(created_at) BETWEEN ? AND ?
              AND status IN ('APPROVED', 'REFUNDED')
        `, [tenantId, startDate, endDate]);

        const totalRevenue = parseFloat(revenue.total_revenue);
        const totalCogs = parseFloat(cogs.total_cogs);
        const totalExpenses = parseFloat(expenseData.total_expenses);
        const totalRefunds = parseFloat(refunds.total_refunds);
        const grossProfit = totalRevenue - totalCogs - totalRefunds;
        const netProfit = grossProfit - totalExpenses;
        const grossMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0;
        const netMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

        return sendSuccess(res, 'Profit & Loss report', {
            period: { start: startDate, end: endDate },
            revenue: { total: totalRevenue, sales_count: revenue.total_sales, byCategory: revenueByCategory },
            costOfGoods: totalCogs,
            refunds: totalRefunds,
            grossProfit,
            grossMargin,
            expenses: { total: totalExpenses, byCategory: expensesByCategory },
            netProfit,
            netMargin
        });
    } catch (error) {
        return sendError(res, 'Failed to generate P&L report', error.message, 500);
    }
};

module.exports = {
    getTenantDashboardStats,
    getSalesReport,
    getLowStockItems,
    getProfitAndLoss
};
