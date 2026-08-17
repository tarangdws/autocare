import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import api from '../api';
import StatusBadge from '../components/StatusBadge';
import ConfirmModal from '../components/ConfirmModal';

export default function ShopDashboard() {
    const [shop, setShop] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null, newStatus: '', currentStatus: '', type: '' });
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [saving, setSaving] = useState(false);

    const statusOrder = ['pending', 'confirmed', 'processing', 'completed'];
    const towingStatusOrder = ['pending', 'processing', 'completed'];

    const isStatusDisabled = (currentStatus, targetStatus, type) => {
        if (currentStatus === targetStatus) return false;
        if (currentStatus === 'cancelled' || currentStatus === 'completed') return true;
        if (targetStatus === 'cancelled') return false;
        
        const orderArray = type === 'towing' ? towingStatusOrder : statusOrder;
        const currentIndex = orderArray.indexOf(currentStatus);
        const targetIndex = orderArray.indexOf(targetStatus);
        
        if (currentIndex === -1 || targetIndex === -1) return true;
        return targetIndex < currentIndex;
    };

    const fetchShopDashboard = async () => {
        try {
            const res = await api.get('/shop/dashboard');
            setShop(res.data.shop);
            setStats(res.data.stats);
        } catch (err) {
            console.error('Fetch shop dashboard failed:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShopDashboard();
    }, []);

    const handleUpdateBookingStatus = async (bookingId, newStatus) => {
        try {
            await api.put(`/shop/service-orders/${bookingId}`, { status: newStatus });
            fetchShopDashboard();
        } catch (err) {
            toast.error('Failed to update booking status');
        }
    };

    const handleQuickStatusDropdown = (booking, newStatus, type) => {
        if (type === 'service' && newStatus === 'completed') {
            if (!booking.is_paid) {
                setSelectedBooking(booking);
                setIsPaymentModalOpen(true);
            } else {
                handleUpdateBookingStatus(booking.id, 'completed');
            }
        } else {
            setConfirmModal({ isOpen: true, id: booking.id, newStatus, currentStatus: booking.status, type });
        }
    };

    const executePaymentSave = async (isPaid, sendPaymentLink) => {
        setSaving(true);
        try {
            await api.put(`/shop/service-orders/${selectedBooking.id}`, { 
                status: 'completed', 
                is_paid: isPaid, 
                send_payment_link: sendPaymentLink 
            });
            setIsPaymentModalOpen(false);
            fetchShopDashboard();
            toast.success('Service order updated successfully');
        } catch (err) {
            toast.error('Failed to update order details');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateTowingStatus = async (towingId, newStatus) => {
        try {
            await api.put(`/shop/towing-orders/${towingId}`, { status: newStatus });
            fetchShopDashboard();
        } catch (err) {
            toast.error('Failed to update towing status');
        }
    };

    if (loading) {
        return (
            <div className="text-center py-16 text-slate-500">
                <i className="fas fa-spinner fa-spin text-2xl"></i>
                <p className="mt-2 text-sm">Loading shop administrator dashboard...</p>
            </div>
        );
    }

    return (
        <div className="animate-fade">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
                <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                        Service Workshop Operations
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                        {shop?.shop_name || 'Workshop Hub'} Dashboard
                    </h1>
                    <p className="text-slate-500 text-sm sm:text-base mt-1">
                        {shop?.shop_address}, {shop?.city} • Tel: {shop?.phone_number}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link
                        to="/shop/profile"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
                    >
                        <i className="fas fa-tools"></i> Manage Service Catalog
                    </Link>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-3xl font-extrabold text-slate-900">{stats?.total_service || 0}</div>
                        <div className="text-sm font-medium text-slate-500 mt-1">Service Bookings</div>
                    </div>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-blue-50 text-blue-600">
                        <i className="fas fa-wrench"></i>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-3xl font-extrabold text-slate-900">{stats?.total_towing || 0}</div>
                        <div className="text-sm font-medium text-slate-500 mt-1">Towing Inquiries</div>
                    </div>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-red-50 text-red-600">
                        <i className="fas fa-truck-pickup"></i>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-3xl font-extrabold text-slate-900">{stats?.pending_order || 0}</div>
                        <div className="text-sm font-medium text-slate-500 mt-1">Pending Action</div>
                    </div>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-amber-50 text-amber-600">
                        <i className="fas fa-hourglass-half"></i>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-3xl font-extrabold text-slate-900">{stats?.total_customer || 0}</div>
                        <div className="text-sm font-medium text-slate-500 mt-1">Total Jobs Logged</div>
                    </div>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-emerald-50 text-emerald-600">
                        <i className="fas fa-users"></i>
                    </div>
                </div>
            </div>

            {/* Recent Service Orders Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-8">
                <div className="flex justify-between items-center mb-5">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center">
                        <i className="fas fa-clipboard-list text-blue-600 mr-2"></i>
                        Recent Incoming Service Orders
                    </h2>
                    <Link to="/shop/service-orders" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                        View All ({stats?.total_service || 0}) &rarr;
                    </Link>
                </div>

                {stats?.recent_bookings?.length === 0 ? (
                    <p className="text-slate-400 text-center py-6 text-sm">No service bookings received yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="py-3 px-4">Order #</th>
                                    <th className="py-3 px-4">Customer</th>
                                    <th className="py-3 px-4">Vehicle Details</th>
                                    <th className="py-3 px-4">Schedule Date</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4">Quick Status Update</th>
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
                                        <td className="py-3 px-4 text-slate-700">{b.vehicle_info}</td>
                                        <td className="py-3 px-4 text-slate-600">{new Date(b.preferred_date).toLocaleDateString()} at {b.preferred_time}</td>
                                        <td className="py-3 px-4"><StatusBadge status={b.status} /></td>
                                        <td className="py-3 px-4">
                                            <select
                                                className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg text-slate-700 bg-white focus:outline-none focus:border-blue-600"
                                                value={b.status}
                                                onChange={(e) => handleQuickStatusDropdown(b, e.target.value, 'service')}
                                            >
                                                <option value="pending" disabled={isStatusDisabled(b.status, 'pending', 'service')}>Pending</option>
                                                <option value="confirmed" disabled={isStatusDisabled(b.status, 'confirmed', 'service')}>Confirmed</option>
                                                <option value="processing" disabled={isStatusDisabled(b.status, 'processing', 'service')}>In Progress</option>
                                                <option value="completed" disabled={isStatusDisabled(b.status, 'completed', 'service')}>Completed</option>
                                                <option value="cancelled" disabled={isStatusDisabled(b.status, 'cancelled', 'service')}>Cancelled</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Recent Towing Requests Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-5">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center">
                        <i className="fas fa-truck-pickup text-red-500 mr-2"></i>
                        Recent Incoming Towing Inquiries
                    </h2>
                    <Link to="/shop/towing-orders" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                        View All ({stats?.total_towing || 0}) &rarr;
                    </Link>
                </div>

                {stats?.recent_towing?.length === 0 ? (
                    <p className="text-slate-400 text-center py-6 text-sm">No towing requests received yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="py-3 px-4">Request #</th>
                                    <th className="py-3 px-4">Driver & Contact</th>
                                    <th className="py-3 px-4">Vehicle Details</th>
                                    <th className="py-3 px-4">Pickup Location</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4">Quick Status Update</th>
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
                                        <td className="py-3 px-4 text-slate-700">{t.vehicle_details}</td>
                                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{t.pickup_address}</td>
                                        <td className="py-3 px-4"><StatusBadge status={t.status} /></td>
                                        <td className="py-3 px-4">
                                            <select
                                                className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg text-slate-700 bg-white focus:outline-none focus:border-blue-600"
                                                value={t.status}
                                                onChange={(e) => setConfirmModal({ isOpen: true, id: t.id, newStatus: e.target.value, currentStatus: t.status, type: 'towing' })}
                                            >
                                                <option value="pending" disabled={isStatusDisabled(t.status, 'pending', 'towing')}>Looking for Driver</option>
                                                <option value="processing" disabled={isStatusDisabled(t.status, 'processing', 'towing')}>Driver En Route</option>
                                                <option value="completed" disabled={isStatusDisabled(t.status, 'completed', 'towing')}>Completed</option>
                                                <option value="cancelled" disabled={isStatusDisabled(t.status, 'cancelled', 'towing')}>Cancelled</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, id: null, newStatus: '', currentStatus: '', type: '' })}
                onConfirm={() => {
                    if (confirmModal.type === 'service') {
                        handleUpdateBookingStatus(confirmModal.id, confirmModal.newStatus);
                    } else if (confirmModal.type === 'towing') {
                        handleUpdateTowingStatus(confirmModal.id, confirmModal.newStatus);
                    }
                }}
                title="Confirm Status Change"
                message={`Are you sure you want to change the status from '${confirmModal.currentStatus}' to '${confirmModal.newStatus}'? This action cannot be undone.`}
                confirmText="Yes, Change Status"
                confirmColor="blue"
            />
            
            {/* Payment Collection Modal */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 sm:p-8 relative">
                        <button className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors" onClick={() => setIsPaymentModalOpen(false)}>
                            <i className="fas fa-times"></i>
                        </button>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-500">
                                <i className="fas fa-hand-holding-dollar text-2xl"></i>
                            </div>
                            <h2 className="text-xl font-extrabold text-slate-900">Payment Collection</h2>
                            <p className="text-sm text-slate-500 mt-2">
                                You are marking this service as completed, but payment hasn't been collected yet.
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-6">
                            <p className="text-center font-bold text-slate-700">Estimated Amount Due</p>
                            <p className="text-center text-3xl font-extrabold text-blue-600 mt-1">
                                ₹{selectedBooking?.total_cost || 0}
                            </p>
                        </div>
                        <div className="space-y-3">
                            <button
                                onClick={() => executePaymentSave(true, false)}
                                disabled={saving}
                                className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center justify-center gap-2"
                            >
                                {saving ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-check-circle"></i> Yes, Cash/UPI Collected</>}
                            </button>
                            <button
                                onClick={() => executePaymentSave(false, true)}
                                disabled={saving}
                                className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center justify-center gap-2"
                            >
                                {saving ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-paper-plane"></i> No, Send Online Payment Link</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
