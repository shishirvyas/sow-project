import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../config/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [menu, setMenu] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load user from token on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      loadUserProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUserProfile = async () => {
    try {
      console.log('📡 Fetching user profile from /auth/me...');
      const response = await apiFetch('/auth/me');
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Profile loaded:', { 
          user: data.user.email, 
          permissions: data.permissions.length, 
          menu: data.menu.length,
          roles: data.roles.length 
        });
        setUser(data.user);
        setPermissions(data.permissions);
        setMenu(data.menu);
        setRoles(data.roles);
        setIsAuthenticated(true);
        console.log('✅ State fully updated with profile data');
      } else {
        console.error('❌ Failed to load profile, status:', response.status);
        // Token invalid or expired - only logout if not already authenticated
        if (isAuthenticated) {
          console.warn('⚠️ Profile load failed but user already authenticated, keeping session');
        } else {
          logout();
        }
      }
    } catch (error) {
      console.error('❌ Failed to load user profile:', error);
      // Only logout if not already authenticated
      if (isAuthenticated) {
        console.warn('⚠️ Profile load error but user already authenticated, keeping session');
      } else {
        logout();
      }
    } finally {
      if (loading) {
        setLoading(false);
        console.log('🏁 Loading complete, loading state:', false);
      }
    }
  };

  const login = async (email, password) => {
    try {
      console.log('🔐 Login attempt for:', email);
      const response = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Login successful, received data:', { user: data.user.email, hasToken: !!data.access_token });
        
        // Store tokens
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        console.log('💾 Tokens stored in localStorage');
        
        // Set all user data from login response
        setUser(data.user);
        setIsAuthenticated(true);
        console.log('👤 User authenticated, will load profile next');
        
        // Load full profile (permissions, menu, roles) and wait for it
        console.log('📡 Loading full user profile...');
        try {
          const profileResponse = await apiFetch('/auth/me');
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            console.log('✅ Profile loaded:', { 
              permissions: profileData.permissions.length, 
              menu: profileData.menu.length,
              roles: profileData.roles.length 
            });
            setPermissions(profileData.permissions);
            setMenu(profileData.menu);
            setRoles(profileData.roles);
          } else {
            console.warn('⚠️ Profile load failed, using minimal permissions');
            setPermissions([]);
            setMenu([]);
            setRoles([]);
          }
        } catch (err) {
          console.error('⚠️ Profile load error, using minimal permissions:', err);
          setPermissions([]);
          setMenu([]);
          setRoles([]);
        }
        
        console.log('✅ Returning success for navigation');
        return { success: true };
      } else {
        const error = await response.json();
        console.error('❌ Login failed:', error.detail);
        return { success: false, error: error.detail || 'Login failed' };
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setPermissions([]);
    setMenu([]);
    setRoles([]);
    setIsAuthenticated(false);
  };

  const hasPermission = (permissionCode) => {
    return permissions.includes(permissionCode);
  };

  const hasAnyPermission = (...permissionCodes) => {
    return permissionCodes.some(code => permissions.includes(code));
  };

  const hasAllPermissions = (...permissionCodes) => {
    return permissionCodes.every(code => permissions.includes(code));
  };

  const hasRole = (roleName) => {
    return roles.some(role => role.name === roleName);
  };

  const value = {
    user,
    permissions,
    menu,
    roles,
    loading,
    isAuthenticated,
    login,
    logout,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    refreshProfile: loadUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
