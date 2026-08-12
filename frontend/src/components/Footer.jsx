import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
    return (
        <footer className="border-t border-slate-200 py-16 pb-10 bg-white mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
                    <div>
                        <Link to="/" className="inline-flex items-center gap-2.5 text-xl font-extrabold text-slate-900 mb-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center text-white text-base shadow-sm">
                                <i className="fas fa-car-side"></i>
                            </div>
                            <span>AutoCare<span className="text-blue-600">Pro</span></span>
                        </Link>
                        <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                            The standard in professional automotive maintenance tracking and fleet intelligence.
                        </p>
                    </div>

                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Product</p>
                        <div className="flex flex-col gap-2.5">
                            <Link to="/services-info" className="text-sm text-slate-600 hover:text-blue-600 flex items-center transition-colors">
                                <i className="fas fa-wrench text-slate-300 mr-2"></i> Services
                            </Link>
                            <Link to="/dashboard" className="text-sm text-slate-600 hover:text-blue-600 flex items-center transition-colors">
                                <i className="fas fa-chart-bar text-slate-300 mr-2"></i> Dashboard
                            </Link>
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Company</p>
                        <div className="flex flex-col gap-2.5">
                            <Link to="/about" className="text-sm text-slate-600 hover:text-blue-600 flex items-center transition-colors">
                                <i className="fas fa-building text-slate-300 mr-2"></i> About Us
                            </Link>
                            <Link to="/blog" className="text-sm text-slate-600 hover:text-blue-600 flex items-center transition-colors">
                                <i className="fas fa-book-open text-slate-300 mr-2"></i> Blog
                            </Link>
                            <Link to="/contact" className="text-sm text-slate-600 hover:text-blue-600 flex items-center transition-colors">
                                <i className="fas fa-envelope text-slate-300 mr-2"></i> Contact
                            </Link>
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Emergency</p>
                        <Link to="/towing-request" className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 hover:text-red-700 px-3.5 py-2 rounded-lg transition-colors">
                            <i className="fas fa-truck-pickup"></i> Request Towing
                        </Link>
                        <p className="text-xs text-slate-400 mt-2">Available 24/7 Live Assistance</p>
                    </div>
                </div>

                <div className="mt-12 pt-6 border-t border-slate-100 flex flex-wrap justify-between items-center gap-3">
                    <p className="text-xs text-slate-400">&copy; 2026 AutoCare Pro. All rights reserved.</p>
                    <p className="text-xs text-slate-400">React + Express + PostgreSQL Edition</p>
                </div>
            </div>
        </footer>
    );
}
