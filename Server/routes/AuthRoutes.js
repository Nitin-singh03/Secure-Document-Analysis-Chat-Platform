import express from 'express';
import {
    isAuthenticated, login, logout, register, resetPassword, sendRestOtp, sendVerifyOtp, verifyEmail,
    googleLogin, googleCallback, githubLogin, githubCallback, refreshAccessToken
} from '../controllers/AuthController.js';
import userAuth from '../middleware/userAuth.js';
import {
    validate,
    registerValidation,
    loginValidation,
    verifyAccountValidation,
    sendResetOtpValidation,
    resetPasswordValidation
} from '../middleware/validators.js';

const AuthRouter = express.Router();

AuthRouter.post('/register', registerValidation, validate, register);

AuthRouter.post('/login', loginValidation, validate, login);

AuthRouter.post('/logout', logout);

AuthRouter.post('/send-verify-otp', userAuth, sendVerifyOtp);

AuthRouter.post('/verify-account', verifyAccountValidation, validate, userAuth, verifyEmail);

AuthRouter.get('/is-auth', userAuth, isAuthenticated);

AuthRouter.post('/send-reset-otp', sendResetOtpValidation, validate, sendRestOtp);

AuthRouter.post('/reset-password', resetPasswordValidation, validate, resetPassword);

AuthRouter.post('/refresh', refreshAccessToken);

AuthRouter.get('/google', googleLogin);
AuthRouter.get('/google/callback', googleCallback);

AuthRouter.get('/github', githubLogin);
AuthRouter.get('/github/callback', githubCallback);

export default AuthRouter;