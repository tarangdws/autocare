import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
    });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        ;
        setLoading(true);

        try {
            const res = await api.post('/auth/signup', formData);
            const { token, user } = res.data;
            login(token, user);
            navigate('/dashboard');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-lg mx-auto my-10 animate-fade">
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-4 text-lg shadow-md shadow-blue-500/20">
                        <i className="fas fa-user-plus"></i>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Create your Account</h2>
                    <p className="text-slate-500 text-sm mt-1">Join AutoFusion to manage bookings & towing</p>
                </div>

                

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">First Name</label>
                            <input
                                type="text"
                                name="first_name"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                                placeholder="John"
                                value={formData.first_name}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Last Name</label>
                            <input
                                type="text"
                                name="last_name"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                                placeholder="Doe"
                                value={formData.last_name}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Username</label>
                        <input
                            type="text"
                            name="username"
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                            placeholder="johndoe123"
                            value={formData.username}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            name="email"
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                            placeholder="john@example.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
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

                    <button
                        type="submit"
                        className="w-full py-3 px-5 rounded-lg text-base font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 mt-4"
                        disabled={loading}
                    >
                        {loading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-user-check"></i> Register Account</>}
                    </button>
                </form>

                <div className="mt-6 pt-5 border-t border-slate-200 text-center text-sm text-slate-500">
                    Already have an account? <Link to="/login" className="font-semibold text-blue-600 hover:underline ml-1">Sign in</Link>
                </div>
            </div>
        </div>
    );
}
