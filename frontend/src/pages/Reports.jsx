import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Download, Calendar, Package, Banknote, ShoppingBag, Award } from 'lucide-react';
import { reportsApi } from '../services/api';

const Reports = () => {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [groupBy, setGroupBy] = useState('day');

    useEffect(() => { loadReport(); }, [startDate, endDate, groupBy]);

    const loadReport = async () => {
        try {
            setLoading(true);
            const res = await reportsApi.getSalesReport({ start_date: startDate, end_date: endDate, group_by: groupBy });
            if (res.success) setReport(res.data);
        } catch (e) { console.error('Report load failed', e); }
        finally { setLoading(false); }
    };

    const exportCSV = () => {
        if (!report) return;
        const rows = [['Period', 'Sales Count', 'Revenue']];
        (report.revenueByDate || []).forEach(r => rows.push([r.period, r.sales_count, r.revenue]));
        rows.push([]);
        rows.push(['--- Summary ---']);
        rows.push(['Total Sales', report.summary?.total_sales]);
        rows.push(['Total Revenue', report.summary?.total_revenue]);
        rows.push(['Average Sale', report.summary?.avg_sale]);
        rows.push(['Voided', report.summary?.voided_count]);
        rows.push([]);
        rows.push(['--- Top Products ---']);
        rows.push(['Product', 'Quantity Sold', 'Revenue']);
        (report.topProducts || []).forEach(p => rows.push([p.name, p.total_qty, p.total_revenue]));
        rows.push([]);
        rows.push(['--- By Category ---']);
        (report.byCategory || []).forEach(c => rows.push([c.category, c.revenue]));
        rows.push([]);
        rows.push(['--- By Payment Method ---']);
        (report.byPaymentMethod || []).forEach(m => rows.push([m.method, m.total]));

        const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `sales_report_${startDate}_to_${endDate}.csv`;
        a.click();
    };

    const fmt = (v) => `LE ${parseFloat(v || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
    const maxRevenue = Math.max(...(report?.revenueByDate || []).map(r => r.revenue), 1);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <BarChart3 className="w-6 h-6 text-brand-600" /> Sales Reports
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">Analyze your revenue, top products, and sales trends.</p>
                </div>
                <button onClick={exportCSV} disabled={!report}
                    className="btn-primary flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50">
                    <Download className="w-4 h-4" /> Export CSV
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <Calendar className="w-4 h-4 text-slate-400" />
                <input type="date" className="input-field max-w-[160px] text-sm" value={startDate}
                    onChange={e => setStartDate(e.target.value)} />
                <span className="text-slate-400 text-sm">to</span>
                <input type="date" className="input-field max-w-[160px] text-sm" value={endDate}
                    onChange={e => setEndDate(e.target.value)} />
                <select className="input-field max-w-[130px] text-sm" value={groupBy}
                    onChange={e => setGroupBy(e.target.value)}>
                    <option value="day">Daily</option>
                    <option value="week">Weekly</option>
                    <option value="month">Monthly</option>
                </select>
            </div>

            {loading ? (
                <div className="p-12 text-center text-slate-400">Loading report...</div>
            ) : !report ? (
                <div className="p-12 text-center text-slate-400">No data available</div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Revenue', value: fmt(report.summary?.total_revenue), icon: Banknote, color: 'text-emerald-600 bg-emerald-50' },
                            { label: 'Total Sales', value: report.summary?.total_sales || 0, icon: ShoppingBag, color: 'text-blue-600 bg-blue-50' },
                            { label: 'Average Sale', value: fmt(report.summary?.avg_sale), icon: TrendingUp, color: 'text-amber-600 bg-amber-50' },
                            { label: 'Voided', value: report.summary?.voided_count || 0, icon: Package, color: 'text-rose-600 bg-rose-50' },
                        ].map((card, i) => (
                            <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-lg ${card.color}`}>
                                        <card.icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium">{card.label}</p>
                                        <p className="text-xl font-bold text-slate-900">{card.value}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Revenue Chart (CSS bar chart) */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-sm font-semibold text-slate-900 mb-4">Revenue Trend</h2>
                        {(report.revenueByDate || []).length > 0 ? (
                            <div className="space-y-2">
                                {report.revenueByDate.map((row, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className="text-xs font-mono text-slate-500 w-24 shrink-0">{row.period}</span>
                                        <div className="flex-1 h-7 bg-slate-100 rounded-lg overflow-hidden relative">
                                            <div className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-lg transition-all duration-500"
                                                style={{ width: `${(row.revenue / maxRevenue) * 100}%` }} />
                                            <span className="absolute inset-y-0 right-2 flex items-center text-[10px] font-semibold text-slate-700">
                                                {fmt(row.revenue)} ({row.sales_count})
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 text-center py-8">No sales in this period</p>
                        )}
                    </div>

                    {/* Bottom Grid: Top Products + Categories + Payment Methods */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Top Products */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                <Award className="w-4 h-4 text-amber-500" /> Top Products
                            </h3>
                            <div className="space-y-2.5">
                                {(report.topProducts || []).length > 0 ? report.topProducts.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs">
                                        <span className="flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                                            <span className="text-slate-700 truncate max-w-[120px]">{p.name}</span>
                                        </span>
                                        <span className="font-semibold text-slate-900">{fmt(p.total_revenue)}</span>
                                    </div>
                                )) : <p className="text-xs text-slate-400">No data</p>}
                            </div>
                        </div>

                        {/* By Category */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                <Package className="w-4 h-4 text-indigo-500" /> By Category
                            </h3>
                            <div className="space-y-2.5">
                                {(report.byCategory || []).length > 0 ? report.byCategory.map((c, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs">
                                        <span className="text-slate-700">{c.category}</span>
                                        <span className="font-semibold text-slate-900">{fmt(c.revenue)}</span>
                                    </div>
                                )) : <p className="text-xs text-slate-400">No data</p>}
                            </div>
                        </div>

                        {/* By Payment Method */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                <Banknote className="w-4 h-4 text-emerald-500" /> By Payment Method
                            </h3>
                            <div className="space-y-2.5">
                                {(report.byPaymentMethod || []).length > 0 ? report.byPaymentMethod.map((m, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs">
                                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">{m.method}</span>
                                        <span className="font-semibold text-slate-900">{fmt(m.total)}</span>
                                    </div>
                                )) : <p className="text-xs text-slate-400">No data</p>}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Reports;
