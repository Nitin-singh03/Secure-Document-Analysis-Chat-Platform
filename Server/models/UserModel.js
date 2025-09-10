import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: false
    },
    photo: {
        type: String,
        default: ''
    },
    authProvider: {
        type: String,
        enum: ['credentials', 'google', 'github'],
        default: 'credentials'
    },
    providerId: {
        type: String,
        default: null
    },
    verifyOtp: {
        type: String,
        default: ''
    },
    verifyOtpExpireAt: {
        type: Number,
        default: 0
    },
    isAccountVerified: {
        type: Boolean,
        default: false
    },
    resetOtp: {
        type: String,
        default: ''
    },
    resetOtpExpireAt: {
        type: Number,
        default: 0
    },
    refreshToken: {
        type: String,
        default: ''
    }

}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
export default User;
