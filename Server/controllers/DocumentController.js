import Document from '../models/DocumentModel.js';
import Chat from '../models/ChatModel.js';
import mammoth from 'mammoth';
import { PdfReader } from 'pdfreader';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const extractPdfText = (buffer) => {
    return new Promise((resolve, reject) => {
        let text = '';
        new PdfReader().parseBuffer(buffer, (err, item) => {
            if (err) {
                reject(err);
            } else if (!item) {
                resolve(text || 'PDF content extracted successfully');
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
            try {
                content = await extractPdfText(req.file.buffer);
            } catch (pdfError) {
                console.error('PDF extraction error:', pdfError);
                content = `PDF document uploaded: ${req.file.originalname}. Text extraction failed, but you can still ask general questions about PDFs.`;
            }
        } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth.extractRawText({ buffer: req.file.buffer });
            content = result.value;
        } else {
            return res.status(400).json({ message: 'Unsupported file type' });
        }

        const document = new Document({
            userId: req.user._id,
            filename: req.file.originalname,
            content
        });
        
        await document.save();
        res.json({ message: 'Document uploaded successfully', documentId: document._id });
    } catch (error) {
        console.error('Upload error:', error);
        console.log('req.user:', req.user);
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
            return res.json({ answer: 'Document not found.' });
        }


        let chat = await Chat.findOne({ userId: req.user._id, documentId });
        if (!chat) {
            chat = new Chat({ userId: req.user._id, documentId, messages: [] });
        }


        chat.messages.push({ type: 'user', content: question });
        await chat.save();
        
        const recentMessages = chat.messages.slice(-6);
        const chatHistory = recentMessages.map(msg => `${msg.type}: ${msg.content}`).join('\n');
        
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `You are a helpful assistant that formats responses in a structured, readable way. Answer based on the document content and conversation history.

Document: ${document.filename}
Content: ${document.content}

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

Provide a detailed, well-formatted answer based on the document content:`;
        
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
        
        res.json({ message: 'Document and chat history deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getUserDocuments = async (req, res) => {
    try {
        const documents = await Document.find({ userId: req.user._id })
            .select('filename uploadDate updatedAt')
            .sort({ uploadDate: -1, updatedAt: -1 });
        res.json({ documents });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export { uploadDocument, queryDocuments, getUserDocuments, getChatHistory, deleteDocument };