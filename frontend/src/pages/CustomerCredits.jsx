import React, { useState, useEffect } from 'react';
import { Wallet, Plus, X, ChevronRight, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { customerCreditApi } from '../services/api';

const CustomerCredits = () => {
    const [debtors, setDebtors] = useState([]);
    const [totalOwed, setTotalOwed] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerData, setCustomerData] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({ type: 'PAYMENT', amount: '', description: '' });

    useEffect(() => { loadDebtors(); }, []);

    const loadDebtors = async () => {
        try {
            setLoading(true);
            const res = await customerCreditApi.getDebtors();
            if (res.success) {
                setDebtors(res.data.debtors || []);
                setTotalOwed(res.data.totalOwed || 0);
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const viewCustomer = async (customerId) => {
        try {
            const res = await customerCreditApi.getCustomerCredits(customerId);
            if (res.success) {
                setCustomerData(res.data);
                setSelectedCustomer(customerId);
            }
        } catch (e) { console.error(e); }
    };

    const handleAddRecord = async (e) => {
        e.preventDefault();
        try {
            await customerCreditApi.addRecord(selectedCustomer, {
                ...addForm, amount: parseFloat(addForm.amount)
            });
            setShowAddModal(false);
            setAddForm({ type: 'PAYMENT', amount: '', description: '' });
            viewCustomer(selectedCustomer);
            loadDebtors();
        } catch (err) { alert(err.message || 'Failed to add record'); }
    };

    const fmt = (v) => `LE ${parseFloat(v || 0).toLocaleString()}`;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Wallet className="w-6 h-6 text-brand-600" /> Customer Credits
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">Track customer debts and credit payments.</p>
                </div>
            </div>

            {/* Total Owed Banner */}
            <div className="bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl p-6 shadow-lg">
                <p className="text-sm opacity-80">Total Outstanding Debt</p>
                <p className="text-3xl font-bold">{fmt(totalOwed)}</p>
                <p className="text-xs mt-1 opacity-70">{debtors.length} customer{debtors.length !== 1 ? 's' : ''} with outstanding balance</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Debtors List */}
                <div className="card-modern overflow-hidden">
                    <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                        <h2 className="font-bold text-slate-900">Debtors</h2>
                    </div>
                    {loading ? (
                        <div className="p-8 text-center text-slate-400">Loading...</div>
                    ) : debtors.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                            <Wallet className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                            <p className="text-sm">No outstanding debts</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                            {debtors.map(d => (
                                <button key={d.id} onClick={() => viewCustomer(d.id)}
                                    className={`w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors text-left ${selectedCustomer === d.id ? 'bg-brand-50 border-l-3 border-brand-500' : ''}`}>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">{d.name}</p>
                                        <p className="text-xs text-slate-500">{d.phone || 'No phone'}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-rose-600">{fmt(d.balance)}</span>
                                        <ChevronRight className="w-4 h-4 text-slate-400" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Customer Detail */}
                <div className="lg:col-span-2 card-modern overflow-hidden">
                    {customerData ? (
                        <>
                            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                <div>
                                    <h2 className="font-bold text-slate-900">{customerData.customer.name}</h2>
                                    <p className={`text-lg font-bold mt-1 ${customerData.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        Balance: {fmt(customerData.balance)} {customerData.balance > 0 ? '(Owes)' : customerData.balance < 0 ? '(Credit)' : '(Settled)'}
                                    </p>
                                </div>
                                <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
                                    <Plus className="w-4 h-4" /> Record Payment
                                </button>
                            </div>
                            {/* Transaction History */}
                            <div className="divide-y divide-slate-100 max-h-[450px] overflow-y-auto">
                                {customerData.records.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-sm">No records</div>
                                ) : customerData.records.map(r => (
                                    <div key={r.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50">
                                        <div className="flex items-center gap-3">
                                            {r.type === 'CREDIT' ? (
                                                <div className="p-2 rounded-full bg-rose-100"><ArrowUpCircle className="w-4 h-4 text-rose-600" /></div>
                                            ) : (
                                                <div className="p-2 rounded-full bg-emerald-100"><ArrowDownCircle className="w-4 h-4 text-emerald-600" /></div>
                                            )}
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">{r.type === 'CREDIT' ? 'Credit Given' : 'Payment Received'}</p>
                                                <p className="text-xs text-slate-500">{r.description || '-'}</p>
                                                <p className="text-[10px] text-slate-400">{new Date(r.created_at).toLocaleString()} • {r.recorded_by_name || '-'}</p>
                                            </div>
                                        </div>
                                        <span className={`text-sm font-bold ${r.type === 'CREDIT' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {r.type === 'CREDIT' ? '+' : '-'}{fmt(r.amount)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
                            <Wallet className="w-12 h-12 mb-3 text-slate-300" />
                            <p className="text-sm font-medium">Select a customer to view their credit history</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Record Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen p-4">
                        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
                        <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full">
                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="text-lg font-bold">Record Transaction</h3>
                                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
                            </div>
                            <form onSubmit={handleAddRecord} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button type="button" onClick={() => setAddForm({ ...addForm, type: 'PAYMENT' })}
                                            className={`py-3 rounded-xl text-sm font-medium border-2 transition-all ${addForm.type === 'PAYMENT' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`}>
                                            💰 Payment
                                        </button>
                                        <button type="button" onClick={() => setAddForm({ ...addForm, type: 'CREDIT' })}
                                            className={`py-3 rounded-xl text-sm font-medium border-2 transition-all ${addForm.type === 'CREDIT' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-500'}`}>
                                            📋 New Credit
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
                                    <input type="number" step="0.01" className="input-field" required value={addForm.amount} onChange={e => setAddForm({ ...addForm, amount: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                    <input type="text" className="input-field" value={addForm.description} onChange={e => setAddForm({ ...addForm, description: e.target.value })} placeholder="e.g. Partial payment" />
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                    <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary px-4">Cancel</button>
                                    <button type="submit" className="btn-primary px-6">Record</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerCredits;
