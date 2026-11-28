import mongoose from 'mongoose';
import Collection from '../models/CollectionModel.js';
import Document from '../models/DocumentModel.js';
import Chat from '../models/ChatModel.js';
import { answerQuestion } from '../rag/answer.js';

const buildScopeKey = (collectionId, documentIds) => {
    if (Array.isArray(documentIds) && documentIds.length === 1) {
        return `${collectionId}:${documentIds[0]}`;
    }
    return `${collectionId}:*`;
};

export const queryCollection = async (req, res) => {
    try {
        const { collectionId, documentIds, filters, question } = req.body || {};

        if (!collectionId || !mongoose.isValidObjectId(collectionId)) {
            return res.status(400).json({ message: 'A valid collectionId is required' });
        }

        if (!question || typeof question !== 'string' || question.trim().length === 0) {
            return res.status(400).json({ message: 'A non-empty question string is required' });
        }

        if (question.length > 2000) {
            return res.status(400).json({ message: 'Question exceeds maximum length of 2000 characters' });
        }

        if (documentIds !== undefined) {
            if (!Array.isArray(documentIds) || documentIds.some((id) => !mongoose.isValidObjectId(id))) {
                return res.status(400).json({ message: 'documentIds must be an array of valid IDs' });
            }
        }

        const collection = await Collection.findOne({ _id: collectionId, userId: req.user._id });
        if (!collection) {
            return res.status(404).json({ message: 'Collection not found.' });
        }

        const scopeKey = buildScopeKey(collectionId, documentIds);
        const chat = await Chat.findOne({ userId: req.user._id, scopeKey });
        const recent = (chat?.messages ?? []).slice(-6);

        const { answer, sources, trace } = await answerQuestion({
            userId: req.user._id,
            collectionId,
            documentIds,
            filters,
            question,
            history: recent
        });

        if (!answer) {
            const docQuery = { userId: req.user._id, collectionId };
            if (Array.isArray(documentIds) && documentIds.length > 0) {
                docQuery._id = { $in: documentIds };
            }
            const latestDoc = await Document.findOne(docQuery)
                .select('createdAt')
                .sort({ createdAt: -1 });
            const stillIndexing = latestDoc && (Date.now() - new Date(latestDoc.createdAt).getTime() < 60_000);
            if (stillIndexing) {
                return res.json({
                    answer: 'This document is still being indexed. Please try again in a few seconds.',
                    sources: [],
                    meta: { scopeKey, trace }
                });
            }

            const noMatchAnswer = 'I could not find any relevant sections in this collection to answer your question.';
            await Chat.updateOne(
                { userId: req.user._id, scopeKey },
                {
                    $push: {
                        messages: {
                            $each: [
                                { type: 'user', content: question, timestamp: new Date() },
                                { type: 'ai', content: noMatchAnswer, sources: [], timestamp: new Date() }
                            ]
                        }
                    },
                    $set: { collectionId, updatedAt: new Date() },
                    $setOnInsert: { createdAt: new Date() }
                },
                { upsert: true }
            );
            return res.json({ answer: noMatchAnswer, sources: [], meta: { scopeKey, trace } });
        }

        await Chat.updateOne(
            { userId: req.user._id, scopeKey },
            {
                $push: {
                    messages: {
                        $each: [
                            { type: 'user', content: question, timestamp: new Date() },
                            { type: 'ai', content: answer, sources, timestamp: new Date() }
                        ]
                    }
                },
                $set: { collectionId, updatedAt: new Date() },
                $setOnInsert: { createdAt: new Date() }
            },
            { upsert: true }
        );

        return res.json({
            answer,
            sources,
            meta: { scopeKey, trace }
        });
    } catch (error) {
        console.error('Collection query error:', error);
        return res.status(500).json({ message: 'Internal server error while processing your query.' });
    }
};

export const getCollectionChatHistory = async (req, res) => {
    try {
        const { collectionId, documentId } = req.query;
        if (!collectionId || !mongoose.isValidObjectId(collectionId)) {
            return res.status(400).json({ message: 'A valid collectionId is required' });
        }
        if (documentId && !mongoose.isValidObjectId(documentId)) {
            return res.status(400).json({ message: 'Invalid documentId' });
        }

        const scopeKey = `${collectionId}:${documentId || '*'}`;
        const chat = await Chat.findOne({ userId: req.user._id, scopeKey });
        return res.json({ messages: chat ? chat.messages : [] });
    } catch (error) {
        console.error('Get collection chat history error:', error);
        return res.status(500).json({ message: 'Internal server error retrieving chat history.' });
    }
};
