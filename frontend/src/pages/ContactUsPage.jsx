import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function ContactUsPage() {
    const { user } = useAuth();
    const [shop, setShop] = useState(null);
    const [formData, setFormData] = useState({
        name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username : '',
        email: user?.email || '',
        subject: '',
        message: '',
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchShop = async () => {
            try {
                const res = await api.get('/portal/services');
                setShop(res.data.shop);
            } catch (err) {
                console.error('Fetch contact shop failed:', err);
            }
        };
        fetchShop();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        ;
        ;
        setLoading(true);

        try {
            await api.post('/portal/contact', formData);
            toast.success('Message sent successfully!');
            setFormData({ ...formData, subject: '', message: '' });
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to dispatch message. Please ensure you are logged in.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade max-w-5xl mx-auto my-4">
            <div className="text-center mb-10">
                <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full">
                    Customer Support
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-4">
                    Get in Touch with AutoFusion
                </h1>
                <p className="text-slate-500 text-sm sm:text-base mt-2">
                    Have questions about repairs, fleet pricing, or emergency towing? Send us a message directly.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Contact Information Card */}
                <div className="bg-slate-900 text-white rounded-2xl p-8 shadow-xl flex flex-col justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-6">Service Hub Contact</h3>

                        <div className="space-y-6">
                            <div className="flex gap-4 items-start">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-400 shrink-0">
                                    <i className="fas fa-store"></i>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-semibold">Assigned Workshop Hub</p>
                                    <p className="font-semibold text-base text-white">{shop?.shop_name || 'AutoFusion Main Operations Hub'}</p>
                                </div>
                            </div>

                            <div className="flex gap-4 items-start">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-400 shrink-0">
                                    <i className="fas fa-map-marker-alt"></i>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-semibold">Address & City</p>
                                    <p className="text-slate-300 text-sm">{shop?.shop_address ? `${shop.shop_address}, ${shop.city}` : '125 Central Ave, SG Highway, Ahmedabad'}</p>
                                </div>
                            </div>

                            <div className="flex gap-4 items-start">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-400 shrink-0">
                                    <i className="fas fa-phone-alt"></i>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-semibold">Phone / Hotline</p>
                                    <p className="text-slate-300 text-sm">{shop?.phone_number || '+91 (079) 9876-5432'}</p>
                                </div>
                            </div>

                            <div className="flex gap-4 items-start">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-red-400 shrink-0">
                                    <i className="fas fa-truck-pickup"></i>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-semibold">24/7 Roadside Towing</p>
                                    <p className="text-red-400 font-bold text-sm">1800-TOW-HELP (Toll Free)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-8 border-t border-white/10 pt-8">
                        <h3 className="text-xl font-bold text-white mb-6">Platform Support</h3>

                        <div className="space-y-6">
                            <div className="flex gap-4 items-start">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400 shrink-0">
                                    <i className="fas fa-headset"></i>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-semibold">24/7 Customer Care</p>
                                    <p className="font-semibold text-base text-white">support@autofusion.com</p>
                                </div>
                            </div>

                            <div className="flex gap-4 items-start">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400 shrink-0">
                                    <i className="fas fa-building"></i>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-semibold">Corporate Headquarters</p>
                                    <p className="text-slate-300 text-sm">AutoFusion Tech Park, Bengaluru, India</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                    <h3 className="text-xl font-bold text-slate-900 mb-5">Send Inquiries & Feedback</h3>

                    

                    

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Your Name</label>
                            <input
                                type="text"
                                name="name"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                                placeholder="John Doe"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                                placeholder="name@example.com"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Subject</label>
                            <input
                                type="text"
                                name="subject"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                                placeholder="e.g. Brake service inquiry / Fleet inquiry"
                                value={formData.subject}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Your Message</label>
                            <textarea
                                name="message"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                                rows="4"
                                placeholder="Describe your vehicle needs or questions..."
                                value={formData.message}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full py-3 px-5 rounded-lg text-base font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 mt-4"
                            disabled={loading}
                        >
                            {loading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-paper-plane"></i> Submit Message</>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
