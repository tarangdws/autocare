import React, { useState, useEffect } from 'react';
import api from '../api';
import StatusBadge from '../components/StatusBadge';

export default function SuperAdminServicesPage() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    const fetchBookings = async () => {
        try {
            const res = await api.get('/admin/services');
            setBookings(res.data.bookings || []);
        } catch (err) {
            console.error('Fetch admin services failed:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm(`Are you sure you want to permanently delete Service Booking #${id}?`)) {
            try {
                await api.delete(`/admin/services/${id}`);
                fetchBookings();
            } catch (err) {
                alert('Failed to delete booking');
            }
        }
    };

    const filteredList = filter === 'all'
        ? bookings
        : bookings.filter(b => b.status === filter);

    if (loading) {
        return (
            <div className="text-center py-16 text-slate-500">
                <i className="fas fa-spinner fa-spin text-2xl"></i>
                <p className="mt-2 text-sm">Loading platform bookings...</p>
            </div>
        );
    }

    return (
        <div className="animate-fade">
            <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Platform-Wide Service Orders</h1>
                    <p className="text-slate-500 text-sm sm:text-base mt-1">
                        Global registry of all maintenance appointments across all partner garages.
                    </p>
                </div>
            </div>

            {/* Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
                <button
                    onClick={() => setFilter('all')}
                    className={`rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold transition-colors ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                >
                    All ({bookings.length})
                </button>
                <button
                    onClick={() => setFilter('pending')}
                    className={`rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold transition-colors ${filter === 'pending' ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                >
                    Pending
                </button>
                <button
                    onClick={() => setFilter('processing')}
                    className={`rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold transition-colors ${filter === 'processing' ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                >
                    In Progress
                </button>
                <button
                    onClick={() => setFilter('completed')}
                    className={`rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold transition-colors ${filter === 'completed' ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                >
                    Completed
                </button>
                <button
                    onClick={() => setFilter('cancelled')}
                    className={`rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold transition-colors ${filter === 'cancelled' ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                >
                    Cancelled
                </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                {filteredList.length === 0 ? (
                    <p className="text-center py-8 text-slate-500 text-sm">No bookings matching criteria.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="py-3 px-4">Order #</th>
                                    <th className="py-3 px-4">Customer & Contact</th>
                                    <th className="py-3 px-4">Workshop Hub</th>
                                    <th className="py-3 px-4">Vehicle Details</th>
                                    <th className="py-3 px-4">Scheduled Date</th>
                                    <th className="py-3 px-4">Payment</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4">OTP</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {filteredList.map((b) => (
                                    <tr key={b.id} className="hover:bg-slate-50/50">
                                        <td className="py-3 px-4 font-bold text-slate-900">#{b.id}</td>
                                        <td className="py-3 px-4">
                                            <div className="font-semibold text-slate-900">{b.customer_name}</div>
                                            <div className="text-xs text-slate-500">{b.customer_phone}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="font-semibold text-blue-600">{b.shop_name}</div>
                                            <div className="text-xs text-slate-500">{b.city}</div>
                                        </td>
                                        <td className="py-3 px-4 text-slate-700">{b.vehicle_info}</td>
                                        <td className="py-3 px-4 text-slate-600">{new Date(b.preferred_date).toLocaleDateString()} at {b.preferred_time}</td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                b.is_paid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                            }`}>
                                                {b.is_paid ? 'Paid' : 'Unpaid'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4"><StatusBadge status={b.status} /></td>
                                        <td className="py-3 px-4">
                                            <code className="bg-blue-50 px-2 py-0.5 rounded text-blue-700 font-mono font-bold text-xs">{b.otp || 'N/A'}</code>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <button
                                                onClick={() => handleDelete(b.id)}
                                                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                                                title="Delete Order"
                                            >
                                                <i className="fas fa-trash-alt"></i>
                                            </button>
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
}
