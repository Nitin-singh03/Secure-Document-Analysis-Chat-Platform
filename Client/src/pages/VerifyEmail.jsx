import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, userService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import Input from '../components/shared/Input';
import Button from '../components/shared/Button';

const VerifyEmail = () => {
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { setUser } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!/^\d{6}$/.test(otp)) {
            toast.error('OTP must be 6 digits.');
            return;
        }
        setLoading(true);
        try {
            const { data } = await authService.verifyAccount({ otp });
            if (data.success) {
                try {
                    const { data: profileData } = await userService.getProfile();
                    if (profileData.success) {
                        setUser(profileData.userData);
                    }
                } catch (profileError) {
                    console.error('Profile fetch failed:', profileError);
                }
                toast.success('Account verified successfully!');
                navigate('/dashboard');
            } else {
                toast.error(data.message || 'Verification failed.');
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
                    <h2 className="form-title">Verify Your Account</h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Enter the 6-digit OTP sent to your email.
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <Input
                        id="otp"
                        name="otp"
                        type="text"
                        maxLength="6"
                        required
                        placeholder="Enter OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                    />
                    <Button type="submit" disabled={loading}>
                        {loading ? 'Verifying...' : 'Verify'}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default VerifyEmail;
