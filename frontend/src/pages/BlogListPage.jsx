import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function BlogListPage() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [author, setAuthor] = useState('');
    const [saving, setSaving] = useState(false);

    const { user, isStaff, isSuperAdmin } = useAuth();

    const fetchPosts = async () => {
        try {
            const res = await api.get('/portal/blogs');
            setPosts(res.data.posts);
        } catch (err) {
            console.error('Fetch blogs failed:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    const handleCreatePost = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/portal/blogs', {
                title,
                content,
                image_url: imageUrl,
                author: author || user?.first_name || 'AutoCare Pro Staff',
            });
            setTitle('');
            setContent('');
            setImageUrl('');
            setAuthor('');
            setShowModal(false);
            fetchPosts();
        } catch (err) {
            alert('Failed to publish post');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="animate-fade">
            <div className="flex justify-between items-center mb-10 flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Automotive Resources & Guides</h1>
                    <p className="text-slate-500 text-sm sm:text-base mt-1">Expert insights, maintenance tips, and vehicle safety advice</p>
                </div>
                {(isStaff || isSuperAdmin) && (
                    <button
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                        onClick={() => setShowModal(true)}
                    >
                        <i className="fas fa-plus"></i> Publish New Article
                    </button>
                )}
            </div>

            {loading ? (
                <div className="text-center py-16 text-slate-500">
                    <i className="fas fa-spinner fa-spin text-2xl"></i>
                    <p className="mt-2 text-sm">Loading articles...</p>
                </div>
            ) : posts.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl text-center p-12 shadow-sm">
                    <i className="fas fa-book-open text-4xl text-slate-300 mb-4 block"></i>
                    <h3 className="text-xl font-bold text-slate-800">No articles published yet</h3>
                    <p className="text-slate-500 text-sm mt-1.5">Check back soon for maintenance tips and updates.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {posts.map((post) => (
                        <div key={post.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                            {post.image_url && (
                                <img
                                    src={post.image_url}
                                    alt={post.title}
                                    className="w-full h-48 object-cover"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                            )}
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                                    <span><i className="fas fa-user-edit mr-1"></i> {post.author || 'AutoCare Expert'}</span>
                                    <span>•</span>
                                    <span><i className="fas fa-calendar-alt mr-1"></i> {new Date(post.created_at).toLocaleDateString()}</span>
                                </div>
                                <h3 className="text-lg font-bold mb-3 text-slate-900">{post.title}</h3>
                                <p className="text-slate-500 text-sm leading-relaxed flex-1">{post.content}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal for creating blog post */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade">
                    <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl relative">
                        <button
                            className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                            onClick={() => setShowModal(false)}
                        >
                            <i className="fas fa-times"></i>
                        </button>
                        <h3 className="text-xl font-bold mb-5 text-slate-900">Publish Automotive Article</h3>
                        <form onSubmit={handleCreatePost} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Article Title</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                                    placeholder="e.g. 5 Warning Signs Your Transmission Needs Servicing"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Author Name</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                                    placeholder="e.g. Senior Master Technician"
                                    value={author}
                                    onChange={(e) => setAuthor(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Cover Image URL</label>
                                <input
                                    type="url"
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                                    placeholder="https://images.unsplash.com/..."
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Article Content</label>
                                <textarea
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                                    rows="5"
                                    placeholder="Write your article insights and tips here..."
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    className="flex-1 px-5 py-2.5 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-5 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                    disabled={saving}
                                >
                                    {saving ? <i className="fas fa-spinner fa-spin"></i> : 'Publish Article'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
