import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Download, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { reportsApi } from '../services/api';

const ProfitLoss = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => { loadReport(); }, []);

    const loadReport = async () => {
        try {
            setLoading(true);
            const res = await reportsApi.getProfitLoss(filters);
            if (res.success) setData(res.data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const fmt = (v) => `LE ${parseFloat(v || 0).toLocaleString()}`;

    const exportCSV = () => {
        if (!data) return;
        const rows = [
            ['Profit & Loss Statement'],
            [`Period: ${data.period.start} to ${data.period.end}`],
            [''],
            ['REVENUE'],
            ['Total Sales Revenue', data.revenue.total],
            ['Less: Refunds & Returns', `(${data.refunds})`],
            [''],
            ['COST OF GOODS SOLD'],
            ['Purchases (COGS)', data.costOfGoods],
            [''],
            ['GROSS PROFIT', data.grossProfit],
            [`Gross Margin`, `${data.grossMargin}%`],
            [''],
            ['OPERATING EXPENSES'],
            ...data.expenses.byCategory.map(c => [c.category, c.amount]),
            ['Total Expenses', data.expenses.total],
            [''],
            ['NET PROFIT', data.netProfit],
            [`Net Margin`, `${data.netMargin}%`],
        ];
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `profit_loss_${Date.now()}.csv`; a.click();
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Profit & Loss</h1>
                    <p className="mt-1 text-sm text-slate-500">Financial overview combining revenue, costs, and expenses.</p>
                </div>
                <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 px-3 py-2 text-sm">
                    <Download className="w-4 h-4" /> Export CSV
                </button>
            </div>

            {/* Date Filter */}
            <div className="flex items-end gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
                    <input type="date" className="input-field text-sm py-1.5" value={filters.start_date} onChange={e => setFilters({ ...filters, start_date: e.target.value })} />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
                    <input type="date" className="input-field text-sm py-1.5" value={filters.end_date} onChange={e => setFilters({ ...filters, end_date: e.target.value })} />
                </div>
                <button onClick={loadReport} className="btn-primary px-4 py-1.5 text-sm">Generate</button>
            </div>

            {loading ? (
                <div className="p-12 text-center text-slate-400">Loading report...</div>
            ) : data ? (
                <>
                    {/* Top Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard label="Revenue" value={fmt(data.revenue.total)} sub={`${data.revenue.sales_count} sales`} icon={<TrendingUp className="w-5 h-5" />} color="emerald" />
                        <StatCard label="COGS" value={fmt(data.costOfGoods)} sub="Cost of goods sold" icon={<ArrowDownRight className="w-5 h-5" />} color="blue" />
                        <StatCard label="Gross Profit" value={fmt(data.grossProfit)} sub={`${data.grossMargin}% margin`} icon={data.grossProfit >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />} color={data.grossProfit >= 0 ? 'emerald' : 'rose'} />
                        <StatCard label="Net Profit" value={fmt(data.netProfit)} sub={`${data.netMargin}% margin`} icon={data.netProfit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />} color={data.netProfit >= 0 ? 'emerald' : 'rose'} />
                    </div>

                    {/* P&L Statement */}
                    <div className="card-modern overflow-hidden">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                            <h2 className="text-lg font-bold text-slate-900">Income Statement</h2>
                            <p className="text-xs text-slate-500">{data.period.start} — {data.period.end}</p>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {/* Revenue Section */}
                            <PLRow label="Sales Revenue" value={fmt(data.revenue.total)} bold highlight="emerald" />
                            <PLRow label="Less: Refunds & Returns" value={`(${fmt(data.refunds)})`} indent color="rose" />
                            <PLRow label="Net Revenue" value={fmt(data.revenue.total - data.refunds)} bold />

                            {/* COGS */}
                            <PLRow label="Cost of Goods Sold" value="" section />
                            <PLRow label="Purchases (received POs)" value={`(${fmt(data.costOfGoods)})`} indent color="rose" />

                            {/* Gross Profit */}
                            <PLRow label="Gross Profit" value={fmt(data.grossProfit)} bold highlight={data.grossProfit >= 0 ? 'emerald' : 'rose'} />
                            <PLRow label="Gross Margin" value={`${data.grossMargin}%`} indent />

                            {/* Expenses */}
                            <PLRow label="Operating Expenses" value="" section />
                            {data.expenses.byCategory.map((c, i) => (
                                <PLRow key={i} label={c.category} value={`(${fmt(c.amount)})`} indent color="rose" />
                            ))}
                            <PLRow label="Total Expenses" value={`(${fmt(data.expenses.total)})`} bold color="rose" />

                            {/* Net Profit */}
                            <div className={`px-6 py-4 ${data.netProfit >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-bold text-slate-900">Net Profit</span>
                                    <span className={`text-xl font-bold ${data.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{fmt(data.netProfit)}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Net Margin: {data.netMargin}%</p>
                            </div>
                        </div>
                    </div>

                    {/* Revenue by Category */}
                    {data.revenue.byCategory?.length > 0 && (
                        <div className="card-modern p-6">
                            <h3 className="text-lg font-bold text-slate-900 mb-4">Revenue by Category</h3>
                            <div className="space-y-3">
                                {data.revenue.byCategory.map((c, i) => {
                                    const pct = data.revenue.total > 0 ? ((parseFloat(c.revenue) / data.revenue.total) * 100).toFixed(1) : 0;
                                    return (
                                        <div key={i} className="flex items-center gap-4">
                                            <span className="text-sm text-slate-700 w-40 truncate">{c.category}</span>
                                            <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                                                <div className="bg-brand-500 h-2.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                            </div>
                                            <span className="text-sm font-medium text-slate-700 w-28 text-right">{fmt(c.revenue)}</span>
                                            <span className="text-xs text-slate-400 w-12 text-right">{pct}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="p-12 text-center text-slate-400">No data available.</div>
            )}
        </div>
    );
};

const StatCard = ({ label, value, sub, icon, color }) => (
    <div className="card-modern p-5 group">
        <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl bg-${color}-50 text-${color}-600 ring-1 ring-${color}-100/50`}>{icon}</div>
            <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-xl font-bold text-slate-900">{value}</p>
                <p className="text-[10px] text-slate-400">{sub}</p>
            </div>
        </div>
    </div>
);

const PLRow = ({ label, value, bold, indent, section, highlight, color }) => (
    <div className={`px-6 py-3 flex justify-between items-center ${highlight ? `bg-${highlight}-50/50` : ''} ${section ? 'bg-slate-50 border-t-2 border-slate-200' : ''}`}>
        <span className={`text-sm ${bold ? 'font-bold text-slate-900' : 'text-slate-600'} ${indent ? 'pl-6' : ''} ${section ? 'font-semibold text-slate-700 uppercase text-xs tracking-wider' : ''}`}>
            {label}
        </span>
        {value && <span className={`text-sm font-medium ${bold ? 'font-bold' : ''} ${color === 'rose' ? 'text-rose-600' : color === 'emerald' ? 'text-emerald-600' : 'text-slate-900'}`}>{value}</span>}
    </div>
);

export default ProfitLoss;
