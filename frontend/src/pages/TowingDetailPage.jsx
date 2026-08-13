import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import StatusBadge from '../components/StatusBadge';
import OtpModal from '../components/OtpModal';

export default function TowingDetailPage() {
    const { id } = useParams();
    const [towing, setTowing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isOtpOpen, setIsOtpOpen] = useState(false);
    const [actionMsg, setActionMsg] = useState('');

    const fetchTowing = async () => {
        try {
            const res = await api.get(`/portal/towing/${id}`);
            setTowing(res.data.towing);
        } catch (err) {
            console.error('Fetch towing detail error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTowing();
    }, [id]);

    const handleVerifyOtp = async (otpCode) => {
        const res = await api.post(`/portal/towing/${id}/verify-otp`, { otp: otpCode });
        setActionMsg(res.data.message);
        fetchTowing();
    };

    const handleCancel = async () => {
        if (window.confirm('Are you sure you want to cancel this emergency towing request?')) {
            await api.delete(`/portal/towing/${id}`);
            fetchTowing();
        }
    };

    if (loading) {
        return (
            <div className="text-center py-16 text-slate-500">
                <i className="fas fa-spinner fa-spin text-2xl"></i>
                <p className="mt-2 text-sm">Loading towing request details...</p>
            </div>
        );
    }

    if (!towing) {
        return (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-lg mx-auto my-8 shadow-sm">
                <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-4 block"></i>
                <h2 className="text-xl font-bold text-slate-900">Towing Request Not Found</h2>
                <Link to="/towing-orders" className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm mt-6">
                    Back to Towing Orders
                </Link>
            </div>
        );
    }

    return (
        <div className="animate-fade max-w-4xl mx-auto my-4">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <div>
                    <Link to="/towing-orders" className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1.5 mb-2 transition-colors">
                        <i className="fas fa-arrow-left"></i> Back to Towing Requests
                    </Link>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Towing Request #{towing.id}</h1>
                </div>
                <div className="flex items-center gap-3">
                    <StatusBadge status={towing.status} />
                    {['pending', 'processing'].includes(towing.status) && (
                        <button
                            onClick={handleCancel}
                            className="px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors inline-flex items-center gap-1.5"
                        >
                            <i className="fas fa-ban"></i> Cancel Towing
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
            <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-2xl p-6 sm:p-8 mb-8 flex justify-between items-center flex-wrap gap-4 shadow-sm">
                <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-red-700">Towing Dispatch Security Passcode</span>
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-red-600 tracking-widest font-mono my-1">
                        {towing.otp || '------'}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600">
                        Share this 6-digit verification code with the flatbed tow truck driver upon vehicle handover.
                    </p>
                </div>
                <div>
                    {towing.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-emerald-500 text-white shadow-sm">
                            <i className="fas fa-check-double"></i> Tow Handover Verified & Completed
                        </span>
                    ) : (
                        <button
                            onClick={() => setIsOtpOpen(true)}
                            className="px-6 py-3 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors inline-flex items-center gap-2"
                        >
                            <i className="fas fa-key"></i> Verify Handover OTP
                        </button>
                    )}
                </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Vehicle & Contact */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center">
                        <i className="fas fa-user-circle text-red-500 mr-2"></i>
                        Driver & Breakdown Details
                    </h3>
                    <div className="space-y-3.5 text-sm">
                        <div>
                            <span className="text-xs text-slate-400 block font-medium">Driver Name</span>
                            <span className="font-semibold text-slate-900">{towing.full_name}</span>
                        </div>
                        <div>
                            <span className="text-xs text-slate-400 block font-medium">Phone Contact</span>
                            <span className="font-semibold text-slate-900">{towing.phone_number}</span>
                        </div>
                        <div>
                            <span className="text-xs text-slate-400 block font-medium">Vehicle & Breakdown Condition</span>
                            <span className="text-slate-700">{towing.vehicle_details}</span>
                        </div>
                        <div>
                            <span className="text-xs text-slate-400 block font-medium">Requested Time</span>
                            <span className="text-slate-700">{new Date(towing.requested_at).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Pickup & Location Coordinates */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center">
                        <i className="fas fa-map-marker-alt text-red-500 mr-2"></i>
                        Location & GPS Coordinates
                    </h3>
                    <div className="space-y-3.5 text-sm">
                        <div>
                            <span className="text-xs text-slate-400 block font-medium">Pickup Address</span>
                            <span className="font-semibold text-slate-900">{towing.pickup_address}</span>
                        </div>
                        {towing.latitude && towing.longitude && (
                            <div>
                                <span className="text-xs text-slate-400 block font-medium">GPS Coordinates</span>
                                <span className="text-blue-600 font-mono font-semibold">
                                    {towing.latitude}, {towing.longitude}
                                </span>
                                <a
                                    href={`https://www.google.com/maps?q=${towing.latitude},${towing.longitude}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                >
                                    <i className="fas fa-external-link-alt"></i> Open in Google Maps
                                </a>
                            </div>
                        )}
                        <div>
                            <span className="text-xs text-slate-400 block font-medium">Assigned Towing Hub</span>
                            <span className="font-semibold text-slate-900">{towing.shop_name || 'AutoCare Central Dispatch'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* OTP Modal */}
            <OtpModal
                isOpen={isOtpOpen}
                onClose={() => setIsOtpOpen(false)}
                onVerify={handleVerifyOtp}
                currentOtp={towing.otp}
                isVerified={towing.status === 'completed'}
            />
        </div>
    );
}
