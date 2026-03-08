import React, { useState } from 'react';
import { X, UserPlus, Mail, Phone, MapPin } from 'lucide-react';
import { customerApi } from '../services/api';

const CustomerFormModal = ({ isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await customerApi.createCustomer(formData);
            if (res.success) {
                onSuccess(res.data);
                onClose();
            } else {
                setError(res.message || 'Failed to create customer');
            }
        } catch (err) {
            setError(err.message || 'Failed to create customer. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-brand-500" />
                        Add New Customer
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
                            {error}
                        </div>
                    )}

                    <form id="customerForm" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="input-field"
                                placeholder="e.g. John Doe"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email <span className="text-slate-400 font-normal">(Optional)</span></label>
                            <div className="relative">
                                <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="input-field pl-10"
                                    placeholder="john@example.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Phone <span className="text-slate-400 font-normal">(Optional)</span></label>
                            <div className="relative">
                                <Phone className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="input-field pl-10"
                                    placeholder="+232 77 123 456"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Address <span className="text-slate-400 font-normal">(Optional)</span></label>
                            <div className="relative">
                                <MapPin className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
                                <textarea
                                    rows="3"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="input-field pl-10 resize-none"
                                    placeholder="Customer's physical address"
                                ></textarea>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="customerForm"
                        disabled={loading}
                        className="btn-primary px-6 py-2 text-sm"
                    >
                        {loading ? 'Saving...' : 'Save Customer'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomerFormModal;
