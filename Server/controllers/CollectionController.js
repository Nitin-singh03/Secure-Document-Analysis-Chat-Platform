import mongoose from 'mongoose';
import Collection from '../models/CollectionModel.js';
import Document from '../models/DocumentModel.js';
import Chunk from '../models/ChunkModel.js';
import Chat from '../models/ChatModel.js';

export const createCollection = async (req, res) => {
    try {
        const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
        const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';

        if (!name) {
            return res.status(400).json({ message: 'Collection name is required' });
        }

        const collection = await Collection.create({
            userId: req.user._id,
            name,
            description
        });

        return res.status(201).json({ collection });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'A collection with this name already exists' });
        }
        console.error('Create collection error:', error);
        return res.status(500).json({ message: 'Internal server error creating collection.' });
    }
};

export const listCollections = async (req, res) => {
    try {
        let collections = await Collection.find({ userId: req.user._id }).sort({ createdAt: 1 });
        if (collections.length === 0) {
            const defaultCol = await Collection.create({ userId: req.user._id, name: 'Default' });
            collections = [defaultCol];
        }
        return res.json({ collections });
    } catch (error) {
        console.error('List collections error:', error);
        return res.status(500).json({ message: 'Internal server error fetching collections.' });
    }
};

export const deleteCollection = async (req, res) => {
    try {
        const { collectionId } = req.params;
        if (!collectionId || !mongoose.isValidObjectId(collectionId)) {
            return res.status(400).json({ message: 'A valid collectionId is required' });
        }

        const collection = await Collection.findOne({ _id: collectionId, userId: req.user._id });
        if (!collection) {
            return res.status(404).json({ message: 'Collection not found' });
        }

        await Chunk.deleteMany({ collectionId: collection._id, userId: req.user._id });
        await Chat.deleteMany({ collectionId: collection._id, userId: req.user._id });
        await Document.deleteMany({ collectionId: collection._id, userId: req.user._id });
        await Collection.findByIdAndDelete(collection._id);

        return res.json({ message: 'Collection and all associated documents, chunks, and chats deleted successfully' });
    } catch (error) {
        console.error('Delete collection error:', error);
        return res.status(500).json({ message: 'Internal server error deleting collection.' });
    }
};
