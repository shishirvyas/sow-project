import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredPermission, requiredRole }) => {
  const { isAuthenticated, loading, hasPermission, hasRole } = useAuth();

  console.log('🛡️ ProtectedRoute check:', { 
    isAuthenticated, 
    loading, 
    requiredPermission, 
    requiredRole,
    path: window.location.pathname 
  });

  if (loading) {
    console.log('⏳ Still loading, showing spinner...');
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    console.log('❌ Not authenticated, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  // Check permission if required
  if (requiredPermission && !hasPermission(requiredPermission)) {
    console.log('❌ Missing permission:', requiredPermission, 'redirecting to /unauthorized');
    return <Navigate to="/unauthorized" replace />;
  }

  // Check role if required
  if (requiredRole && !hasRole(requiredRole)) {
    console.log('❌ Missing role:', requiredRole, 'redirecting to /unauthorized');
    return <Navigate to="/unauthorized" replace />;
  }

  console.log('✅ Access granted, rendering protected content');
  return children;
};

export default ProtectedRoute;
