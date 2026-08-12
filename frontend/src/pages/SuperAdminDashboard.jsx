import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import StatusBadge from '../components/StatusBadge';

export default function SuperAdminDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchAdminDashboard = async () => {
        try {
            const res = await api.get('/admin/dashboard');
            setStats(res.data.stats);
        } catch (err) {
            console.error('Fetch superadmin dashboard failed:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdminDashboard();
    }, []);

    if (loading) {
        return (
            <div className="text-center py-16 text-slate-500">
                <i className="fas fa-spinner fa-spin text-2xl"></i>
                <p className="mt-2 text-sm">Loading platform administration...</p>
            </div>
        );
    }

    return (
        <div className="animate-fade">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
                <div>
                    <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                        <i className="fas fa-shield-alt"></i> Platform Super Admin
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Platform Overview & Oversight</h1>
                    <p className="text-slate-500 text-sm sm:text-base mt-1">
                        Enterprise analytics, service hubs network, and cross-platform order monitoring.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link
                        to="/admin/add-provider"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
                    >
                        <i className="fas fa-plus-circle"></i> Onboard New Workshop Hub
                    </Link>
                </div>
            </div>

            {/* Platform Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-3xl font-extrabold text-slate-900">{stats?.total_shops || 0}</div>
                        <div className="text-sm font-medium text-slate-500 mt-1">Active Workshop Hubs</div>
                    </div>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-blue-50 text-blue-600">
                        <i className="fas fa-store-alt"></i>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-3xl font-extrabold text-slate-900">{stats?.total_users || 0}</div>
                        <div className="text-sm font-medium text-slate-500 mt-1">Registered Accounts</div>
                    </div>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-purple-50 text-purple-600">
                        <i className="fas fa-users"></i>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-3xl font-extrabold text-slate-900">{stats?.total_services || 0}</div>
                        <div className="text-sm font-medium text-slate-500 mt-1">Total Service Bookings</div>
                    </div>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-emerald-50 text-emerald-600">
                        <i className="fas fa-tools"></i>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-3xl font-extrabold text-slate-900">{stats?.total_towing || 0}</div>
                        <div className="text-sm font-medium text-slate-500 mt-1">Total Towing Dispatches</div>
                    </div>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-red-50 text-red-600">
                        <i className="fas fa-truck-pickup"></i>
                    </div>
                </div>
            </div>

            {/* Platform Revenue Banner */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 sm:p-10 text-white mb-8 flex justify-between items-center flex-wrap gap-6 shadow-md">
                <div>
                    <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total Invoiced Platform Value</span>
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-sky-400 mt-1">
                        ₹{parseFloat(stats?.total_service_revenue || 0).toLocaleString()}
                    </h2>
                    <p className="text-slate-300 text-xs sm:text-sm mt-1">Cumulative gross transactions recorded across all service packages</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Link
                        to="/admin/providers"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
                    >
                        <i className="fas fa-store"></i> View Providers ({stats?.total_shops || 0})
                    </Link>
                    <Link
                        to="/admin/services"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
                    >
                        <i className="fas fa-list"></i> View All Orders
                    </Link>
                </div>
            </div>

            {/* Recent Bookings Platform Wide */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-8">
                <div className="flex justify-between items-center mb-5">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center">
                        <i className="fas fa-tasks text-blue-600 mr-2"></i>
                        Recent Platform-Wide Service Bookings
                    </h2>
                    <Link to="/admin/services" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                        View All ({stats?.total_services || 0}) &rarr;
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <th className="py-3 px-4">Order #</th>
                                <th className="py-3 px-4">Customer Info</th>
                                <th className="py-3 px-4">Assigned Workshop</th>
                                <th className="py-3 px-4">Vehicle Details</th>
                                <th className="py-3 px-4">Scheduled Date</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4">Payment</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {stats?.recent_bookings?.map((b) => (
                                <tr key={b.id} className="hover:bg-slate-50/50">
                                    <td className="py-3 px-4 font-bold text-slate-900">#{b.id}</td>
                                    <td className="py-3 px-4">
                                        <div className="font-semibold text-slate-900">{b.customer_name}</div>
                                        <div className="text-xs text-slate-500">{b.customer_phone}</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="font-semibold text-blue-600">{b.shop_name}</span>
                                        <span className="block text-xs text-slate-500">{b.city}</span>
                                    </td>
                                    <td className="py-3 px-4 text-slate-700">{b.vehicle_info}</td>
                                    <td className="py-3 px-4 text-slate-600">{new Date(b.preferred_date).toLocaleDateString()}</td>
                                    <td className="py-3 px-4"><StatusBadge status={b.status} /></td>
                                    <td className="py-3 px-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                            b.is_paid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                        }`}>
                                            {b.is_paid ? 'Paid' : 'Unpaid'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recent Towing Requests Platform Wide */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-5">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center">
                        <i className="fas fa-truck-pickup text-red-600 mr-2"></i>
                        Recent Platform-Wide Emergency Towing
                    </h2>
                    <Link to="/admin/towing" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                        View All ({stats?.total_towing || 0}) &rarr;
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <th className="py-3 px-4">Request #</th>
                                <th className="py-3 px-4">Driver & Phone</th>
                                <th className="py-3 px-4">Assigned Workshop</th>
                                <th className="py-3 px-4">Vehicle Details</th>
                                <th className="py-3 px-4">Requested At</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4">OTP</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {stats?.recent_towing?.map((t) => (
                                <tr key={t.id} className="hover:bg-slate-50/50">
                                    <td className="py-3 px-4 font-bold text-slate-900">#{t.id}</td>
                                    <td className="py-3 px-4">
                                        <div className="font-semibold text-slate-900">{t.full_name}</div>
                                        <div className="text-xs text-slate-500">{t.phone_number}</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="font-semibold text-red-600">{t.shop_name}</span>
                                        <span className="block text-xs text-slate-500">{t.city}</span>
                                    </td>
                                    <td className="py-3 px-4 text-slate-700">{t.vehicle_details}</td>
                                    <td className="py-3 px-4 text-slate-600">{new Date(t.requested_at).toLocaleString()}</td>
                                    <td className="py-3 px-4"><StatusBadge status={t.status} /></td>
                                    <td className="py-3 px-4">
                                        <code className="bg-red-50 px-2 py-0.5 rounded text-red-600 font-mono font-bold text-xs">{t.otp || 'N/A'}</code>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
