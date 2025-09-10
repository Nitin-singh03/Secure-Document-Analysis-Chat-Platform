import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authService } from '../services/api';
import Input from '../components/shared/Input';
import Button from '../components/shared/Button';

const ResetPassword = () => {
    const [formData, setFormData] = useState({ otp: '', newPassword: '' });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email;

    if (!email) {
        navigate('/forgot-password');
        toast.error("Please enter your email first.");
        return null;
    }

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = { ...formData, email };
            const { data } = await authService.resetPassword(payload);
            if (data.success) {
                toast.success('Password reset successfully!');
                navigate('/login');
            } else {
                toast.error(data.message || 'Failed to reset password.');
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
                    <h2 className="form-title">Reset Your Password</h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm space-y-4">
                        <Input type="text" value={email} disabled />
                        <Input
                            name="otp"
                            placeholder="Enter OTP"
                            value={formData.otp}
                            onChange={handleChange}
                            required
                        />
                        <Input
                            name="newPassword"
                            type="password"
                            placeholder="Enter New Password"
                            value={formData.newPassword}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <Button type="submit" disabled={loading}>
                        {loading ? 'Resetting...' : 'Reset Password'}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;