import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api';
import StatusBadge from '../components/StatusBadge';
import OtpModal from '../components/OtpModal';
import StripePaymentModal from '../components/StripePaymentModal';

export default function BookingDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isOtpOpen, setIsOtpOpen] = useState(false);
    const [isStripeOpen, setIsStripeOpen] = useState(false);
    const [actionMsg, setActionMsg] = useState('');

    const fetchBooking = async () => {
        try {
            const res = await api.get(`/portal/bookings/${id}`);
            setBooking(res.data.booking);
        } catch (err) {
            console.error('Fetch booking detail error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBooking();
    }, [id]);

    const handleVerifyOtp = async (otpCode) => {
        const res = await api.post(`/portal/bookings/${id}/verify-otp`, { otp: otpCode });
        setActionMsg(res.data.message);
        fetchBooking();
    };

    const handlePaymentSuccess = async (paymentIntentId) => {
        await api.post('/portal/payment/verify', { payment_intent_id: paymentIntentId, booking_id: booking.id });
        setActionMsg('Payment confirmed successfully!');
        fetchBooking();
    };

    const handleCancel = async () => {
        if (window.confirm('Are you sure you want to cancel this booking?')) {
            await api.delete(`/portal/bookings/${id}`);
            fetchBooking();
        }
    };

    if (loading) {
        return (
            <div className="text-center py-16 text-slate-500">
                <i className="fas fa-spinner fa-spin text-2xl"></i>
                <p className="mt-2 text-sm">Loading booking details...</p>
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-lg mx-auto my-8 shadow-sm">
                <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-4 block"></i>
                <h2 className="text-xl font-bold text-slate-900">Booking Not Found</h2>
                <p className="text-slate-500 text-sm mt-2 mb-6">The requested service booking does not exist or has been removed.</p>
                <Link to="/service-orders" className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm">
                    Back to Orders
                </Link>
            </div>
        );
    }

    return (
        <div className="animate-fade max-w-4xl mx-auto my-4">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <div>
                    <Link to="/service-orders" className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1.5 mb-2 transition-colors">
                        <i className="fas fa-arrow-left"></i> Back to Service Orders
                    </Link>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Service Booking #{booking.id}</h1>
                </div>
                <div className="flex items-center gap-3">
                    <StatusBadge status={booking.status} />
                    {['pending', 'confirmed'].includes(booking.status) && (
                        <button
                            onClick={handleCancel}
                            className="px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors inline-flex items-center gap-1.5"
                        >
                            <i className="fas fa-ban"></i> Cancel Booking
                        </button>
                    )}
                </div>
            </div>

            {actionMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm mb-6 flex items-center">
                    <i className="fas fa-check-circle mr-2"></i> {actionMsg}
                </div>
            )}

            {/* OTP Showcase Box */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 sm:p-8 mb-8 flex justify-between items-center flex-wrap gap-4 shadow-sm">
                <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Service Security Passcode</span>
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-blue-900 tracking-widest font-mono my-1">
                        {booking.otp || '------'}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600">
                        Provide this 6-digit OTP code to your mechanic at the workshop upon pickup.
                    </p>
                </div>
                <div>
                    {booking.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-emerald-500 text-white shadow-sm">
                            <i className="fas fa-check-double"></i> Job Completed & Verified
                        </span>
                    ) : (
                        <button
                            onClick={() => setIsOtpOpen(true)}
                            className="px-6 py-3 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors inline-flex items-center gap-2"
                        >
                            <i className="fas fa-key"></i> Verify Completion OTP
                        </button>
                    )}
                </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Vehicle & Schedule Info */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center">
                        <i className="fas fa-car text-blue-600 mr-2"></i>
                        Vehicle & Schedule
                    </h3>
                    <div className="space-y-3.5 text-sm">
                        <div>
                            <span className="text-xs text-slate-400 block font-medium">Vehicle Information</span>
                            <span className="font-semibold text-slate-900">{booking.vehicle_info}</span>
                        </div>
                        <div>
                            <span className="text-xs text-slate-400 block font-medium">Scheduled Date & Time</span>
                            <span className="font-semibold text-slate-900">
                                {new Date(booking.preferred_date).toLocaleDateString()} at {booking.preferred_time}
                            </span>
                        </div>
                        <div>
                            <span className="text-xs text-slate-400 block font-medium">Workshop Hub</span>
                            <span className="font-semibold text-slate-900">{booking.shop_name} ({booking.shop_address})</span>
                        </div>
                        {booking.additional_notes && (
                            <div>
                                <span className="text-xs text-slate-400 block font-medium">Client Notes</span>
                                <span className="text-slate-700">{booking.additional_notes}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Billing & Payment Info */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center">
                        <i className="fas fa-credit-card text-blue-600 mr-2"></i>
                        Payment & Invoicing
                    </h3>
                    <div className="space-y-3.5 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500">Payment Mode:</span>
                            <span className="font-semibold text-slate-900 uppercase">{booking.payment_method}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500">Payment Status:</span>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                booking.is_paid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                                <i className={`fas ${booking.is_paid ? 'fa-check' : 'fa-clock'}`}></i>
                                {booking.is_paid ? 'Paid' : 'Unpaid'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                            <span className="font-bold text-slate-900">Total Estimated Cost:</span>
                            <span className="text-2xl font-extrabold text-blue-600">₹{booking.total_cost || 0}</span>
                        </div>

                        {!booking.is_paid && (
                            <button
                                onClick={() => setIsStripeOpen(true)}
                                className="w-full mt-3 py-3 px-4 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center justify-center gap-2 shadow-sm"
                            >
                                <i className="fab fa-stripe-s"></i> Pay ₹{booking.total_cost || 0} Online with Stripe
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Booked Services List */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                    <i className="fas fa-list-check text-blue-600 mr-2"></i>
                    Selected Service Packages
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <th className="py-3 px-4">Service Package</th>
                                <th className="py-3 px-4">Description</th>
                                <th className="py-3 px-4 text-right">Price</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {booking.services?.map((s) => (
                                <tr key={s.id} className="hover:bg-slate-50/50">
                                    <td className="py-3 px-4 font-semibold text-slate-900">{s.title}</td>
                                    <td className="py-3 px-4 text-slate-500 text-xs sm:text-sm">{s.description}</td>
                                    <td className="py-3 px-4 text-right font-bold text-blue-600">₹{parseFloat(s.price_starts_at).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* OTP Modal */}
            <OtpModal
                isOpen={isOtpOpen}
                onClose={() => setIsOtpOpen(false)}
                onVerify={handleVerifyOtp}
                currentOtp={booking.otp}
                isVerified={booking.status === 'completed'}
            />

            {/* Stripe Payment Modal */}
            <StripePaymentModal
                isOpen={isStripeOpen}
                onClose={() => setIsStripeOpen(false)}
                booking={booking}
                amount={booking.total_cost}
                onPaymentSuccess={handlePaymentSuccess}
            />
        </div>
    );
}
