import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import userModel from '../models/UserModel.js';
import transporter from '../config/nodemailer.js';
import { EMAIL_VERIFY_TEMPLATE, PASSWORD_RESET_TEMPLATE } from '../config/emailTemplets.js';

const generateAndSetTokens = async (user, res) => {
    const accessToken = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET_KEY,
        { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
        { id: user._id },
        process.env.JWT_REFRESH_SECRET_KEY,
        { expiresIn: '7d' }
    );

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return { accessToken };
};

export const refreshAccessToken = async (req, res) => {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
        return res.status(401).json({ success: false, message: "No refresh token provided" });
    }

    try {
        const user = await userModel.findOne({ refreshToken });
        if (!user) {
            return res.status(403).json({ success: false, message: "Invalid refresh token" });
        }

        jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET_KEY, (err, decoded) => {
            if (err || user._id.toString() !== decoded.id) {
                return res.status(403).json({ success: false, message: "Refresh token verification failed" });
            }

            const accessToken = jwt.sign(
                { id: decoded.id },
                process.env.JWT_SECRET_KEY,
                { expiresIn: '15m' }
            );

            res.json({ success: true, accessToken });
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const findOrCreateUser = async (profile) => {
    let user = await userModel.findOne({ providerId: profile.id, authProvider: profile.provider });
    if (user) {
        return user;
    }

    user = await userModel.findOne({ email: profile.email });
    if (user) {
        user.authProvider = profile.provider;
        user.providerId = profile.id;
        user.photo = profile.photo || user.photo;
        await user.save();
        return user;
    }

    const newUser = new userModel({
        providerId: profile.id,
        authProvider: profile.provider,
        name: profile.name,
        email: profile.email,
        photo: profile.photo,
        isAccountVerified: true,
    });
    await newUser.save();
    return newUser;
};

export const googleLogin = (req, res) => {
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const options = {
        redirect_uri: `${process.env.SERVER_URI}/api/auth/google/callback`,
        client_id: process.env.GOOGLE_CLIENT_ID,
        access_type: 'offline',
        response_type: 'code',
        prompt: 'consent',
        scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'].join(' '),
    };
    const qs = new URLSearchParams(options).toString();
    res.redirect(`${rootUrl}?${qs}`);
};

export const googleCallback = async (req, res) => {
    const code = req.query.code;
    try {
        const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', null, {
            params: { code, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, redirect_uri: `${process.env.SERVER_URI}/api/auth/google/callback`, grant_type: 'authorization_code' },
        });
        const { access_token } = tokenResponse.data;

        const userResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${access_token}` } });
        const profile = { id: userResponse.data.sub, provider: 'google', name: userResponse.data.name, email: userResponse.data.email, photo: userResponse.data.picture };

        const user = await findOrCreateUser(profile);
        await generateAndSetTokens(user, res);
        res.redirect(`${process.env.CLIENT}/dashboard`);
    } catch (error) {
        console.error("Error in Google OAuth callback:", error.response?.data || error.message);
        res.redirect(`${process.env.CLIENT}/login?error=google_failed`);
    }
};

export const githubLogin = (req, res) => {
    const rootUrl = 'https://github.com/login/oauth/authorize';
    const options = { client_id: process.env.GITHUB_CLIENT_ID, redirect_uri: `${process.env.SERVER_URI}/api/auth/github/callback`, scope: 'read:user user:email' };
    const qs = new URLSearchParams(options).toString();
    res.redirect(`${rootUrl}?${qs}`);
};

export const githubCallback = async (req, res) => {
    const code = req.query.code;
    try {
        const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', null, { params: { code, client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, redirect_uri: `${process.env.SERVER_URI}/api/auth/github/callback` }, headers: { Accept: 'application/json' } });
        const { access_token } = tokenResponse.data;

        const userResponse = await axios.get('https://api.github.com/user', { headers: { Authorization: `Bearer ${access_token}` } });
        const emailResponse = await axios.get('https://api.github.com/user/emails', { headers: { Authorization: `Bearer ${access_token}` } });

        const primaryEmail = emailResponse.data.find(e => e.primary && e.verified)?.email;
        if (!primaryEmail) {
            return res.redirect(`${process.env.CLIENT}/login?error=github_email_not_verified`);
        }

        const profile = { id: userResponse.data.id.toString(), provider: 'github', name: userResponse.data.name || userResponse.data.login, email: primaryEmail, photo: userResponse.data.avatar_url };

        const user = await findOrCreateUser(profile);
        await generateAndSetTokens(user, res);
        res.redirect(`${process.env.CLIENT}/dashboard`);
    } catch (error) {
        console.error("Error in GitHub OAuth callback:", error.response?.data || error.message);
        res.redirect(`${process.env.CLIENT}/login?error=github_failed`);
    }
};


export const register = async (req, res) => {
    const { name, email, password } = req.body;
    
    try {
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ success: false, message: `User already exists. Please log in or use another email.` });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new userModel({ name, email, password: hashedPassword, authProvider: 'credentials' });
        await user.save();

        const mailOptions = { from: process.env.SENDER_EMAIL, to: email, subject: 'Welcome to our site', text: `Hello ${name}, Welcome to our site. \nWe are happy to see you here. Please verify your account to get started.` };
        await transporter.sendMail(mailOptions);

        const { accessToken } = await generateAndSetTokens(user, res);
        return res.json({ success: true, accessToken });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        if (user.authProvider !== 'credentials' || !user.password) {
            return res.status(403).json({ success: false, message: `You signed up with ${user.authProvider}. Please log in using that method.` });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const { accessToken } = await generateAndSetTokens(user, res);
        return res.json({ success: true, accessToken });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const logout = async (req, res) => {
    try {
        const { refreshToken } = req.cookies;
        if (refreshToken) {
            const user = await userModel.findOne({ refreshToken });
            if (user) {
                user.refreshToken = '';
                await user.save();
            }
        }
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        });
        return res.json({ success: true, message: "Logged Out Successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const sendVerifyOtp = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await userModel.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (user.isAccountVerified) {
            return res.status(400).json({ success: false, message: "Account already verified" });
        }
        
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        user.verifyOtp = otp;
        user.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000;
        await user.save();

        const mailOptions = { from: process.env.SENDER_EMAIL, to: user.email, subject: 'Account Verification OTP', html: EMAIL_VERIFY_TEMPLATE.replace("{{otp}}", otp).replace("{{email}}", user.email) };
        await transporter.sendMail(mailOptions);

        return res.status(200).json({ success: true, message: "Verification OTP sent to your email" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const verifyEmail = async (req, res) => {
    const { otp } = req.body;
    const userId = req.user._id;

    try {
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        if (user.verifyOtp !== otp) {
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }
        if (user.verifyOtpExpireAt < Date.now()) {
            return res.status(400).json({ success: false, message: "OTP expired. Please request a new one." });
        }
        
        user.isAccountVerified = true;
        user.verifyOtp = undefined;
        user.verifyOtpExpireAt = undefined;
        await user.save();
        
        return res.status(200).json({ success: true, message: "Account verified successfully" });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const isAuthenticated = (req, res) => {
    return res.status(200).json({ success: true, message: "User is authenticated" });
};

export const sendRestOtp = async (req, res) => { // Corrected function name
    const { email } = req.body;
    try {
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found with this email" });
        }
        if (user.authProvider !== 'credentials') {
            return res.status(400).json({ success: false, message: `This account is linked with ${user.authProvider}. You cannot reset password here.` });
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));
        user.resetOtp = otp;
        user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000; // 15 minutes
        await user.save();

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: 'Password Reset OTP',
            html: PASSWORD_RESET_TEMPLATE.replace("{{otp}}", otp).replace("{{email}}", user.email)
        };

        await transporter.sendMail(mailOptions);

        return res.status(200).json({ success: true, message: "Password Reset OTP sent to your email" });

    } catch (err) {
        // --- THIS IS THE IMPROVED ERROR LOGGING ---
        console.error("!!! ERROR SENDING PASSWORD RESET EMAIL !!!");
        console.error(err); // Log the full error from Nodemailer
        return res.status(500).json({ success: false, message: "An error occurred while trying to send the email." });
    }
};

export const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    
    try {
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        if (user.resetOtp !== otp) {
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }
        if (user.resetOtpExpireAt < Date.now()) {
            return res.status(400).json({ success: false, message: "OTP expired. Please request a new one." });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetOtp = undefined;
        user.resetOtpExpireAt = undefined;
        await user.save();
        
        return res.status(200).json({ success: true, message: "Password has been reset successfully" });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};