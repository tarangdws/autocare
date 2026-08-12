import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('autocare_token') || null);
    const [loading, setLoading] = useState(true);

    const fetchCurrentUser = async () => {
        if (!token) {
            setUser(null);
            setProfile(null);
            setLoading(false);
            return;
        }
        try {
            const res = await api.get('/auth/me');
            setUser(res.data.user);
            setProfile(res.data.profile);
        } catch (err) {
            console.error('Fetch user failed:', err);
            logout();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCurrentUser();
    }, [token]);

    const login = (authToken, userData) => {
        localStorage.setItem('autocare_token', authToken);
        setToken(authToken);
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('autocare_token');
        setToken(null);
        setUser(null);
        setProfile(null);
    };

    const value = {
        user,
        profile,
        token,
        loading,
        login,
        logout,
        refreshUser: fetchCurrentUser,
        isGuest: !user,
        isClient: user && !user.is_staff && !user.is_superuser,
        isStaff: user && user.is_staff && !user.is_superuser,
        isSuperAdmin: user && user.is_superuser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
