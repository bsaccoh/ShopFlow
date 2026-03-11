import React, { useState, useEffect } from 'react';
import { X, Calendar, Package, CreditCard, ShoppingBagIcon, Eye } from 'lucide-react';
import { posApi } from '../services/api.js';

const CustomerHistoryModal = ({ isOpen, onClose, customer }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && customer) {
            fetchHistory();
        }
    }, [isOpen, customer]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await posApi.getSalesHistory({ customer_id: customer.id, limit: 50 });
            if (res.success) {
                setHistory(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch customer history', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm" onClick={onClose} />
                <div className="relative bg-white rounded-2xl shadow-xl max-w-4xl w-full p-6 animate-in fade-in zoom-in duration-200">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <ShoppingBagIcon className="w-5 h-5 text-brand-600" />
                                Purchase History
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">Viewing history for <span className="font-semibold text-slate-700">{customer?.name}</span></p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    <div className="overflow-hidden">
                        {loading ? (
                            <div className="py-20 text-center text-slate-400">Loading history...</div>
                        ) : history.length === 0 ? (
                            <div className="py-20 text-center">
                                <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium">No purchase records found.</p>
                                <p className="text-sm text-slate-400 mt-1">This customer hasn't made any purchases yet.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto -mx-6">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-y border-slate-100">
                                            <th className="px-6 py-3 font-semibold text-slate-600">Sale #</th>
                                            <th className="px-6 py-3 font-semibold text-slate-600">Date</th>
                                            <th className="px-6 py-3 font-semibold text-slate-600">Items</th>
                                            <th className="px-6 py-3 font-semibold text-slate-600">Total</th>
                                            <th className="px-6 py-3 font-semibold text-slate-600">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {history.map((sale) => (
                                            <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-brand-600">{sale.sale_number}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1.5 text-slate-500">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {new Date(sale.created_at).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="max-w-xs">
                                                        <p className="text-slate-700 truncate" title={sale.items_summary}>
                                                            {sale.items_summary}
                                                        </p>
                                                        <p className="text-xs text-slate-400 mt-0.5">{sale.total_items} items</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-900">
                                                    LE {parseFloat(sale.total_amount).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold w-max ${sale.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                                                            sale.status === 'VOIDED' ? 'bg-rose-100 text-rose-700' :
                                                                'bg-slate-100 text-slate-600'
                                                            }`}>
                                                            {sale.status}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold w-max ${sale.payment_status === 'PAID' ? 'bg-blue-100 text-blue-700' :
                                                            sale.payment_status === 'CREDIT' ? 'bg-amber-100 text-amber-700' :
                                                                'bg-slate-100 text-slate-600'
                                                            }`}>
                                                            {sale.payment_status}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                        <button onClick={onClose} className="btn-secondary px-6">Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerHistoryModal;
