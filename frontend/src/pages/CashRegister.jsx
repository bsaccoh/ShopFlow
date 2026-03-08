import React, { useState, useEffect } from 'react';
import { Calculator, DoorOpen, DoorClosed, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { cashRegisterApi } from '../services/api';

const CashRegister = () => {
    const [session, setSession] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openingAmount, setOpeningAmount] = useState('');
    const [actualCash, setActualCash] = useState('');
    const [closeNotes, setCloseNotes] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const [closeResult, setCloseResult] = useState(null);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [sesRes, histRes] = await Promise.all([
                cashRegisterApi.getCurrent(),
                cashRegisterApi.getHistory()
            ]);
            if (sesRes.success) setSession(sesRes.data);
            if (histRes.success) setHistory(histRes.data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleOpen = async () => {
        try {
            await cashRegisterApi.open({ opening_amount: parseFloat(openingAmount) || 0 });
            setOpeningAmount('');
            loadData();
        } catch (err) { alert(err.message || 'Failed to open register'); }
    };

    const handleClose = async () => {
        if (!confirm('Are you sure you want to close the register?')) return;
        try {
            const res = await cashRegisterApi.close({ actual_cash: parseFloat(actualCash) || 0, notes: closeNotes });
            if (res.success) {
                setCloseResult(res.data);
                setActualCash('');
                setCloseNotes('');
                setSession(null);
                loadData();
            }
        } catch (err) { alert(err.message || 'Failed to close register'); }
    };

    const fmt = (v) => `LE ${parseFloat(v || 0).toLocaleString()}`;

    if (loading) return <div className="p-12 text-center text-slate-400">Loading...</div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <Calculator className="w-6 h-6 text-brand-600" /> Cash Register
                </h1>
                <p className="mt-1 text-sm text-slate-500">Open, manage, and close your daily cash register sessions.</p>
            </div>

            {/* Close Result Summary */}
            {closeResult && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 space-y-3">
                    <h3 className="text-lg font-bold text-emerald-900 flex items-center gap-2">✅ Register Closed Successfully</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div><span className="text-slate-500 block">Opening:</span><span className="font-bold">{fmt(closeResult.opening_amount)}</span></div>
                        <div><span className="text-slate-500 block">Total Sales:</span><span className="font-bold">{fmt(closeResult.total_sales)}</span></div>
                        <div><span className="text-slate-500 block">Expected Cash:</span><span className="font-bold">{fmt(closeResult.expected_cash)}</span></div>
                        <div><span className="text-slate-500 block">Actual Cash:</span><span className="font-bold">{fmt(closeResult.actual_cash)}</span></div>
                    </div>
                    <div className={`text-center py-3 rounded-lg font-bold text-lg ${parseFloat(closeResult.difference || 0) >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        Difference: {fmt(closeResult.difference)} {parseFloat(closeResult.difference || 0) > 0 ? '(Over)' : parseFloat(closeResult.difference || 0) < 0 ? '(Short)' : '(Balanced)'}
                    </div>
                    <p className="text-xs text-slate-500">Transactions: {closeResult.total_transactions}</p>
                    <button onClick={() => setCloseResult(null)} className="text-xs text-brand-600 hover:underline">Dismiss</button>
                </div>
            )}

            {/* No Session - Open Register */}
            {!session && (
                <div className="card-modern p-8 text-center max-w-md mx-auto">
                    <DoorClosed className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Register is Closed</h2>
                    <p className="text-sm text-slate-500 mb-6">Open a new session to start processing sales.</p>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Opening Cash Amount</label>
                            <input type="number" step="0.01" className="input-field text-center text-lg" placeholder="0.00"
                                value={openingAmount} onChange={e => setOpeningAmount(e.target.value)} />
                        </div>
                        <button onClick={handleOpen} className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base">
                            <DoorOpen className="w-5 h-5" /> Open Register
                        </button>
                    </div>
                </div>
            )}

            {/* Active Session */}
            {session && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Session Info */}
                    <div className="card-modern p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                            <h2 className="text-lg font-bold text-slate-900">Session Active</h2>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm"><span className="text-slate-500">Opened By:</span><span className="font-medium">{session.opened_by_name}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-slate-500">Opened At:</span><span className="font-medium">{new Date(session.opened_at).toLocaleString()}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-slate-500">Opening Amount:</span><span className="font-bold">{fmt(session.opening_amount)}</span></div>
                            <hr className="border-slate-100" />
                            <div className="flex justify-between text-sm"><span className="text-slate-500">Running Sales:</span><span className="font-bold text-emerald-600">{fmt(session.running_total)}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-slate-500">Transactions:</span><span className="font-bold">{session.transaction_count || 0}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-slate-500">Expected Cash:</span>
                                <span className="font-bold text-lg text-brand-600">{fmt(parseFloat(session.opening_amount || 0) + parseFloat(session.running_total || 0))}</span>
                            </div>
                        </div>
                    </div>

                    {/* Close Register */}
                    <div className="card-modern p-6">
                        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <DoorClosed className="w-5 h-5 text-rose-500" /> Close Register
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Actual Cash Count</label>
                                <input type="number" step="0.01" className="input-field text-lg text-center" placeholder="Count your cash..."
                                    value={actualCash} onChange={e => setActualCash(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                                <textarea className="input-field resize-none" rows={2} placeholder="Any notes about this session..."
                                    value={closeNotes} onChange={e => setCloseNotes(e.target.value)} />
                            </div>
                            <button onClick={handleClose} className="btn-primary w-full py-3 bg-rose-600 hover:bg-rose-700 flex items-center justify-center gap-2">
                                <DoorClosed className="w-5 h-5" /> Close Register
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Session History */}
            <div className="card-modern overflow-hidden">
                <button onClick={() => setShowHistory(!showHistory)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Clock className="w-5 h-5 text-slate-400" /> Session History</h2>
                    {showHistory ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>
                {showHistory && (
                    <div className="border-t border-slate-200 overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Opened</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Closed</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Opening</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Sales</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Expected</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Actual</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Diff</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {history.map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 text-xs text-slate-600">{new Date(s.opened_at).toLocaleString()}</td>
                                        <td className="px-4 py-3 text-xs text-slate-600">{s.closed_at ? new Date(s.closed_at).toLocaleString() : '—'}</td>
                                        <td className="px-4 py-3 text-xs font-medium">{fmt(s.opening_amount)}</td>
                                        <td className="px-4 py-3 text-xs font-medium text-emerald-600">{fmt(s.total_sales)}</td>
                                        <td className="px-4 py-3 text-xs font-medium">{fmt(s.expected_cash)}</td>
                                        <td className="px-4 py-3 text-xs font-medium">{s.actual_cash != null ? fmt(s.actual_cash) : '—'}</td>
                                        <td className="px-4 py-3 text-xs font-bold">
                                            {s.difference != null ? (
                                                <span className={parseFloat(s.difference) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{fmt(s.difference)}</span>
                                            ) : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${s.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {s.status}
                                            </span>
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

export default CashRegister;
