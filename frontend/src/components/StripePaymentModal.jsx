import React, { useState } from 'react';
import toast from 'react-hot-toast';

export default function StripePaymentModal({ isOpen, onClose, booking, amount, onPaymentSuccess }) {
    const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
    const [expDate, setExpDate] = useState('12/28');
    const [cvc, setCvc] = useState('123');
    const [loading, setLoading] = useState(false);

    if (!isOpen || !booking) return null;

    const handlePay = async (e) => {
        e.preventDefault();
        setLoading(true);
        ;

        try {
            // Simulate Stripe API checkout call
            setTimeout(async () => {
                try {
                    await onPaymentSuccess(booking.stripe_payment_intent_id || `pi_mock_${booking.id}`);
                    setLoading(false);
                    onClose();
                } catch (err) {
                    toast.error('Payment verification error. Please try again.');
                    setLoading(false);
                }
            }, 1200);
        } catch (err) {
            toast.error('Stripe payment failed.');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade">
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl relative">
                <button
                    className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                    onClick={onClose}
                >
                    <i className="fas fa-times"></i>
                </button>

                <div className="text-center mb-6">
                    <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 text-2xl">
                        <i className="fab fa-stripe-s"></i>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Stripe Online Payment</h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Secure SSL 256-Bit Encrypted Payment
                    </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 flex justify-between items-center">
                    <div>
                        <p className="text-xs text-slate-500">Total Service Bill</p>
                        <p className="text-lg font-bold text-slate-900">Booking #{booking.id}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-extrabold text-blue-600">₹{amount || booking.total_cost || 0}</p>
                        <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-semibold">Stripe Test Mode</span>
                    </div>
                </div>

                

                <form onSubmit={handlePay} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Card Number</label>
                        <div className="relative">
                            <input
                                type="text"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                                value={cardNumber}
                                onChange={(e) => setCardNumber(e.target.value)}
                                required
                            />
                            <i className="fab fa-cc-visa absolute right-3 top-1/2 -translate-y-1/2 text-xl text-blue-800"></i>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Expiry Date</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                                value={expDate}
                                onChange={(e) => setExpDate(e.target.value)}
                                placeholder="MM/YY"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">CVC Code</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                                value={cvc}
                                onChange={(e) => setCvc(e.target.value)}
                                placeholder="123"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 px-5 rounded-lg text-base font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 mt-4"
                        disabled={loading}
                    >
                        {loading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-lock"></i> Pay ₹{amount || booking.total_cost || 0} Now</>}
                    </button>
                </form>
            </div>
        </div>
    );
}
