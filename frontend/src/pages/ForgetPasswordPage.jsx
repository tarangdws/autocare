import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function ForgetPasswordPage() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/auth/forget-password', { email });
            setMessage(res.data.message || 'Password reset link has been dispatched to your email address.');
        } catch (err) {
            setMessage('If the email is registered, instructions have been sent.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto my-12 animate-fade">
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center mx-auto mb-4 text-lg shadow-md shadow-amber-500/20">
                        <i className="fas fa-key"></i>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Forgot Password</h2>
                    <p className="text-slate-500 text-sm mt-1">Enter your email to receive recovery instructions</p>
                </div>

                {message && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm mb-5 flex items-center">
                        <i className="fas fa-check-circle mr-2"></i> {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 px-5 rounded-lg text-base font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 mt-4"
                        disabled={loading}
                    >
                        {loading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-paper-plane"></i> Send Recovery Link</>}
                    </button>
                </form>

                <div className="mt-6 pt-5 border-t border-slate-200 text-center text-sm text-slate-500">
                    Remember your password? <Link to="/login" className="font-semibold text-blue-600 hover:underline ml-1">Sign in</Link>
                </div>
            </div>
        </div>
    );
}
