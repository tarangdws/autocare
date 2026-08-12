import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
    const { user, isGuest, isClient, isStaff, isSuperAdmin, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const linkClasses = ({ isActive }) =>
        `inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
            isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`;

    return (
        <nav className="sticky top-0 z-50 h-[72px] bg-white/95 backdrop-blur-md border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
                {/* Left Side: Logo + Navigation Links */}
                <div className="flex items-center gap-6 flex-1 min-w-0">
                    {/* Logo */}
                    <Link to="/" className="inline-flex items-center gap-2.5 text-xl font-extrabold text-slate-900 flex-shrink-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center text-white text-base shadow-sm">
                            <i className="fas fa-car-side"></i>
                        </div>
                        <span>AutoCare<span className="text-blue-600">Pro</span></span>
                    </Link>

                    {/* Nav Links based on Role */}
                    <div className="hidden lg:flex items-center gap-1 overflow-x-auto py-1">
                        {/* Guest & Client Links */}
                        {(isGuest || isClient) && (
                            <>
                                <NavLink to="/services-info" className={linkClasses}>
                                    <i className="fas fa-wrench"></i> Solutions
                                </NavLink>
                                <NavLink
                                    to="/towing-request"
                                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 hover:text-red-700 transition-colors whitespace-nowrap"
                                >
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                                    <i className="fas fa-truck-pickup"></i> Emergency Towing
                                </NavLink>
                                <NavLink to="/blog" className={linkClasses}>
                                    <i className="fas fa-book-open"></i> Resources
                                </NavLink>
                                <NavLink to="/about" className={linkClasses}>
                                    <i className="fas fa-building"></i> Company
                                </NavLink>
                                <NavLink to="/contact" className={linkClasses}>
                                    <i className="fas fa-envelope"></i> Contact
                                </NavLink>
                            </>
                        )}

                        {/* Shop Admin (Staff) Links */}
                        {isStaff && (
                            <>
                                <NavLink to="/shop/dashboard" className={linkClasses}>
                                    <i className="fas fa-chart-line"></i> Shop Dashboard
                                </NavLink>
                                <NavLink to="/shop/service-orders" className={linkClasses}>
                                    <i className="fas fa-clipboard-list"></i> Service Orders
                                </NavLink>
                                <NavLink to="/shop/towing-orders" className={linkClasses}>
                                    <i className="fas fa-truck-monster"></i> Towing Requests
                                </NavLink>
                                <NavLink to="/shop/messages" className={linkClasses}>
                                    <i className="fas fa-inbox"></i> Messages Inbox
                                </NavLink>
                                <NavLink to="/shop/profile" className={linkClasses}>
                                    <i className="fas fa-store"></i> Shop Profile
                                </NavLink>
                            </>
                        )}

                        {/* Super Admin Links */}
                        {isSuperAdmin && (
                            <>
                                <NavLink to="/admin/dashboard" className={linkClasses}>
                                    <i className="fas fa-user-shield"></i> Admin Panel
                                </NavLink>
                                <NavLink to="/admin/services" className={linkClasses}>
                                    <i className="fas fa-tasks"></i> All Services
                                </NavLink>
                                <NavLink to="/admin/towing" className={linkClasses}>
                                    <i className="fas fa-truck-pickup"></i> All Towing
                                </NavLink>
                                <NavLink to="/admin/providers" className={linkClasses}>
                                    <i className="fas fa-store-alt"></i> Providers
                                </NavLink>
                                <NavLink to="/admin/add-provider" className={linkClasses}>
                                    <i className="fas fa-plus-circle"></i> Add Provider
                                </NavLink>
                            </>
                        )}
                    </div>
                </div>

                {/* Right Auth Actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    {user ? (
                        <>
                            {isClient && (
                                <Link
                                    to="/dashboard"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                                >
                                    <i className="fas fa-chart-bar"></i> Dashboard
                                </Link>
                            )}
                            {isClient && (
                                <Link
                                    to="/profile"
                                    className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 text-white text-sm flex items-center justify-center shadow-sm hover:opacity-90 transition-opacity"
                                    title="My Profile"
                                >
                                    <i className="fas fa-user"></i>
                                </Link>
                            )}
                            <button
                                onClick={handleLogout}
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Sign out"
                            >
                                <i className="fas fa-sign-out-alt"></i> Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                            >
                                <i className="fas fa-sign-in-alt"></i> Sign in
                            </Link>
                            <Link
                                to="/signup"
                                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
                            >
                                Get started &rarr;
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
