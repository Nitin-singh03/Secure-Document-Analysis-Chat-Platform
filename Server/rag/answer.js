import { GoogleGenAI } from '@google/genai';
import { generateEmbedding } from '../vectorUtils.js';
import { ACTIVE } from './pipelines.js';
import { retrieve } from './retrieval/index.js';
import { buildPrompt } from './generation/prompt.js';
import { shapeSources } from './generation/sources.js';

let ai;
const getAI = () => {
    if (!ai) {
        ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
    }
    return ai;
};

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

export const answerQuestion = async ({
    userId,
    collectionId,
    documentIds,
    filters,
    question,
    history = [],
    profile = ACTIVE.retrieval,
    ingestVersion = ACTIVE.ingest,
    promptVersion = ACTIVE.prompt,
    documentLabel
}) => {
    const t0 = Date.now();
    const queryEmbedding = await generateEmbedding(question);
    const t1 = Date.now();

    const chunks = await retrieve({
        userId,
        collectionId,
        documentIds,
        filters,
        queryEmbedding,
        profile,
        ingestVersion
    });
    const t2 = Date.now();

    const sources = shapeSources(chunks);
    const retrievedTrace = chunks.map((c) => ({
        chunkId: String(c._id),
        documentId: String(c.documentId),
        score: c.score ?? null
    }));

    if (!chunks || chunks.length === 0) {
        return {
            answer: null,
            sources: [],
            trace: {
                timings: {
                    embeddingMs: t1 - t0,
                    retrievalMs: t2 - t1,
                    generationMs: 0
                },
                tokenUsage: null,
                retrieved: retrievedTrace,
                versions: { ingestVersion, profile, promptVersion, model: GEMINI_MODEL }
            }
        };
    }

    const recent = history.slice(-6);
    const chatHistory = recent.length > 0
        ? recent.map((msg) => `${msg.type}: ${msg.content}`).join('\n')
        : 'None';

    const contextText = chunks.map((chunk) => chunk.text).join('\n\n');
    const filename = documentLabel ||
        Array.from(new Set(chunks.map((c) => c.filename).filter(Boolean))).join(', ') ||
        'Collection';

    const prompt = buildPrompt({
        filename,
        contextText,
        chatHistory,
        question
    });

    const result = await getAI().models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt
    });
    const t3 = Date.now();

    return {
        answer: result.text,
        sources,
        trace: {
            timings: {
                embeddingMs: t1 - t0,
                retrievalMs: t2 - t1,
                generationMs: t3 - t2
            },
            tokenUsage: result.usageMetadata || null,
            retrieved: retrievedTrace,
            versions: { ingestVersion, profile, promptVersion, model: GEMINI_MODEL }
        }
    };
};
