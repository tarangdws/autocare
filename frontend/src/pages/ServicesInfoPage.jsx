import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function ServicesInfoPage() {
    const { user } = useAuth();
    const [services, setServices] = useState([]);
    const [shop, setShop] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchServices = async () => {
            try {
                const res = await api.get('/portal/services');
                setServices(res.data.services || []);
                setShop(res.data.shop || null);
            } catch (err) {
                console.error('Fetch services failed:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchServices();
    }, []);

    if (loading) {
        return (
            <div className="text-center py-16 text-slate-500">
                <i className="fas fa-spinner fa-spin text-2xl"></i>
                <p className="mt-2 text-sm">Loading services catalog...</p>
            </div>
        );
    }

    return (
        <div className="animate-fade">
            <div className="flex justify-between items-center mb-10 flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Vehicle Maintenance & Repair Solutions</h1>
                    <p className="text-slate-500 text-sm sm:text-base mt-1">
                        Offered by <strong className="text-slate-800">{shop?.shop_name || 'AutoCare Authorized Hub'}</strong> ({shop?.city || 'Ahmedabad'})
                    </p>
                </div>
                {user && (
                    <Link
                        to="/book-service"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <i className="fas fa-calendar-plus"></i> Schedule Booking Form &rarr;
                    </Link>
                )}
            </div>

            {services.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl text-center p-14 shadow-sm">
                    <i className="fas fa-tools text-4xl text-slate-300 mb-4 block"></i>
                    <h3 className="text-xl font-bold text-slate-800">No service offerings listed yet</h3>
                    <p className="text-slate-500 text-sm mt-1.5">Please select another workshop hub in your profile settings.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                    {services.map((service) => (
                        <div key={service.id} className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-5">
                                    <div className="w-13 h-13 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl p-3">
                                        <i className={service.icon_class || 'fas fa-wrench'}></i>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs text-slate-400 uppercase font-semibold block">Starts From</span>
                                        <p className="text-2xl font-extrabold text-blue-600">₹{parseFloat(service.price_starts_at).toFixed(2)}</p>
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold mb-2 text-slate-900">{service.title}</h3>
                                <p className="text-slate-500 text-sm leading-relaxed mb-6">
                                    {service.description}
                                </p>
                            </div>

                            <Link
                                to={`/book-service?serviceId=${service.id}`}
                                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                            >
                                <i className="fas fa-check text-blue-600"></i> Select & Book Service
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
