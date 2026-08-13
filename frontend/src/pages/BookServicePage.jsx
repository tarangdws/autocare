import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import StripePaymentModal from '../components/StripePaymentModal';

export default function BookServicePage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const preselectedServiceId = searchParams.get('serviceId');

    const [services, setServices] = useState([]);
    const [shop, setShop] = useState(null);
    const [selectedServiceIds, setSelectedServiceIds] = useState([]);

    const [formData, setFormData] = useState({
        customer_name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username : '',
        customer_phone: '',
        customer_email: user?.email || '',
        vehicle_info: '',
        preferred_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        preferred_time: '10:00',
        additional_notes: '',
        payment_method: 'cash',
    });

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Stripe modal state
    const [createdBooking, setCreatedBooking] = useState(null);
    const [isStripeOpen, setIsStripeOpen] = useState(false);

    useEffect(() => {
        const fetchServices = async () => {
            try {
                const res = await api.get('/portal/services');
                const list = res.data.services || [];
                setServices(list);
                setShop(res.data.shop || null);

                if (preselectedServiceId) {
                    const parsedId = parseInt(preselectedServiceId, 10);
                    if (list.some(s => s.id === parsedId)) {
                        setSelectedServiceIds([parsedId]);
                    }
                } else if (list.length > 0) {
                    setSelectedServiceIds([list[0].id]);
                }
            } catch (err) {
                console.error('Fetch services for booking failed:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchServices();
    }, [preselectedServiceId]);

    const handleServiceToggle = (id) => {
        if (selectedServiceIds.includes(id)) {
            if (selectedServiceIds.length > 1) {
                setSelectedServiceIds(selectedServiceIds.filter(item => item !== id));
            }
        } else {
            setSelectedServiceIds([...selectedServiceIds, id]);
        }
    };

    const totalCost = services
        .filter(s => selectedServiceIds.includes(s.id))
        .reduce((sum, item) => sum + parseFloat(item.price_starts_at), 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (selectedServiceIds.length === 0) {
            setError('Please select at least one service offering.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await api.post('/portal/book-service', {
                ...formData,
                service_ids: selectedServiceIds,
            });

            const { booking, stripe } = res.data;

            if (formData.payment_method === 'online') {
                setCreatedBooking({ ...booking, total_cost: totalCost, stripe_payment_intent_id: stripe?.payment_intent_id });
                setIsStripeOpen(true);
            } else {
                navigate(`/bookings/${booking.id}`);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create booking. Please check all fields.');
        } finally {
            setSubmitting(false);
        }
    };

    const handlePaymentSuccess = async (paymentIntentId) => {
        await api.post('/portal/payment/verify', { payment_intent_id: paymentIntentId, booking_id: createdBooking.id });
        navigate(`/bookings/${createdBooking.id}`);
    };

    if (loading) {
        return (
            <div className="text-center py-16 text-slate-500">
                <i className="fas fa-spinner fa-spin text-2xl"></i>
                <p className="mt-2 text-sm">Loading booking form...</p>
            </div>
        );
    }

    return (
        <div className="animate-fade max-w-4xl mx-auto my-4">
            <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Schedule Vehicle Service</h1>
                <p className="text-slate-500 text-sm sm:text-base mt-1">
                    Select services, schedule a convenient time slot at <strong className="text-slate-800">{shop?.shop_name || 'Assigned Workshop'}</strong>.
                </p>
            </div>

            {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-6 flex items-center">
                    <i className="fas fa-exclamation-circle mr-2"></i> {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. Choose Services */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                        <i className="fas fa-wrench text-blue-600 mr-2"></i>
                        1. Select Service Packages
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {services.map((s) => {
                            const isChecked = selectedServiceIds.includes(s.id);
                            return (
                                <div
                                    key={s.id}
                                    onClick={() => handleServiceToggle(s.id)}
                                    className={`p-4 rounded-xl cursor-pointer transition-all flex items-center justify-between border-2 ${isChecked
                                        ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                >
                                    <div>
                                        <p className="font-bold text-slate-900 text-sm sm:text-base">{s.title}</p>
                                        <p className="text-blue-600 font-extrabold text-sm mt-1">₹{parseFloat(s.price_starts_at).toFixed(2)}</p>
                                    </div>
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs transition-colors border-2 ${isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-transparent'
                                        }`}>
                                        <i className="fas fa-check"></i>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-slate-500 text-sm font-medium">Estimated Total:</span>
                        <span className="text-2xl font-extrabold text-blue-600">₹{totalCost.toFixed(2)}</span>
                    </div>
                </div>

                {/* 2. Customer & Vehicle Details */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center">
                        <i className="fas fa-car text-blue-600 mr-2"></i>
                        2. Customer & Vehicle Information
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                                value={formData.customer_name}
                                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number</label>
                            <input
                                type="tel"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                                placeholder="9876543210"
                                value={formData.customer_phone}
                                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                            <input
                                type="email"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                                value={formData.customer_email}
                                onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Vehicle Make, Model & Reg. Number</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                            placeholder="e.g. Honda City 2022 - GJ01 AB 1234"
                            value={formData.vehicle_info}
                            onChange={(e) => setFormData({ ...formData, vehicle_info: e.target.value })}
                            required
                        />
                    </div>
                </div>

                {/* 3. Date, Time & Payment Method */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center">
                        <i className="fas fa-clock text-blue-600 mr-2"></i>
                        3. Schedule Slot & Payment Method
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Preferred Date</label>
                            <input
                                type="date"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                                value={formData.preferred_date}
                                onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Preferred Time Slot</label>
                            <input
                                type="time"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                                value={formData.preferred_time}
                                onChange={(e) => setFormData({ ...formData, preferred_time: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Additional Instructions / Symptoms</label>
                        <textarea
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                            rows="3"
                            placeholder="Describe any squeaks, warning lights, or specific requests..."
                            value={formData.additional_notes}
                            onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Preference</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.payment_method === 'cash'
                                ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}>
                                <input
                                    type="radio"
                                    name="payment_method"
                                    value="cash"
                                    checked={formData.payment_method === 'cash'}
                                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <div>
                                    <p className="font-bold text-slate-900 text-sm flex items-center">
                                        <i className="fas fa-money-bill-wave text-emerald-600 mr-2"></i> Pay on Service (Cash/UPI)
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">Pay upon physical vehicle pickup</p>
                                </div>
                            </label>

                            <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.payment_method === 'online'
                                ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}>
                                <input
                                    type="radio"
                                    name="payment_method"
                                    value="online"
                                    checked={formData.payment_method === 'online'}
                                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <div>
                                    <p className="font-bold text-slate-900 text-sm flex items-center">
                                        <i className="fab fa-stripe-s text-indigo-600 mr-2"></i> Pay Online (Stripe)
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">Instant credit card payment</p>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    className="w-full py-4 px-6 rounded-xl text-base font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                    disabled={submitting}
                >
                    {submitting ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-check-circle"></i> Confirm Service Appointment</>}
                </button>
            </form>

            {/* Stripe Modal */}
            <StripePaymentModal
                isOpen={isStripeOpen}
                onClose={() => navigate(`/bookings/${createdBooking?.id}`)}
                booking={createdBooking}
                amount={totalCost}
                onPaymentSuccess={handlePaymentSuccess}
            />
        </div>
    );
}
