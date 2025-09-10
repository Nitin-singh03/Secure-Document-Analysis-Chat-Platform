import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { FaBars, FaTimes, FaShieldAlt } from 'react-icons/fa';

const Header = () => {
    const { isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Logged out successfully');
            setIsOpen(false);
            navigate('/login');
        } catch (error) {
            toast.error('Failed to log out');
        }
    };

    const activeLinkStyle = {
        color: '#4f46e5',
        fontWeight: '600',
    };

    const NavLinks = () => (
        <>
            {isAuthenticated ? (
                <>
                    <NavLink to="/dashboard" style={({ isActive }) => (isActive ? activeLinkStyle : undefined)} className="text-gray-600 hover:text-indigo-600 transition-colors duration-300 px-3 py-2 rounded-md">
                        Dashboard
                    </NavLink>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-semibold transition-transform duration-200 hover:scale-105"
                    >
                        Logout
                    </button>
                </>
            ) : (
                <>
                    <NavLink to="/login" style={({ isActive }) => (isActive ? activeLinkStyle : undefined)} className="text-gray-600 hover:text-indigo-600 transition-colors duration-300 px-3 py-2 rounded-md">
                        Login
                    </NavLink>
                    <NavLink to="/register" className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-semibold transition-transform duration-200 hover:scale-105">
                        Register
                    </NavLink>
                </>
            )}
        </>
    );

return (
        <header className="sticky top-0 z-50 bg-gradient-to-r from-slate-100/80 to-sky-100/80 backdrop-blur-sm border-b border-slate-200/60 shadow-sm">
            <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <NavLink to="/" className="transition-transform duration-300 hover:scale-110">
                        <FaShieldAlt size={32} className="text-primary" />
                    </NavLink>

                    <div className="hidden md:flex items-center space-x-4">
                        <NavLinks />
                    </div>

                    <div className="md:hidden flex items-center">
                        <button onClick={() => setIsOpen(!isOpen)} className="text-gray-600 hover:text-primary focus:outline-none">
                            {isOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
                        </button>
                    </div>
                </div>
            </nav>

            {isOpen && (
                <div className="md:hidden bg-white/95 border-t border-slate-200">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 flex flex-col items-center">
                        <NavLinks />
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;