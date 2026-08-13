import React from 'react';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', confirmColor = 'red', hideCancel = false }) {
    if (!isOpen) return null;

    const colorClasses = {
        red: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
        blue: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
        emerald: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500',
    };

    const confirmClass = colorClasses[confirmColor] || colorClasses.red;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade">
            <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl relative text-center">
                <button
                    className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                    onClick={onClose}
                >
                    <i className="fas fa-times"></i>
                </button>

                <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl bg-${confirmColor}-50 text-${confirmColor}-600`}>
                    <i className="fas fa-exclamation-triangle"></i>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 mb-6">{message}</p>

                <div className="flex gap-3">
                    {!hideCancel && (
                        <button
                            type="button"
                            className="flex-1 px-5 py-3 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        type="button"
                        className={`flex-1 px-5 py-3 rounded-lg text-sm font-semibold text-white transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${confirmClass}`}
                        onClick={() => {
                            if (onConfirm) onConfirm();
                            onClose();
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
