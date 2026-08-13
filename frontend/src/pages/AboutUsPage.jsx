import React from 'react';
import { Link } from 'react-router-dom';

export default function AboutUsPage() {
    return (
        <div className="animate-fade max-w-4xl mx-auto my-4">
            <div className="text-center mb-12">
                <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full">
                    About AutoFusion
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-4">
                    Engineered for Precision Fleet Care & Rapid Towing
                </h1>
                <p className="text-base sm:text-lg text-slate-500 mt-3 leading-relaxed">
                    AutoFusion bridges drivers, automotive service hubs, and roadside recovery crews onto a unified intelligent digital management platform.
                </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm mb-8">
                <h2 className="text-2xl font-bold mb-4 text-slate-900">Our Core Mission</h2>
                <p className="text-slate-600 leading-relaxed mb-4">
                    Founded with the vision of eradicating vehicle maintenance uncertainties, AutoFusion provides high-transparency booking workflows, end-to-end status milestones, and guaranteed OTP-authorized handovers.
                </p>
                <p className="text-slate-600 leading-relaxed">
                    Whether you operate a personal vehicle or an entire enterprise commercial fleet, our multi-tenant network guarantees certified mechanics, instant pricing, and 24/7 GPS-enabled towing dispatch.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-white border border-slate-200 border-l-4 border-l-blue-600 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Full Transparency</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        Direct itemized pricing for every filter, inspection, and repair before confirming your appointment.
                    </p>
                </div>
                <div className="bg-white border border-slate-200 border-l-4 border-l-red-500 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Rapid Breakdown Rescue</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        Immediate GPS geolocation transmission brings the nearest flatbed tow truck straight to your location.
                    </p>
                </div>
                <div className="bg-white border border-slate-200 border-l-4 border-l-emerald-500 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">OTP Verification</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        Jobs are marked complete only after the authorized customer supplies the one-time authentication passcode.
                    </p>
                </div>
            </div>
        </div>
    );
}
