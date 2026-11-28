import express from 'express';
import userAuth from '../middleware/userAuth.js';
import { createCollection, listCollections, deleteCollection } from '../controllers/CollectionController.js';

const router = express.Router();

router.post('/', userAuth, createCollection);
router.get('/', userAuth, listCollections);
router.delete('/:collectionId', userAuth, deleteCollection);

export default router;
