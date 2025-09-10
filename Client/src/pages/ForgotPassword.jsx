import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authService } from '../services/api';
import Input from '../components/shared/Input';
import Button from '../components/shared/Button';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await authService.sendResetOtp(email);
            if (data.success) {
                toast.success('Password reset OTP sent to your email.');
                navigate('/reset-password', { state: { email } });
            } else {
                toast.error(data.message || 'Failed to send OTP.');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'An error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="form-container">
                <div>
                    <h2 className="form-title">Forgot Password</h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Enter your email to receive a reset OTP.
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        placeholder="Your Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <Button type="submit" disabled={loading}>
                        {loading ? 'Sending...' : 'Send OTP'}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default ForgotPassword;