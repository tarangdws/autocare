import React from 'react';

export default function StatusBadge({ status }) {
    const s = (status || '').toLowerCase();
    
    let colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
    let icon = 'fa-clock';
    let label = status;

    if (s === 'pending') {
        colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
        icon = 'fa-clock';
        label = 'Pending Confirmation';
    } else if (s === 'confirmed') {
        colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
        icon = 'fa-check-circle';
        label = 'Confirmed';
    } else if (s === 'processing') {
        colorClasses = 'bg-indigo-50 text-indigo-700 border-indigo-200';
        icon = 'fa-spinner fa-spin';
        label = 'In Progress';
    } else if (s === 'completed') {
        colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        icon = 'fa-check-double';
        label = 'Completed';
    } else if (s === 'cancelled') {
        colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
        icon = 'fa-times-circle';
        label = 'Cancelled';
    }

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClasses}`}>
            <i className={`fas ${icon}`}></i> {label}
        </span>
    );
}
