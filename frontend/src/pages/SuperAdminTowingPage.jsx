import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api';
import StatusBadge from '../components/StatusBadge';
import ConfirmModal from '../components/ConfirmModal';

export default function SuperAdminTowingPage() {
    const [towingList, setTowingList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    const fetchTowing = async () => {
        try {
            const res = await api.get('/admin/towing');
            setTowingList(res.data.towing || []);
        } catch (err) {
            console.error('Fetch admin towing failed:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTowing();
    }, []);

    const handleDeleteClick = (id) => {
        setItemToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await api.delete(`/admin/towing/${itemToDelete}`);
            fetchTowing();
        } catch (err) {
            toast.error('Failed to delete towing request');
        }
        setItemToDelete(null);
    };

    const filteredList = filter === 'all'
        ? towingList
        : towingList.filter(t => t.status === filter);

    if (loading) {
        return (
            <div className="text-center py-16 text-slate-500">
                <i className="fas fa-spinner fa-spin text-2xl"></i>
                <p className="mt-2 text-sm">Loading platform towing dispatches...</p>
            </div>
        );
    }

    return (
        <div className="animate-fade">
            <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Platform-Wide Towing Requests</h1>
                    <p className="text-slate-500 text-sm sm:text-base mt-1">
                        Emergency breakdown roadside dispatches logged across all service hubs.
                    </p>
                </div>
            </div>

            {/* Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
                <button
                    onClick={() => setFilter('all')}
                    className={`rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold transition-colors ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                >
                    All ({towingList.length})
                </button>
                <button
                    onClick={() => setFilter('pending')}
                    className={`rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold transition-colors ${filter === 'pending' ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                >
                    Pending Driver
                </button>
                <button
                    onClick={() => setFilter('processing')}
                    className={`rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold transition-colors ${filter === 'processing' ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                >
                    Driver En Route
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
                    <p className="text-center py-8 text-slate-500 text-sm">No towing requests matching criteria.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="py-3 px-4">Request #</th>
                                    <th className="py-3 px-4">Driver & Contact</th>
                                    <th className="py-3 px-4">Assigned Workshop</th>
                                    <th className="py-3 px-4">Vehicle Details</th>
                                    <th className="py-3 px-4">Pickup Location & Coordinates</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {filteredList.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50/50">
                                        <td className="py-3 px-4 font-bold text-slate-900">#{t.id}</td>
                                        <td className="py-3 px-4">
                                            <div className="font-semibold text-slate-900">{t.full_name}</div>
                                            <div className="text-xs text-slate-500">{t.phone_number}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="font-semibold text-red-600">{t.shop_name}</div>
                                            <div className="text-xs text-slate-500">{t.city}</div>
                                        </td>
                                        <td className="py-3 px-4 text-slate-700">{t.vehicle_details}</td>
                                        <td className="py-3 px-4 max-w-xs">
                                            <div className="truncate text-slate-800">{t.pickup_address}</div>
                                            {t.latitude && t.longitude && (
                                                <span className="text-xs text-blue-600 block mt-0.5">GPS: {t.latitude}, {t.longitude}</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4"><StatusBadge status={t.status} /></td>
                                        <td className="py-3 px-4 text-right">
                                            <button
                                                onClick={() => handleDeleteClick(t.id)}
                                                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                                                title="Delete Towing Request"
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

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setItemToDelete(null);
                }}
                onConfirm={confirmDelete}
                title="Delete Towing Request"
                message={`Are you sure you want to permanently delete Towing Request #${itemToDelete}? This action cannot be undone.`}
                confirmText="Delete Request"
                confirmColor="red"
            />
            
        </div>
    );
}
