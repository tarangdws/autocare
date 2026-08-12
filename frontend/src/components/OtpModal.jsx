import React, { useState } from 'react';

export default function OtpModal({ isOpen, onClose, onVerify, currentOtp, isVerified }) {
    const [enteredOtp, setEnteredOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!enteredOtp || enteredOtp.trim().length !== 6) {
            setError('Please enter a 6-digit OTP code');
            return;
        }

        setLoading(true);
        try {
            await onVerify(enteredOtp.trim());
            setEnteredOtp('');
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl relative">
                <button
                    className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                    onClick={onClose}
                >
                    <i className="fas fa-times"></i>
                </button>

                <div className="text-center mb-6">
                    <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 text-2xl">
                        <i className="fas fa-key"></i>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Job Confirmation OTP</h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Share this 6-digit security OTP code with your service shop mechanic upon arrival to verify completion.
                    </p>
                </div>

                {currentOtp && (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-5 text-center mb-6">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Your 6-Digit OTP Code</p>
                        <div className="text-3xl sm:text-4xl font-extrabold tracking-widest text-blue-600 font-mono">
                            {currentOtp}
                        </div>
                        {isVerified && (
                            <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                <i className="fas fa-check-double"></i> Verified & Completed
                            </span>
                        )}
                    </div>
                )}

                {!isVerified && onVerify && (
                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4 flex items-center">
                                <i className="fas fa-exclamation-circle mr-2"></i> {error}
                            </div>
                        )}

                        <div className="mb-5">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Enter Verification OTP</label>
                            <input
                                type="text"
                                maxLength="6"
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 bg-white text-center text-xl tracking-widest font-bold focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                                placeholder="e.g. 784920"
                                value={enteredOtp}
                                onChange={(e) => setEnteredOtp(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                type="button"
                                className="flex-1 px-5 py-3 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                                onClick={onClose}
                            >
                                Close
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-5 py-3 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                disabled={loading}
                            >
                                {loading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-check"></i> Verify & Complete</>}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
