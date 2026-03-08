import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        // Check initial auth state
        const token = localStorage.getItem('pos_token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                if (decoded.exp * 1000 > Date.now()) {
                    setUser(decoded);
                    setIsAuthenticated(true);
                } else {
                    // Token expired, let interceptor handle if refresh works, else local storage cleared there
                    checkBackendProfile();
                }
            } catch (e) {
                localStorage.removeItem('pos_token');
            }
        }

        checkBackendProfile();

        // Listen to unauthorized events from interceptor
        const handleUnauthorized = () => {
            setUser(null);
            setIsAuthenticated(false);
        };

        window.addEventListener('auth:unauthorized', handleUnauthorized);
        return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
    }, []);

    const checkBackendProfile = async () => {
        if (!localStorage.getItem('pos_token')) {
            setLoading(false);
            return;
        }
        try {
            const res = await authApi.getProfile();
            if (res.success) {
                const fullUser = res.data.user;
                setUser({ ...jwtDecode(localStorage.getItem('pos_token')), ...fullUser }); // Merge
                setIsAuthenticated(true);
            }
        } catch (error) {
            console.log('Session verification failed');
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password, isSuperAdmin = false) => {
        try {
            const res = await authApi.login({ email, password, isSuperAdmin });
            if (res.success) {
                localStorage.setItem('pos_token', res.data.token);
                if (res.data.user.tenant_id) {
                    localStorage.setItem('pos_tenant_id', res.data.user.tenant_id);
                }

                // Get the boolean flags encoded in the JWT
                const decoded = jwtDecode(res.data.token);
                setUser({ ...res.data.user, ...decoded });

                setIsAuthenticated(true);
                return { success: true };
            }
        } catch (error) {
            return { success: false, message: error.message || 'Login failed' };
        }
    };

    const registerTenant = async (data) => {
        try {
            const res = await authApi.registerTenant(data);
            if (res.success) {
                // Auto login could happen here, or require them to login
                return { success: true };
            }
        } catch (error) {
            return { success: false, message: error.message || 'Registration failed' };
        }
    };

    const logout = async () => {
        try {
            await authApi.logout();
        } catch (e) {
            // Ignore error on logout
        }
        localStorage.removeItem('pos_token');
        localStorage.removeItem('pos_tenant_id');
        setUser(null);
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, loading, login, registerTenant, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
