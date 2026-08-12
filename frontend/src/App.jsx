import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgetPasswordPage from './pages/ForgetPasswordPage';
import AboutUsPage from './pages/AboutUsPage';
import BlogListPage from './pages/BlogListPage';
import ContactUsPage from './pages/ContactUsPage';
import ServicesInfoPage from './pages/ServicesInfoPage';

// Client Pages
import ClientDashboard from './pages/ClientDashboard';
import ClientProfilePage from './pages/ClientProfilePage';
import ClientServiceOrders from './pages/ClientServiceOrders';
import BookServicePage from './pages/BookServicePage';
import BookingDetailPage from './pages/BookingDetailPage';
import RequestTowingPage from './pages/RequestTowingPage';
import ClientTowingOrders from './pages/ClientTowingOrders';
import TowingDetailPage from './pages/TowingDetailPage';

// Shop Admin Pages
import ShopDashboard from './pages/ShopDashboard';
import ShopProfilePage from './pages/ShopProfilePage';
import ShopServiceOrders from './pages/ShopServiceOrders';
import ShopTowingOrders from './pages/ShopTowingOrders';
import ShopMessagesPage from './pages/ShopMessagesPage';

// Super Admin Pages
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import SuperAdminServicesPage from './pages/SuperAdminServicesPage';
import SuperAdminTowingPage from './pages/SuperAdminTowingPage';
import SuperAdminProvidersPage from './pages/SuperAdminProvidersPage';
import SuperAdminAddProviderPage from './pages/SuperAdminAddProviderPage';

// Route Guards
function ProtectedRoute({ children, allowStaff = false, allowSuperAdmin = false }) {
    const { user, loading, isStaff, isSuperAdmin } = useAuth();

    if (loading) {
        return (
            <div className="text-center py-20 text-slate-500">
                <i className="fas fa-spinner fa-spin text-4xl"></i>
                <p className="mt-4 font-semibold">Authenticating session...</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowSuperAdmin && !isSuperAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    if (allowStaff && !isStaff && !isSuperAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}

function MainApp() {
    return (
        <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800">
            <Navbar />
            <main className="max-w-7xl mx-auto w-full flex-1 px-4 sm:px-6 py-8 pb-16">
                <Routes>
                    {/* Public General Routes */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/forget-password" element={<ForgetPasswordPage />} />
                    <Route path="/about" element={<AboutUsPage />} />
                    <Route path="/blog" element={<BlogListPage />} />
                    <Route path="/contact" element={<ContactUsPage />} />
                    <Route path="/services-info" element={<ServicesInfoPage />} />

                    {/* Client Protected Routes */}
                    <Route path="/dashboard" element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><ClientProfilePage /></ProtectedRoute>} />
                    <Route path="/service-orders" element={<ProtectedRoute><ClientServiceOrders /></ProtectedRoute>} />
                    <Route path="/book-service" element={<ProtectedRoute><BookServicePage /></ProtectedRoute>} />
                    <Route path="/bookings/:id" element={<ProtectedRoute><BookingDetailPage /></ProtectedRoute>} />
                    <Route path="/towing-request" element={<ProtectedRoute><RequestTowingPage /></ProtectedRoute>} />
                    <Route path="/towing-orders" element={<ProtectedRoute><ClientTowingOrders /></ProtectedRoute>} />
                    <Route path="/towing/:id" element={<ProtectedRoute><TowingDetailPage /></ProtectedRoute>} />

                    {/* Shop Admin (Staff) Routes */}
                    <Route path="/shop/dashboard" element={<ProtectedRoute allowStaff={true}><ShopDashboard /></ProtectedRoute>} />
                    <Route path="/shop/profile" element={<ProtectedRoute allowStaff={true}><ShopProfilePage /></ProtectedRoute>} />
                    <Route path="/shop/service-orders" element={<ProtectedRoute allowStaff={true}><ShopServiceOrders /></ProtectedRoute>} />
                    <Route path="/shop/towing-orders" element={<ProtectedRoute allowStaff={true}><ShopTowingOrders /></ProtectedRoute>} />
                    <Route path="/shop/messages" element={<ProtectedRoute allowStaff={true}><ShopMessagesPage /></ProtectedRoute>} />

                    {/* Super Admin Routes */}
                    <Route path="/admin/dashboard" element={<ProtectedRoute allowSuperAdmin={true}><SuperAdminDashboard /></ProtectedRoute>} />
                    <Route path="/admin/services" element={<ProtectedRoute allowSuperAdmin={true}><SuperAdminServicesPage /></ProtectedRoute>} />
                    <Route path="/admin/towing" element={<ProtectedRoute allowSuperAdmin={true}><SuperAdminTowingPage /></ProtectedRoute>} />
                    <Route path="/admin/providers" element={<ProtectedRoute allowSuperAdmin={true}><SuperAdminProvidersPage /></ProtectedRoute>} />
                    <Route path="/admin/add-provider" element={<ProtectedRoute allowSuperAdmin={true}><SuperAdminAddProviderPage /></ProtectedRoute>} />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>
            <Footer />
        </div>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <MainApp />
            </BrowserRouter>
        </AuthProvider>
    );
}
