import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { authService, getGoogleLoginUrl, getGithubLoginUrl } from '../services/api';
import toast from 'react-hot-toast';
import { FaUser, FaEnvelope, FaLock, FaGoogle, FaGithub } from 'react-icons/fa';
import Spinner from '../components/shared/Spinner';

const Register = () => {
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await authService.register(formData);
            if (data.success) {
                await login(data.accessToken);

                toast.success('Registration successful! Welcome.');
                navigate('/dashboard');
            } else {
                toast.error(data.message || 'Registration failed.');
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

    const fadeIn = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, ease: "easeOut" }
    };

    return (
        <div className="min-h-screen flex bg-gray-100 font-sans">
            <div className="hidden lg:flex w-1/2 items-center justify-center bg-gradient-to-br from-teal-500 to-cyan-600 text-white p-12">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    className="max-w-md text-center"
                >
                    <h1 className="text-4xl font-bold mb-4">Join the Community</h1>
                    <p className="text-lg text-cyan-100">
                        Create an account to begin your journey. Build, innovate, and connect with a world of developers.
                    </p>
                    <div className="mt-8 w-32 h-1 bg-cyan-200 rounded-full mx-auto"></div>
                </motion.div>
            </div>

            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
                <motion.div
                    variants={fadeIn}
                    initial="initial"
                    animate="animate"
                    className="max-w-md w-full"
                >
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-gray-900">Create an Account</h2>
                        <p className="text-gray-500 mt-2">Get started for free.</p>
                    </div>

                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <div className="relative">
                            <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                name="name" type="text" required
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                                placeholder="Full Name" value={formData.name} onChange={handleChange}
                            />
                        </div>
                        <div className="relative">
                            <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                name="email" type="email" required
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                                placeholder="Email address" value={formData.email} onChange={handleChange}
                            />
                        </div>
                        <div className="relative">
                            <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                name="password" type="password" required
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                                placeholder="Password" value={formData.password} onChange={handleChange}
                            />
                        </div>
                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center items-center cursor-pointer py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 transition-all hover:shadow-lg transform hover:scale-105"
                            >
                                {loading ? <Spinner /> : 'Create Account'}
                            </button>
                        </div>
                    </form>

                    <div className="my-6 flex items-center">
                        <div className="flex-grow border-t border-gray-300"></div>
                        <span className="flex-shrink mx-4 text-gray-400 text-sm">Or sign up with</span>
                        <div className="flex-grow border-t border-gray-300"></div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-3 sm:space-y-0">
                        <button onClick={() => handleOAuthLogin(getGoogleLoginUrl())} className="w-full cursor-pointer inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-red-500 hover:text-white transition-colors duration-300">
                            <FaGoogle className="mr-2" /> Google
                        </button>
                        <button onClick={() => handleOAuthLogin(getGithubLoginUrl())} className="w-full cursor-pointer inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-800 hover:text-white transition-colors duration-300">
                            <FaGithub className="mr-2" /> GitHub
                        </button>
                    </div>

                    <p className="mt-8 text-center text-sm text-gray-600">
                        Already have an account?{' '}
                        <Link to="/login" className="font-medium text-teal-600 hover:underline">
                            Sign In
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
};

export default Register;
