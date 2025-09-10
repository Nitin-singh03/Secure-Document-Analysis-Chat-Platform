import jwt from 'jsonwebtoken';
import userModel from '../models/UserModel.js';

const userAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: "Unauthorized: No token provided or malformed header" });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const user = await userModel.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized: User not found" });
        }
        req.user = user;

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ success: false, message: 'Unauthorized: Invalid token' });
        }

        // --- THIS IS THE CRITICAL CHANGE ---
        // When the token expires, we now send the specific error key
        // that the frontend interceptor is looking for.
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: Token expired',
                error: 'TOKEN_EXPIRED' // This key is essential for the frontend
            });
        }

        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

export default userAuth;