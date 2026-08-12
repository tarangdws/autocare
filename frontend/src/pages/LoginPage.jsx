import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await api.post('/auth/login', { username, password });
            const { token, user } = res.data;
            login(token, user);

            // Redirect based on role
            if (user.is_superuser) {
                navigate('/admin/dashboard');
            } else if (user.is_staff) {
                navigate('/shop/dashboard');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid username or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto my-12 animate-fade">
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-4 text-lg shadow-md shadow-blue-500/20">
                        <i className="fas fa-user-lock"></i>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Sign in to AutoCare</h2>
                    <p className="text-slate-500 text-sm mt-1">Enter your credentials to access your dashboard</p>
                </div>

                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-5 flex items-center">
                        <i className="fas fa-exclamation-circle mr-2"></i> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Username</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-semibold text-slate-700">Password</label>
                            <Link to="/forget-password" className="text-xs text-blue-600 hover:underline">Forgot password?</Link>
                        </div>
                        <input
                            type="password"
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 px-5 rounded-lg text-base font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 mt-4"
                        disabled={loading}
                    >
                        {loading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-sign-in-alt"></i> Sign in</>}
                    </button>
                </form>

                <div className="mt-6 pt-5 border-t border-slate-200 text-center text-sm text-slate-500">
                    Don't have an account? <Link to="/signup" className="font-semibold text-blue-600 hover:underline ml-1">Create account</Link>
                </div>

                {/* Quick Credentials Helper */}
                <div className="mt-6 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                    <p className="font-bold text-slate-900 mb-1">Demo Accounts:</p>
                    <p>• Client: <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded">john_doe</code> / <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded">userpass</code></p>
                    <p>• Shop Admin: <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded">autocare_main</code> / <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded">shoppass</code></p>
                    <p>• Super Admin: <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded">superadmin</code> / <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded">adminpass</code></p>
                </div>
            </div>
        </div>
    );
}
