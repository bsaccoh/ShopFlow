import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Store, User, Mail, Lock, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Register = () => {
    const [formData, setFormData] = useState({
        tenantName: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const { registerTenant } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            return setError('Passwords do not match');
        }

        setLoading(true);
        const result = await registerTenant({
            ...formData,
            enabledFeatures: ['POS', 'Products', 'Sales History', 'Customers', 'Staff & Roles', 'Branch Management'] // Default features for self-reg
        });

        if (result.success) {
            setSuccess('Tenant registered successfully! Redirecting to login...');
            setTimeout(() => navigate('/login'), 3000);
        } else {
            setError(result.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
                    Start Your Free Trial
                </h2>
                <p className="mt-2 text-center text-sm text-slate-600">
                    Create your ShopFlow tenant workspace
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
                <div className="card-modern py-8 px-4 sm:px-10">

                    {error && (
                        <div className="mb-4 bg-rose-50 border-l-4 border-rose-500 p-4">
                            <p className="text-sm text-rose-700">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 bg-emerald-50 border-l-4 border-emerald-500 p-4">
                            <p className="text-sm text-emerald-700">{success}</p>
                        </div>
                    )}

                    <form className="space-y-5" onSubmit={handleSubmit}>

                        {/* Business Info */}
                        <div className="pb-4 border-b border-slate-200">
                            <h3 className="text-lg font-medium leading-6 text-slate-900 mb-4 flex items-center">
                                <Store className="h-5 w-5 mr-2 text-brand-500" />
                                Business Details
                            </h3>

                            <div>
                                <label className="block text-sm font-medium text-slate-700">Business / Store Name</label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Store className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <input
                                        type="text"
                                        name="tenantName"
                                        required
                                        className="input-field pl-10"
                                        placeholder="My Super Store"
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Admin Info */}
                        <div className="pt-2">
                            <h3 className="text-lg font-medium leading-6 text-slate-900 mb-4 flex items-center">
                                <User className="h-5 w-5 mr-2 text-brand-500" />
                                Admin Profile
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">First Name</label>
                                    <input type="text" name="firstName" required className="mt-1 input-field" onChange={handleChange} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Last Name</label>
                                    <input type="text" name="lastName" required className="mt-1 input-field" onChange={handleChange} />
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Email Address</label>
                                    <div className="mt-1 relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Mail className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <input type="email" name="email" required className="input-field pl-10" onChange={handleChange} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Phone</label>
                                    <div className="mt-1 relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Phone className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <input type="tel" name="phone" className="input-field pl-10" onChange={handleChange} />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Password</label>
                                    <div className="mt-1 relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <input type="password" name="password" required minLength="6" className="input-field pl-10" onChange={handleChange} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Confirm Password</label>
                                    <div className="mt-1 relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <input type="password" name="confirmPassword" required minLength="6" className="input-field pl-10" onChange={handleChange} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-70 transition-all font-semibold"
                            >
                                {loading ? 'Processing...' : 'Complete Registration'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-slate-600">
                            Already have an account?{' '}
                            <Link to="/login" className="font-medium text-brand-600 hover:text-brand-500 focus:outline-none">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
