import mongoose from 'mongoose';
import Document from '../models/DocumentModel.js';
import Chunk from '../models/ChunkModel.js';
import Chat from '../models/ChatModel.js';
import mammoth from 'mammoth';
import { PdfReader } from 'pdfreader';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { chunkText, generateEmbedding } from '../vectorUtils.js';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

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

        let content = '';

        if (req.file.mimetype === 'application/pdf') {
            content = await extractPdfText(req.file.buffer);
        } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth.extractRawText({ buffer: req.file.buffer });
            content = result.value;
        } else {
            return res.status(400).json({ message: 'Unsupported file type. Use PDF or DOCX.' });
        }

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ message: 'Could not extract text from document.' });
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

        // 3. Save parent document record
        const document = new Document({
            userId: req.user._id,
            filename: req.file.originalname,
            content,
            totalChunks: chunks.length,
            indexedChunks: chunksData.length,
            skippedChunks: chunks.length - chunksData.length,
            status: chunksData.length === chunks.length ? 'ready' : 'partial'
        });
        
        await document.save();

        // 4. Save chunks into MongoDB Atlas for Vector Search
        const chunkDocs = chunksData.map(c => ({
            documentId: document._id,
            userId: req.user._id,
            text: c.text,
            embedding: c.embedding,
            index: c.index
        }));
        await Chunk.insertMany(chunkDocs);

        res.json({
            message: 'Document uploaded and indexed successfully',
            documentId: document._id,
            chunksCount: chunksData.length
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'Upload failed: ' + error.message });
    }
};

const queryDocuments = async (req, res) => {
    try {
        const { question, documentId } = req.body;
        
        if (!question || !documentId) {
            return res.status(400).json({ message: 'Question and documentId are required' });
        }
        
        const document = await Document.findOne({ _id: documentId, userId: req.user._id });
        if (!document) {
            return res.status(404).json({ message: 'Document not found.' });
        }

        let chat = await Chat.findOne({ userId: req.user._id, documentId });
        if (!chat) {
            chat = new Chat({ userId: req.user._id, documentId, messages: [] });
        }

        chat.messages.push({ type: 'user', content: question });
        await chat.save();
        
        // 1. Generate query vector embedding (768 dimensions)
        const questionEmbedding = await generateEmbedding(question);
        
        // 2. Retrieve top-3 relevant chunks using Atlas Vector Search
        const relevantChunks = await Chunk.aggregate([
            {
                $vectorSearch: {
                    index: 'vector_index',
                    path: 'embedding',
                    queryVector: questionEmbedding,
                    numCandidates: 30,
                    limit: 3,
                    filter: {
                        $and: [
                            { documentId: { $eq: new mongoose.Types.ObjectId(documentId) } },
                            { userId: { $eq: new mongoose.Types.ObjectId(req.user._id) } }
                        ]
                    }
                }
            },
            {
                $project: {
                    text: 1,
                    index: 1,
                    score: { $meta: 'vectorSearchScore' }
                }
            }
        ]);

        if (!relevantChunks || relevantChunks.length === 0) {
            const noMatchAnswer = 'I could not find any relevant sections in this document to answer your question.';
            chat.messages.push({ type: 'ai', content: noMatchAnswer });
            await chat.save();
            return res.json({ answer: noMatchAnswer });
        }

        // 3. Assemble retrieved context
        const contextText = relevantChunks.map(chunk => chunk.text).join('\n\n');
        
        // 4. Extract conversation history (last 6 messages)
        const recentMessages = chat.messages.slice(-6);
        const chatHistory = recentMessages.map(msg => `${msg.type}: ${msg.content}`).join('\n');
        
        // 5. Synthesize answer with Gemini
        const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });
        const prompt = `You are a helpful assistant that formats responses in a structured, readable way. Answer based on the relevant document sections and conversation history.

Document: ${document.filename}
Relevant Content: ${contextText}

Conversation History:
${chatHistory}

IMPORTANT: Format your response with:
- Use **bold** for important points
- Use \`code\` for technical terms, variables, functions
- Use triple backticks for multi-line code blocks, examples, or structured data
- Use numbered lists for steps
- Use bullet points for features
- Use line breaks for better readability
- Highlight key information with proper formatting
- Structure your answer in sections when appropriate

Provide a detailed, well-formatted answer based on the relevant document content:`;
        
        const result = await model.generateContent(prompt);
        const aiResponse = result.response.text();

        chat.messages.push({ type: 'ai', content: aiResponse });
        chat.updatedAt = new Date();
        await chat.save();

        await Document.findByIdAndUpdate(documentId, { updatedAt: new Date() });
        
        res.json({ answer: aiResponse });
    } catch (error) {
        console.error('Query error:', error);
        res.status(500).json({ message: 'Query failed: ' + error.message });
    }
};

const getChatHistory = async (req, res) => {
    try {
        const { documentId } = req.params;
        const chat = await Chat.findOne({ userId: req.user._id, documentId });
        res.json({ messages: chat ? chat.messages : [] });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteDocument = async (req, res) => {
    try {
        const { documentId } = req.params;
        
        await Document.findOneAndDelete({ _id: documentId, userId: req.user._id });
        await Chat.findOneAndDelete({ userId: req.user._id, documentId });
        await Chunk.deleteMany({ documentId, userId: req.user._id });
        
        res.json({ message: 'Document, chat history, and vector chunks deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getUserDocuments = async (req, res) => {
    try {
        const documents = await Document.find({ userId: req.user._id })
            .select('filename createdAt updatedAt totalChunks indexedChunks status')
            .sort({ updatedAt: -1, createdAt: -1 });
        res.json({ documents });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export { uploadDocument, queryDocuments, getUserDocuments, getChatHistory, deleteDocument };
