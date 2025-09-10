import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService, getGoogleLoginUrl, getGithubLoginUrl } from '../services/api';
import toast from 'react-hot-toast';
import { FaGoogle, FaGithub, FaEnvelope, FaLock } from 'react-icons/fa';
import Spinner from '../components/shared/Spinner';

const Login = () => {
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await authService.login(credentials);
            if (data.success) {
                await login(data.accessToken);

                toast.success('Login successful! Welcome back.');
                navigate('/dashboard');
            } else {
                toast.error(data.message || 'Login failed.');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'An error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const handleOAuthLogin = (url) => {
        window.location.href = url;
    };

    return (
        <div className="min-h-screen flex bg-gray-50">

            <div className="hidden lg:flex w-1/2 items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-12">
                <div className="max-w-md text-center">
                    <h1 className="text-4xl font-bold mb-4">Welcome Back!</h1>
                    <p className="text-lg text-indigo-100">
                        Sign in to unlock a world of possibilities. Your next great idea awaits.
                    </p>
                    <div className="mt-8 w-32 h-1 bg-indigo-200 rounded-full mx-auto"></div>
                </div>
            </div>


            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
                <div className="max-w-md w-full animate-fadeIn">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-gray-900">Sign In</h2>
                        <p className="text-gray-500 mt-2">Access your account and continue your journey.</p>
                    </div>

                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <div className="relative">
                            <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                placeholder="Email address"
                                value={credentials.email}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="relative">
                            <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                placeholder="Password"
                                value={credentials.password}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="text-right text-sm">
                            <Link to="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline">
                                Forgot password?
                            </Link>
                        </div>
                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex cursor-pointer justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all hover:shadow-lg hover:scale-105"
                            >
                                {loading ? <Spinner /> : 'Sign In Securely'}
                            </button>
                        </div>
                    </form>

                    <div className="my-6 flex items-center">
                        <div className="flex-grow border-t border-gray-300"></div>
                        <span className="flex-shrink mx-4 text-gray-400 text-sm">Or continue with</span>
                        <div className="flex-grow border-t border-gray-300"></div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-3 sm:space-y-0">
                        <button
                            onClick={() => handleOAuthLogin(getGoogleLoginUrl())}
                            className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-red-500 hover:text-white transition-colors duration-300 cursor-pointer"
                            type="button"
                            aria-label="Sign in with Google"
                        >
                            <FaGoogle className="mr-2" /> Google
                        </button>

                        <button
                            onClick={() => handleOAuthLogin(getGithubLoginUrl())}
                            className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-800 hover:text-white transition-colors duration-300 cursor-pointer"
                            type="button"
                            aria-label="Sign in with GitHub"
                        >
                            <FaGithub className="mr-2" /> GitHub
                        </button>
                    </div>

                    <p className="mt-8 text-center text-sm text-gray-600">
                        Don't have an account?{' '}
                        <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline">
                            Create one now
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
