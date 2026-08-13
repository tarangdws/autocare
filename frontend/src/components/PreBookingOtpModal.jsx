import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function PreBookingOtpModal({ isOpen, onClose, onVerify, email }) {
    const [enteredOtp, setEnteredOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState(60);

    useEffect(() => {
        let timer;
        if (isOpen && timeLeft > 0) {
            timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
        } else if (timeLeft === 0) {
            toast.error('OTP expired. Please close and try again.');
        }
        return () => clearInterval(timer);
    }, [isOpen, timeLeft]);

    useEffect(() => {
        if (isOpen) {
            setTimeLeft(60);
            setEnteredOtp('');
            ;
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        ;
        if (!enteredOtp || enteredOtp.trim().length !== 6) {
            toast.error('Please enter a 6-digit OTP code');
            return;
        }
        if (timeLeft === 0) {
            toast.error('OTP has expired.');
            return;
        }

        setLoading(true);
        try {
            await onVerify(enteredOtp.trim());
        } catch (err) {
            toast.error(err.response?.data?.error || 'Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade">
            <div className="bg-white rounded-2xl max-w-sm w-full p-8 shadow-2xl relative text-center">
                <button
                    className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                    onClick={onClose}
                >
                    <i className="fas fa-times"></i>
                </button>

                <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 text-2xl">
                    <i className="fas fa-envelope-open-text"></i>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">Verify Your Email</h3>
                <p className="text-sm text-slate-500 mb-6">
                    We sent a 6-digit verification code to <br /><span className="font-semibold text-slate-800">{email}</span>
                </p>

                <form onSubmit={handleSubmit}>
                    

                    <input
                        type="text"
                        maxLength="6"
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 bg-slate-50 text-center text-2xl tracking-[0.5em] font-bold focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:bg-white transition-all mb-4"
                        placeholder="------"
                        value={enteredOtp}
                        onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                        disabled={timeLeft === 0}
                    />

                    <div className="flex justify-between items-center text-sm mb-6">
                        <span className="text-slate-500 font-medium">Time remaining:</span>
                        <span className={`font-bold font-mono ${timeLeft < 15 ? 'text-red-500 animate-pulse' : 'text-slate-800'}`}>
                            00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
                        </span>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading || timeLeft === 0 || enteredOtp.length !== 6}
                    >
                        {loading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-check-circle"></i> Verify & Submit</>}
                    </button>
                </form>
            </div>
        </div>
    );
}
