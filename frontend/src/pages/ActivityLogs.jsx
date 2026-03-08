import React, { useState, useEffect } from 'react';
import { Activity, Filter, Clock, Database, ArrowRight, Download } from 'lucide-react';
import { adminApi, activityApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const getReadableDetail = (log) => {
    const mod = (log.module || '').toLowerCase();
    const act = (log.action || '').toUpperCase();
    const name = [log.first_name, log.last_name].filter(Boolean).join(' ') || 'System';

    if (act.includes('LOGIN') && act.includes('FAILED')) return `Failed login attempt for ${log.new_data?.email || 'unknown'}`;
    if (act.includes('SUPER_ADMIN_LOGIN')) return `Super Admin logged in`;
    if (act.includes('LOGIN')) return `${name} logged in`;
    if (act.includes('LOGOUT')) return `${name} logged out`;
    if (act.includes('TENANT_REGISTERED')) return `New tenant "${log.new_data?.tenantName || ''}" registered`;

    if (mod === 'sales' || mod === 'sale') {
        if (act.includes('CREATE')) return `New sale processed${log.new_data?.saleId ? ' #' + log.new_data.saleId : ''}`;
        if (act.includes('VOID')) return `Sale #${log.record_id} voided${log.new_data?.reason ? ': ' + log.new_data.reason : ''}`;
    }
    if (mod === 'products') {
        if (act === 'CREATE') return `New product created: "${log.new_data?.name || ''}"`;
        if (act === 'UPDATE') return `Product updated: "${log.new_data?.name || log.old_data?.name || ''}"`;
        if (act === 'DELETE') return `Product deleted: "${log.old_data?.name || ''}"`;
    }
    if (mod === 'categories') {
        if (act === 'CREATE') return `New category created: "${log.new_data?.name || ''}"`;
        if (act === 'UPDATE') return `Category updated: "${log.new_data?.name || log.old_data?.name || ''}"`;
        if (act === 'DELETE') return `Category deleted: "${log.old_data?.name || ''}"`;
    }
    if (mod === 'inventory') {
        if (act.includes('ADJUST')) return `Stock adjusted — ${log.new_data?.reason || 'manual adjustment'}`;
    }
    if (mod === 'staff') {
        if (act.includes('CREATE')) return `New staff member added: "${log.new_data?.first_name || ''} ${log.new_data?.last_name || ''}"`;
    }
    if (mod === 'customers') {
        if (act.includes('CREATE')) return `New customer added: "${log.new_data?.name || ''}"`;
    }
    if (mod === 'payments' || mod === 'paymentconfig') {
        return `Payment configuration updated`;
    }

    // Fallback
    return `${act.replace(/_/g, ' ').toLowerCase()} in ${mod}`;
};

const getActionColor = (action) => {
    if (!action) return 'bg-slate-100 text-slate-700';
    const a = action.toUpperCase();
    if (a.includes('CREATE') || a.includes('ADD') || a.includes('REGISTER')) return 'bg-emerald-100 text-emerald-700';
    if (a.includes('UPDATE') || a.includes('EDIT') || a.includes('ADJUST')) return 'bg-amber-100 text-amber-700';
    if (a.includes('DELETE') || a.includes('REMOVE') || a.includes('VOID')) return 'bg-rose-100 text-rose-700';
    if (a.includes('LOGIN')) return 'bg-indigo-100 text-indigo-700';
    if (a.includes('LOGOUT')) return 'bg-slate-100 text-slate-600';
    if (a.includes('FAIL')) return 'bg-red-100 text-red-700';
    return 'bg-slate-100 text-slate-700';
};

const formatDate = (d) => {
    if (!d) return 'N/A';
    const dt = new Date(d);
    return dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const ActivityLogs = () => {
    const { user } = useAuth();
    const isSuperAdmin = user?.isSuperAdmin;

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ module: '', action: '' });

    useEffect(() => { loadLogs(); }, [filters]);

    const loadLogs = async () => {
        try {
            setLoading(true);
            const params = { limit: 200 };
            if (filters.module) params.module = filters.module;
            if (filters.action) params.action = filters.action;

            const res = isSuperAdmin
                ? await adminApi.getActivityLogs(params)
                : await activityApi.getLogs(params);

            if (res.success) setLogs(res.data);
        } catch (e) { console.error('Failed to load logs', e); }
        finally { setLoading(false); }
    };

    const exportCSV = () => {
        const headers = ['User', 'Email', 'Module', 'Action', 'IP Address', 'Time', 'Details'];
        if (isSuperAdmin) headers.splice(2, 0, 'Tenant');

        const rows = logs.map(log => {
            const row = [
                `${log.first_name || 'System'} ${log.last_name || ''}`.trim(),
                log.user_email || '',
                log.module || '',
                log.action || '',
                log.ip_address || '',
                formatDate(log.created_at),
                getReadableDetail(log)
            ];
            if (isSuperAdmin) row.splice(2, 0, log.tenant_name || 'Platform');
            return row;
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `activity_logs_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Activity className="w-6 h-6 text-brand-600" /> Activity Logs
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {isSuperAdmin ? 'Platform-wide audit trail of all actions.' : 'Track all actions performed in your store.'}
                    </p>
                </div>
                <button onClick={exportCSV} disabled={logs.length === 0}
                    className="btn-primary flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    <Download className="w-4 h-4" /> Export CSV
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <Filter className="w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Filter by module..."
                    className="input-field max-w-[180px] text-sm" value={filters.module}
                    onChange={e => setFilters({ ...filters, module: e.target.value })} />
                <input type="text" placeholder="Filter by action..."
                    className="input-field max-w-[180px] text-sm" value={filters.action}
                    onChange={e => setFilters({ ...filters, action: e.target.value })} />
                <button onClick={() => setFilters({ module: '', action: '' })}
                    className="text-xs text-slate-500 hover:text-brand-600 underline underline-offset-2">Clear</button>
                <span className="ml-auto text-xs text-slate-400">{logs.length} records</span>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-400">Loading activity logs...</div>
                ) : logs.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p className="font-medium">No activity logs found</p>
                        <p className="text-sm mt-1">Actions will appear here as users interact with the system.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Module</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">IP</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {logs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                        {/* User */}
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 border border-slate-200 shrink-0">
                                                    {log.first_name?.[0] || '?'}{log.last_name?.[0] || ''}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-800 text-xs">{log.first_name || 'System'} {log.last_name || ''}</div>
                                                    {log.user_email && <div className="text-[10px] text-slate-400">{log.user_email}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        {/* Module */}
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700 rounded">
                                                <Database className="w-3 h-3" /> {log.module}
                                            </span>
                                        </td>
                                        {/* Action */}
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded ${getActionColor(log.action)}`}>
                                                <ArrowRight className="w-3 h-3" /> {log.action}
                                            </span>
                                        </td>
                                        {/* IP */}
                                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500 font-mono">
                                            {log.ip_address || '—'}
                                        </td>
                                        {/* Time */}
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                {formatDate(log.created_at)}
                                            </div>
                                        </td>
                                        {/* Details */}
                                        <td className="px-4 py-3 max-w-[280px]">
                                            <span className="text-xs text-slate-700">{getReadableDetail(log)}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityLogs;
