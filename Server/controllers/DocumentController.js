import mongoose from 'mongoose';
import crypto from 'node:crypto';
import Document from '../models/DocumentModel.js';
import Collection from '../models/CollectionModel.js';
import Chunk from '../models/ChunkModel.js';
import Chat from '../models/ChatModel.js';
import mammoth from 'mammoth';
import { PdfReader } from 'pdfreader';
import { GoogleGenAI } from '@google/genai';
import { chunkText, generateEmbedding } from '../vectorUtils.js';
import { retrieveChunks } from '../retrieval.js';
import { buildPrompt } from '../prompt.js';
import { buildChunkerVersion } from '../rag/pipelines.js';
import { answerQuestion } from '../rag/answer.js';

const sha256 = (val) => crypto.createHash('sha256').update(val, 'utf8').digest('hex');

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

const extractPdfText = (buffer) => {
    return new Promise((resolve, reject) => {
        let text = '';
        new PdfReader().parseBuffer(buffer, (err, item) => {
            if (err) {
                reject(err);
            } else if (!item) {
                resolve(text);
            } else if (item.text) {
                text += item.text + ' ';
            }
        });
    });
};

const uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        
        if (req.file.size > 5 * 1024 * 1024) {
            return res.status(400).json({ message: 'File size must be less than 5MB' });
        }

        const originalName = req.file.originalname || '';
        const isValidExtension = /\.(pdf|docx)$/i.test(originalName);
        if (!isValidExtension) {
            return res.status(400).json({ message: 'Invalid file extension. Only .pdf and .docx files are supported.' });
        }

        const buffer = req.file.buffer;
        if (!buffer || buffer.length < 5) {
            return res.status(400).json({ message: 'Uploaded file is empty or corrupted.' });
        }

        // Validate magic bytes: PDF (%PDF- / 0x25 0x50 0x44 0x46 0x2D) or DOCX (PK / 0x50 0x4B)
        const isPdf = buffer.toString('ascii', 0, 5) === '%PDF-';
        const isDocx = buffer[0] === 0x50 && buffer[1] === 0x4B;

        if (!isPdf && !isDocx) {
            return res.status(400).json({
                message: 'Unsupported or invalid file format. File content must match PDF (%PDF-) or DOCX (PK).'
            });
        }

        let content = '';

        try {
            if (isPdf) {
                content = await extractPdfText(buffer);
            } else if (isDocx) {
                const result = await mammoth.extractRawText({ buffer });
                content = result.value;
            }
        } catch (extractErr) {
            console.error('Extraction error:', extractErr);
            const failedDoc = new Document({
                userId: req.user._id,
                filename: originalName,
                content: '',
                totalChunks: 0,
                indexedChunks: 0,
                skippedChunks: 0,
                status: 'failed',
                extractionFailed: true
            });
            await failedDoc.save();

            return res.status(422).json({
                message: 'Could not extract text from document.',
                documentId: failedDoc._id,
                status: 'failed',
                extractionFailed: true
            });
        }

        if (!content || content.trim().length === 0) {
            const failedDoc = new Document({
                userId: req.user._id,
                filename: originalName,
                content: '',
                totalChunks: 0,
                indexedChunks: 0,
                skippedChunks: 0,
                status: 'failed',
                extractionFailed: true
            });
            await failedDoc.save();

            return res.status(422).json({
                message: 'Could not extract text from document.',
                documentId: failedDoc._id,
                status: 'failed',
                extractionFailed: true
            });
        }

        // 1. Chunk document text
        const chunks = chunkText(content);
        const chunksData = [];
        
        // 2. Generate embeddings sequentially to respect API rate limits
        for (let i = 0; i < chunks.length; i++) {
            try {
                const embedding = await generateEmbedding(chunks[i]);
                chunksData.push({
                    text: chunks[i],
                    embedding: embedding,
                    index: i
                });
                
                // Small delay to respect Gemini QPS rate limits
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
                console.error(`Failed to generate embedding for chunk ${i}:`, error.message);
            }
        }

        if (chunksData.length === 0) {
            return res.status(500).json({ message: 'Failed to generate vector embeddings for document.' });
        }

        const skippedChunks = chunks.length - chunksData.length;
        const status = skippedChunks > 0 ? 'partial' : 'ready';
        const chunkerVersion = buildChunkerVersion('v0');

        let defaultCollection = await Collection.findOne({ userId: req.user._id, name: 'Default' });
        if (!defaultCollection) {
            defaultCollection = await Collection.create({ userId: req.user._id, name: 'Default' });
        }

        // 3. Save parent document record
        const document = new Document({
            userId: req.user._id,
            collectionId: defaultCollection._id,
            filename: originalName,
            sourcePath: originalName,
            folderPath: [],
            tags: [],
            authority: 'normal',
            content,
            totalChunks: chunks.length,
            indexedChunks: chunksData.length,
            skippedChunks,
            status,
            extractionFailed: false,
            ingestVersions: [{ chunkerVersion, chunks: chunksData.length, ingestedAt: new Date() }]
        });
        
        await document.save();

        // 4. Save chunks into MongoDB Atlas for Vector Search with rollback on failure
        const chunkDocs = chunksData.map(c => ({
            documentId: document._id,
            userId: req.user._id,
            collectionId: defaultCollection._id,
            chunkerVersion,
            status: 'active',
            filename: originalName,
            sourcePath: originalName,
            folderPath: [],
            tags: [],
            authority: 'normal',
            text: c.text,
            embedding: c.embedding,
            embeddingModel: 'gemini-embedding-001',
            embeddingDim: 768,
            embedInput: 'text',
            embedTaskType: 'none',
            contentHash: sha256(c.text),
            embedHash: sha256(`${c.text}|gemini-embedding-001|768|none`),
            chunkIndex: c.index
        }));

        try {
            await Chunk.insertMany(chunkDocs);
        } catch (insertError) {
            console.error('Chunk insertion failed, rolling back document:', insertError);
            await Document.findByIdAndDelete(document._id);
            await Chunk.deleteMany({ documentId: document._id });
            return res.status(500).json({ message: 'Internal server error saving document chunks.' });
        }

        res.json({
            message: status === 'partial'
                ? `Document partially indexed (${chunksData.length}/${chunks.length} chunks)`
                : 'Document uploaded and indexed successfully',
            documentId: document._id,
            chunksCount: chunksData.length,
            totalChunks: chunks.length,
            skippedChunks,
            status
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'Internal server error during upload.' });
    }
};

const queryDocuments = async (req, res) => {
    try {
        const { question, documentId } = req.body;
        
        if (!documentId || !mongoose.isValidObjectId(documentId)) {
            return res.status(400).json({ message: 'A valid documentId is required' });
        }

        if (!question || typeof question !== 'string' || question.trim().length === 0) {
            return res.status(400).json({ message: 'A non-empty question string is required' });
        }

        if (question.length > 2000) {
            return res.status(400).json({ message: 'Question exceeds maximum length of 2000 characters' });
        }
        
        const document = await Document.findOne({ _id: documentId, userId: req.user._id });
        if (!document) {
            return res.status(404).json({ message: 'Document not found.' });
        }

        if (document.status === 'failed' || document.extractionFailed) {
            return res.status(400).json({ message: 'This document failed extraction and cannot be queried.' });
        }

        // 1. Read existing chat first before mutating state (prevents dangling user questions on errors)
        const chat = await Chat.findOne({ userId: req.user._id, documentId });
        const recent = (chat?.messages ?? []).slice(-6);

        let aiResponse = null;
        let sources = [];

        if (document.collectionId) {
            const result = await answerQuestion({
                userId: req.user._id,
                collectionId: document.collectionId,
                documentIds: [document._id],
                question,
                history: recent,
                documentLabel: document.filename
            });
            aiResponse = result.answer;
            sources = result.sources;
        } else {
            const chatHistory = recent.length > 0
                ? recent.map(msg => `${msg.type}: ${msg.content}`).join('\n')
                : 'None';
            const questionEmbedding = await generateEmbedding(question);
            const relevantChunks = await retrieveChunks({
                documentId,
                userId: req.user._id,
                queryEmbedding: questionEmbedding,
                topK: 3
            });

            if (relevantChunks && relevantChunks.length > 0) {
                const contextText = relevantChunks.map(chunk => chunk.text).join('\n\n');
                const prompt = buildPrompt({
                    filename: document.filename,
                    contextText,
                    chatHistory,
                    question
                });
                const result = await ai.models.generateContent({
                    model: GEMINI_MODEL,
                    contents: prompt
                });
                aiResponse = result.text;
            }
        }

        // 4. Handle empty retrieval
        if (!aiResponse) {
            const stillIndexing = Date.now() - new Date(document.createdAt).getTime() < 60_000;
            if (stillIndexing) {
                // Return immediately without writing to chat history
                return res.json({ answer: 'This document is still being indexed. Please try again in a few seconds.', sources: [] });
            }

            const noMatchAnswer = 'I could not find any relevant sections in this document to answer your question.';
            // Atomically record user question and AI no-match answer together
            await Chat.updateOne(
                { userId: req.user._id, documentId },
                {
                    $push: { messages: { $each: [
                        { type: 'user', content: question, timestamp: new Date() },
                        { type: 'ai', content: noMatchAnswer, timestamp: new Date() }
                    ] } },
                    $set: { updatedAt: new Date() },
                    $setOnInsert: { createdAt: new Date() }
                },
                { upsert: true }
            );
            return res.json({ answer: noMatchAnswer, sources: [] });
        }

        // 7. Atomically append both user question and AI response together
        await Chat.updateOne(
            { userId: req.user._id, documentId },
            {
                $push: { messages: { $each: [
                    { type: 'user', content: question, timestamp: new Date() },
                    { type: 'ai', content: aiResponse, sources, timestamp: new Date() }
                ] } },
                $set: { updatedAt: new Date() },
                $setOnInsert: { createdAt: new Date() }
            },
            { upsert: true }
        );

        await Document.findByIdAndUpdate(documentId, { updatedAt: new Date() });
        
        res.json({ answer: aiResponse, sources });
    } catch (error) {
        console.error('Query error:', error);
        res.status(500).json({ message: 'Internal server error while processing your query.' });
    }
};

const getChatHistory = async (req, res) => {
    try {
        const { documentId } = req.params;
        if (!documentId || !mongoose.isValidObjectId(documentId)) {
            return res.status(400).json({ message: 'A valid documentId is required' });
        }
        const chat = await Chat.findOne({ userId: req.user._id, documentId });
        res.json({ messages: chat ? chat.messages : [] });
    } catch (error) {
        console.error('Get chat history error:', error);
        res.status(500).json({ message: 'Internal server error retrieving chat history.' });
    }
};

const deleteDocument = async (req, res) => {
    try {
        const { documentId } = req.params;
        if (!documentId || !mongoose.isValidObjectId(documentId)) {
            return res.status(400).json({ message: 'A valid documentId is required' });
        }
        
        const document = await Document.findOne({ _id: documentId, userId: req.user._id });
        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Delete order: chunks first, then chat history, then the document
        await Chunk.deleteMany({ documentId, userId: req.user._id });
        await Chat.findOneAndDelete({ userId: req.user._id, documentId });
        await Document.findByIdAndDelete(documentId);
        
        res.json({ message: 'Document, chat history, and vector chunks deleted successfully' });
    } catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({ message: 'Internal server error deleting document.' });
    }
};

const getUserDocuments = async (req, res) => {
    try {
        const documents = await Document.find({ userId: req.user._id })
            .select('filename collectionId sourcePath createdAt updatedAt totalChunks indexedChunks skippedChunks status extractionFailed')
            .sort({ updatedAt: -1, createdAt: -1 });
        res.json({ documents });
    } catch (error) {
        console.error('Get user documents error:', error);
        res.status(500).json({ message: 'Internal server error fetching documents.' });
    }
};

export { uploadDocument, queryDocuments, getUserDocuments, getChatHistory, deleteDocument };
