import React, { createContext, useState, useEffect, useCallback } from 'react';
import { authService, userService, setApiAccessToken, setLogoutUserCallback } from '../services/api';
import Spinner from '../components/shared/Spinner';

// Export the context itself as a named export
export const AuthContext = createContext(null);

// Define the provider component WITHOUT exporting it here
const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const setToken = useCallback((newToken) => {
        setApiAccessToken(newToken);
    }, []);

    const logout = useCallback(async () => {
        setToken(null);
        setUser(null);
        try {
            await authService.logout();
        } catch (error) {
            console.error("Logout API call failed", error);
        }
    }, [setToken]);

    const fetchProfileAndSetUser = useCallback(async (token) => {
        if (!token) {
            setUser(null);
            return;
        }
        try {
            const { data } = await userService.getProfile();
            if (data.success) {
                setUser(data.userData);
            } else {
                logout();
            }
        } catch (error) {
            console.error("Failed to fetch user profile.", error);
            logout();
        }
    }, [logout]);

    const login = useCallback(async (newToken) => {
        setToken(newToken);
        await fetchProfileAndSetUser(newToken);
    }, [setToken, fetchProfileAndSetUser]);

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const { data } = await authService.refreshAccessToken();
                setToken(data.accessToken);
                await fetchProfileAndSetUser(data.accessToken);
            } catch (error) {
                console.log("No valid session found on initial load.");
                setToken(null);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        initializeAuth();
    }, [setToken, fetchProfileAndSetUser]);

    useEffect(() => {
        setLogoutUserCallback(() => logout());
    }, [logout]);

    const isAuthenticated = !!user;

    const value = { user, setUser, isAuthenticated, login, logout, loading };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner />
            </div>
        );
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Make the component the DEFAULT EXPORT at the end of the file
export default AuthProvider;

