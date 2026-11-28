import express from 'express';
import rateLimit from 'express-rate-limit';
import userAuth from '../middleware/userAuth.js';
import { queryCollection, getCollectionChatHistory } from '../controllers/ChatController.js';

const router = express.Router();

const queryLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 30,
    keyGenerator: (req) => String(req.user._id),
    message: { message: 'Too many queries, please try again after a minute.' },
    standardHeaders: true,
    legacyHeaders: false
});

router.post('/query', userAuth, queryLimiter, queryCollection);
router.get('/history', userAuth, getCollectionChatHistory);

export default router;
