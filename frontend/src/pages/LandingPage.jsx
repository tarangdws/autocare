import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
    const { user, isClient } = useAuth();

    return (
        <div className="animate-fade">
            {/* Hero Section */}
            <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 sm:p-14 lg:p-16 text-white mb-14 shadow-2xl relative overflow-hidden">
                <div className="max-w-2xl relative z-10">
                    <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/40 px-3.5 py-1.5 rounded-full text-sm font-semibold text-blue-400 mb-6">
                        <i className="fas fa-shield-alt"></i> Enterprise Fleet & Vehicle Maintenance Platform
                    </div>

                    <h1 className="text-3xl sm:text-5xl font-extrabold text-white leading-tight mb-5">
                        Smart Vehicle Care & <span className="text-blue-500">24/7 Emergency Towing</span>
                    </h1>

                    <p className="text-base sm:text-lg text-slate-300 leading-relaxed mb-10">
                        Connect seamlessly with trusted local service hubs, book scheduled maintenance with OTP security, and trigger instant GPS emergency towing assistance anytime.
                    </p>

                    <div className="flex gap-4 flex-wrap">
                        <Link
                            to={user ? (isClient ? "/services-info" : "/shop/dashboard") : "/signup"}
                            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold bg-blue-600 text-white shadow-lg transition-colors"
                        >
                            <i className="fas fa-calendar-check"></i> Book Service Offering
                        </Link>
                        <Link
                            to="/towing-request"
                            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold bg-red-600 text-white shadow-lg transition-colors"
                        >
                            <i className="fas fa-truck-pickup"></i> Request Emergency Towing
                        </Link>
                    </div>
                </div>
            </section>

            {/* Feature Cards Grid */}
            <section className="mb-16">
                <div className="text-center mb-10">
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Comprehensive Vehicle Care Solutions</h2>
                    <p className="text-slate-500 text-base mt-2">Everything you need to keep your car performing at peak efficiency</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl mb-5">
                            <i className="fas fa-oil-can"></i>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Scheduled Maintenance</h3>
                        <p className="text-slate-500 text-sm leading-relaxed">
                            Oil changes, brake inspections, tire alignment, and fluid refills with full digital history tracking.
                        </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center text-xl mb-5">
                            <i className="fas fa-truck-pickup"></i>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">24/7 Live Towing GPS</h3>
                        <p className="text-slate-500 text-sm leading-relaxed">
                            Stranded on the highway? Send live GPS coordinates for quick flatbed breakdown towing pickup.
                        </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mb-5">
                            <i className="fas fa-shield-virus"></i>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">OTP Verified Delivery</h3>
                        <p className="text-slate-500 text-sm leading-relaxed">
                            6-digit encrypted security OTP verification confirms physical completion before final job closure.
                        </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl mb-5">
                            <i className="fas fa-credit-card"></i>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Online & Offline Payments</h3>
                        <p className="text-slate-500 text-sm leading-relaxed">
                            Pay online upfront securely via Stripe or choose Cash-on-Service upon job completion.
                        </p>
                    </div>
                </div>
            </section>

            {/* Quick Stats Banner */}
            <section className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 mb-16 shadow-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    <div>
                        <p className="text-3xl sm:text-4xl font-extrabold text-blue-600">100%</p>
                        <p className="text-slate-500 text-sm mt-1">Verified Service Hubs</p>
                    </div>
                    <div>
                        <p className="text-3xl sm:text-4xl font-extrabold text-blue-600">24/7</p>
                        <p className="text-slate-500 text-sm mt-1">Emergency Towing Dispatch</p>
                    </div>
                    <div>
                        <p className="text-3xl sm:text-4xl font-extrabold text-blue-600">6-Digit</p>
                        <p className="text-slate-500 text-sm mt-1">Secure OTP Job Verification</p>
                    </div>
                    <div>
                        <p className="text-3xl sm:text-4xl font-extrabold text-blue-600">Instant</p>
                        <p className="text-slate-500 text-sm mt-1">Stripe Online Checkout</p>
                    </div>
                </div>
            </section>
        </div>
    );
}
