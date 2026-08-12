import React, { useState, useEffect } from 'react';
import api from '../api';

export default function ShopMessagesPage() {
    const [messages, setMessages] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selectedMessage, setSelectedMessage] = useState(null);

    const fetchMessages = async () => {
        try {
            const res = await api.get('/shop/messages');
            setMessages(res.data.messages || []);
            setUnreadCount(res.data.unread_count || 0);
        } catch (err) {
            console.error('Fetch shop messages failed:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    const handleViewMessage = async (msg) => {
        setSelectedMessage(msg);
        if (!msg.is_read) {
            try {
                await api.put(`/shop/messages/${msg.id}/read`);
                fetchMessages();
            } catch (err) {
                console.error('Failed to mark read:', err);
            }
        }
    };

    const handleDeleteMessage = async (msgId) => {
        if (window.confirm('Are you sure you want to delete this message?')) {
            try {
                await api.delete(`/shop/messages/${msgId}`);
                if (selectedMessage?.id === msgId) setSelectedMessage(null);
                fetchMessages();
            } catch (err) {
                alert('Failed to delete message');
            }
        }
    };

    if (loading) {
        return (
            <div className="text-center py-16 text-slate-500">
                <i className="fas fa-spinner fa-spin text-2xl"></i>
                <p className="mt-2 text-sm">Loading messages inbox...</p>
            </div>
        );
    }

    return (
        <div className="animate-fade">
            <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Customer Inquiries Inbox</h1>
                    <p className="text-slate-500 text-sm sm:text-base mt-1">
                        Messages submitted by clients regarding maintenance questions and estimates.
                    </p>
                </div>
                {unreadCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <i className="fas fa-bell"></i> {unreadCount} Unread Messages
                    </span>
                )}
            </div>

            <div className={`grid gap-6 ${selectedMessage ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                {/* Messages Table */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    {messages.length === 0 ? (
                        <div className="text-center py-12">
                            <i className="fas fa-inbox text-4xl text-slate-300 mb-3 block"></i>
                            <h3 className="text-lg font-bold text-slate-700">No messages in inbox</h3>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="py-3 px-4">Sender</th>
                                        <th className="py-3 px-4">Subject</th>
                                        <th className="py-3 px-4">Received</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {messages.map((m) => (
                                        <tr
                                            key={m.id}
                                            className={`transition-colors ${
                                                selectedMessage?.id === m.id
                                                    ? 'bg-blue-50/50'
                                                    : !m.is_read
                                                    ? 'bg-slate-50 font-semibold'
                                                    : 'hover:bg-slate-50/50'
                                            }`}
                                        >
                                            <td className="py-3 px-4">
                                                <div className="text-slate-900">{m.name}</div>
                                                <div className="text-xs text-slate-500 font-normal">{m.email}</div>
                                            </td>
                                            <td className="py-3 px-4 max-w-xs truncate text-slate-800">
                                                {m.subject}
                                            </td>
                                            <td className="py-3 px-4 text-xs text-slate-500 font-normal">
                                                {new Date(m.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                    m.is_read ? 'bg-slate-100 text-slate-700' : 'bg-blue-50 text-blue-700 border border-blue-200'
                                                }`}>
                                                    {m.is_read ? 'Read' : 'New'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="inline-flex gap-1.5">
                                                    <button
                                                        onClick={() => handleViewMessage(m)}
                                                        className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors inline-flex items-center gap-1"
                                                    >
                                                        <i className="fas fa-eye"></i> View
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteMessage(m.id)}
                                                        className="px-2.5 py-1 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors inline-flex items-center gap-1"
                                                    >
                                                        <i className="fas fa-trash-alt"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Single Message Reader Box */}
                {selectedMessage && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm border-l-4 border-l-blue-600 animate-fade">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-lg font-bold text-slate-900">Message Details</h3>
                            <button
                                className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                                onClick={() => setSelectedMessage(null)}
                            >
                                <i className="fas fa-times"></i> Close
                            </button>
                        </div>

                        <div className="border-b border-slate-100 pb-4 mb-4">
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Subject</p>
                            <h4 className="text-base font-bold text-slate-900 mt-1">{selectedMessage.subject}</h4>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div>
                                <p className="text-xs text-slate-500">From</p>
                                <p className="font-semibold text-slate-900 text-sm">{selectedMessage.name}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Email</p>
                                <a href={`mailto:${selectedMessage.email}`} className="text-blue-600 hover:underline font-semibold text-sm">{selectedMessage.email}</a>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                            {selectedMessage.message}
                        </div>

                        <div className="mt-6 flex gap-3">
                            <a
                                href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(selectedMessage.subject)}`}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
                            >
                                <i className="fas fa-reply"></i> Reply via Email
                            </a>
                            <button
                                onClick={() => handleDeleteMessage(selectedMessage.id)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
                            >
                                <i className="fas fa-trash-alt"></i> Delete
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
