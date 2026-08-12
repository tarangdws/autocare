import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function RequestTowingPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        full_name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username : '',
        phone_number: '',
        vehicle_details: '',
        pickup_address: '',
        latitude: '',
        longitude: '',
    });

    const [locationLoading, setLocationLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [gpsSuccess, setGpsSuccess] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            return;
        }

        setLocationLoading(true);
        setError('');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormData(prev => ({
                    ...prev,
                    latitude: position.coords.latitude.toFixed(6),
                    longitude: position.coords.longitude.toFixed(6),
                    pickup_address: prev.pickup_address || `GPS Coordinates: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
                }));
                setGpsSuccess(true);
                setLocationLoading(false);
            },
            (err) => {
                console.warn('Geolocation error:', err.message);
                // Fallback default coordinates if permission denied
                setFormData(prev => ({
                    ...prev,
                    latitude: '23.022500',
                    longitude: '72.571400',
                }));
                setGpsSuccess(true);
                setLocationLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.full_name || !formData.phone_number || !formData.vehicle_details || !formData.pickup_address) {
            setError('Please fill in all required breakdown details.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await api.post('/portal/towing', formData);
            const { towing } = res.data;
            navigate(`/towing/${towing.id}`);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to dispatch towing request. Please ensure you are logged in.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="animate-fade max-w-3xl mx-auto my-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-700 rounded-2xl p-8 sm:p-10 text-white mb-8 shadow-xl shadow-red-500/20">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">
                        <i className="fas fa-truck-pickup"></i>
                    </div>
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-red-100 block">
                            24/7 Roadside Assistance
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                            Emergency Towing Request
                        </h1>
                    </div>
                </div>
                <p className="text-red-100 text-sm sm:text-base leading-relaxed">
                    Immediate breakdown rescue service. Enter your vehicle location or use browser GPS to transmit instant coordinates to the nearest tow truck driver.
                </p>
            </div>

            {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-6 flex items-center">
                    <i className="fas fa-exclamation-circle mr-2"></i> {error}
                </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                            <i className="fas fa-user-circle text-red-500 mr-2"></i>
                            Driver & Vehicle Details
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    name="full_name"
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                                    placeholder="John Doe"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Active Contact Number</label>
                                <input
                                    type="tel"
                                    name="phone_number"
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                                    placeholder="9876543210"
                                    value={formData.phone_number}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Vehicle Make, Model & Condition</label>
                            <input
                                type="text"
                                name="vehicle_details"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                                placeholder="e.g. White Toyota Fortuner (Flat tire & Engine overheat)"
                                value={formData.vehicle_details}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                            <i className="fas fa-map-marker-alt text-red-500 mr-2"></i>
                            Breakdown Location & GPS
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-sm font-semibold text-slate-700">Pickup Address / Landmark</label>
                                    <button
                                        type="button"
                                        onClick={handleGetLocation}
                                        className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 px-3 py-1 text-xs font-semibold rounded-lg transition-colors"
                                        disabled={locationLoading}
                                    >
                                        {locationLoading ? (
                                            <><i className="fas fa-spinner fa-spin"></i> Detecting GPS...</>
                                        ) : (
                                            <><i className="fas fa-crosshairs"></i> Use My Current GPS Location</>
                                        )}
                                    </button>
                                </div>
                                <textarea
                                    name="pickup_address"
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                                    rows="3"
                                    placeholder="e.g. Near Iscon Bridge exit, SG Highway northbound lane"
                                    value={formData.pickup_address}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">GPS Latitude</label>
                                    <input
                                        type="text"
                                        name="latitude"
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                                        placeholder="23.022500"
                                        value={formData.latitude}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">GPS Longitude</label>
                                    <input
                                        type="text"
                                        name="longitude"
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                                        placeholder="72.571400"
                                        value={formData.longitude}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {gpsSuccess && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center">
                            <i className="fas fa-satellite-dish mr-2"></i> GPS location locked: [{formData.latitude}, {formData.longitude}]
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full py-3.5 px-5 rounded-xl text-base font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/25 transition-colors flex items-center justify-center gap-2"
                        disabled={submitting}
                    >
                        {submitting ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-paper-plane"></i> Dispatch Emergency Tow Truck</>}
                    </button>
                </form>
            </div>
        </div>
    );
}
