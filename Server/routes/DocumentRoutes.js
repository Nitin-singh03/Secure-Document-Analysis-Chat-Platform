import express from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { uploadDocument, queryDocuments, getUserDocuments, getChatHistory, deleteDocument } from '../controllers/DocumentController.js';
import userAuth from '../middleware/userAuth.js';

const router = express.Router();

const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    keyGenerator: (req) => String(req.user._id),
    message: { message: 'Too many uploads, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const queryLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 30,
    keyGenerator: (req) => String(req.user._id),
    message: { message: 'Too many queries, please try again after a minute.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1
    }
});

const handleUploadMiddleware = (req, res, next) => {
    upload.single('document')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'File size must be less than 5MB' });
            }
            return res.status(400).json({ message: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ message: err.message });
        }
        next();
    });
};

router.post('/upload', userAuth, uploadLimiter, handleUploadMiddleware, uploadDocument);
router.post('/query', userAuth, queryLimiter, queryDocuments);
router.get('/documents', userAuth, getUserDocuments);
router.get('/chat/:documentId', userAuth, getChatHistory);
router.delete('/:documentId', userAuth, deleteDocument);

export default router;
