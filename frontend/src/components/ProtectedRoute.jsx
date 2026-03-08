import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, requireSuperAdmin = false, requireRole = null }) => {
    const { user, isAuthenticated, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated || !user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requireSuperAdmin && !user.isSuperAdmin) {
        return <Navigate to="/" replace />; // Or to a 403 Unauhtorized page
    }

    // Basic RBAC for routes
    if (requireRole && user.role !== requireRole && user.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
