import { GoogleGenAI } from '@google/genai';

let ai;
const getAI = () => {
    if (!ai) {
        ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
    }
    return ai;
};

// Chunk text into smaller pieces using a sliding window
export const chunkText = (text, chunkSize = 600, overlap = 50) => {
    const chunks = [];
    let start = 0;
    
    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        const chunk = text.slice(start, end);
        chunks.push(chunk);
        if (end >= text.length) break;
        start = end - overlap;
    }
    
    return chunks;
};

// Generate 768-dimensional embeddings using Gemini embedding model
export const generateEmbedding = async (text, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const result = await getAI().models.embedContent({
                model: 'gemini-embedding-001',
                contents: text,
                config: { outputDimensionality: 768 }
            });
            const values = result.embeddings?.[0]?.values;
            if (!values || values.length !== 768) {
                throw new Error(`Invalid embedding length: expected 768, got ${values ? values.length : 0}`);
            }
            return values;
        } catch (error) {
            console.error(`Embedding attempt ${i + 1} failed:`, error.message);
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
};
