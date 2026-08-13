import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function SuperAdminAddProviderPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        shop_name: '',
        full_name: '',
        phone_number: '',
        city: 'Ahmedabad',
        shop_address: '',
    });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        ;
        setLoading(true);

        try {
            await api.post('/admin/add-provider', formData);
            navigate('/admin/providers');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to register workshop provider.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade max-w-3xl mx-auto my-4">
            <div className="mb-8">
                <Link to="/admin/providers" className="text-sm font-semibold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1.5 mb-2">
                    <i className="fas fa-arrow-left"></i> Back to Workshop Hubs
                </Link>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Onboard New Service Workshop Hub</h1>
                <p className="text-slate-500 text-sm sm:text-base mt-1">
                    Register a new authorized repair garage partner and create their manager login credentials.
                </p>
            </div>

            

            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                            <i className="fas fa-store text-blue-600 mr-2"></i>
                            1. Workshop Business Details
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Shop / Workshop Name</label>
                                <input
                                    type="text"
                                    name="shop_name"
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-sm"
                                    placeholder="e.g. Apex Auto Precision Care"
                                    value={formData.shop_name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Primary City / Region</label>
                                <input
                                    type="text"
                                    name="city"
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-sm"
                                    placeholder="Ahmedabad"
                                    value={formData.city}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Manager / Owner Name</label>
                                <input
                                    type="text"
                                    name="full_name"
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-sm"
                                    placeholder="e.g. Rajesh Sharma"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Shop Hotline Phone Number</label>
                                <input
                                    type="tel"
                                    name="phone_number"
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-sm"
                                    placeholder="+91 98765 43210"
                                    value={formData.phone_number}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Street Address & Landmark</label>
                            <input
                                type="text"
                                name="shop_address"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-sm"
                                placeholder="Plot 45, Opp. Palladium Mall, SG Highway"
                                value={formData.shop_address}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                            <i className="fas fa-user-shield text-blue-600 mr-2"></i>
                            2. Manager Portal Credentials
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Portal Username</label>
                                <input
                                    type="text"
                                    name="username"
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-sm"
                                    placeholder="apex_garage"
                                    value={formData.username}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Portal Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-sm"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Official Email Address</label>
                            <input
                                type="email"
                                name="email"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-sm"
                                placeholder="contact@apexgarage.com"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3.5 px-6 rounded-xl text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm inline-flex items-center justify-center gap-2"
                        disabled={loading}
                    >
                        {loading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-check-circle"></i> Complete Workshop Onboarding</>}
                    </button>
                </form>
            </div>
        </div>
    );
}
