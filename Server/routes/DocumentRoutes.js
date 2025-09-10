import express from 'express';
import multer from 'multer';
import { uploadDocument, queryDocuments, getUserDocuments, getChatHistory, deleteDocument } from '../controllers/DocumentController.js';
import userAuth from '../middleware/userAuth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', userAuth, upload.single('document'), uploadDocument);
router.post('/query', userAuth, queryDocuments);
router.get('/documents', userAuth, getUserDocuments);
router.get('/chat/:documentId', userAuth, getChatHistory);
router.delete('/:documentId', userAuth, deleteDocument);

export default router;