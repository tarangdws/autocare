import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function SuperAdminProvidersPage() {
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchProviders = async () => {
        try {
            const res = await api.get('/admin/providers');
            setProviders(res.data.providers || []);
        } catch (err) {
            console.error('Fetch admin providers failed:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProviders();
    }, []);

    const handleDelete = async (id, name) => {
        if (window.confirm(`Are you sure you want to remove Workshop Partner "${name}"? This action cannot be undone.`)) {
            try {
                await api.delete(`/admin/providers/${id}`);
                fetchProviders();
            } catch (err) {
                alert('Failed to delete workshop partner');
            }
        }
    };

    if (loading) {
        return (
            <div className="text-center py-16 text-slate-500">
                <i className="fas fa-spinner fa-spin text-2xl"></i>
                <p className="mt-2 text-sm">Loading partner workshop hubs...</p>
            </div>
        );
    }

    return (
        <div className="animate-fade">
            <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Authorized Service Hub Partners</h1>
                    <p className="text-slate-500 text-sm sm:text-base mt-1">
                        Partner repair hubs, active locations, manager credentials, and catalog status.
                    </p>
                </div>
                <Link
                    to="/admin/add-provider"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
                >
                    <i className="fas fa-plus-circle"></i> Onboard New Workshop Hub
                </Link>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                {providers.length === 0 ? (
                    <p className="text-center py-8 text-slate-500 text-sm">No workshop providers registered yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="py-3 px-4">ID</th>
                                    <th className="py-3 px-4">Workshop Business Name</th>
                                    <th className="py-3 px-4">City & Location</th>
                                    <th className="py-3 px-4">Manager Contact</th>
                                    <th className="py-3 px-4">Account Username</th>
                                    <th className="py-3 px-4">Registered On</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {providers.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50/50">
                                        <td className="py-3 px-4 font-bold text-slate-900">#{p.id}</td>
                                        <td className="py-3 px-4">
                                            <div className="font-semibold text-slate-900">{p.shop_name}</div>
                                            <div className="text-xs text-slate-500">{p.full_name}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="font-semibold text-blue-600">{p.city}</div>
                                            <div className="text-xs text-slate-500 max-w-xs truncate">
                                                {p.shop_address}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="text-slate-800">{p.phone_number || 'N/A'}</div>
                                            <div className="text-xs text-slate-500">{p.email}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <code className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono text-slate-700">{p.username}</code>
                                        </td>
                                        <td className="py-3 px-4 text-slate-600">{new Date(p.created_at).toLocaleDateString()}</td>
                                        <td className="py-3 px-4 text-right">
                                            <button
                                                onClick={() => handleDelete(p.id, p.shop_name)}
                                                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                                                title="Delete Workshop Provider"
                                            >
                                                <i className="fas fa-trash-alt"></i> Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
