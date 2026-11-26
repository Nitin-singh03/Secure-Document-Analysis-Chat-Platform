import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import mongoose from 'mongoose';
import connectDB from '../config/mongodb.js';
import Chunk from '../models/ChunkModel.js';
import { generateEmbedding } from '../vectorUtils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const cosineSimilarity = (a, b) => {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
};

const assertValid768 = (vec, label) => {
    if (!Array.isArray(vec) || vec.length !== 768) {
        throw new Error(`${label}: expected 768 elements, got ${vec ? vec.length : 0}`);
    }
    for (let i = 0; i < vec.length; i++) {
        if (typeof vec[i] !== 'number' || !Number.isFinite(vec[i])) {
            throw new Error(`${label}: non-finite number at index ${i}`);
        }
    }
};

async function run() {
    if (!process.env.GOOGLE_API_KEY) {
        throw new Error('GOOGLE_API_KEY is required to run embedding parity check.');
    }

    const sampleText = 'IntelliDoc embedding parity check for gemini-embedding-001 at 768 dimensions.';
    const sampleVec = await generateEmbedding(sampleText);
    assertValid768(sampleVec, 'Sample embedding');
    console.log('PASS: Sample embedding has 768 finite numbers.');

    if (process.env.MONGO_URI) {
        await connectDB();
        try {
            const stored = await Chunk.collection.findOne(
                { embedding: { $exists: true, $type: 'array' }, text: { $exists: true, $ne: '' } },
                { projection: { _id: 1, text: 1, embedding: 1 } }
            );

            if (!stored) {
                console.log('SKIP: No stored v0 chunk found in MongoDB to compare against.');
            } else {
                assertValid768(stored.embedding, 'Stored chunk embedding');
                const fresh = await generateEmbedding(stored.text);
                assertValid768(fresh, 'Re-embedded chunk');
                const sim = cosineSimilarity(stored.embedding, fresh);
                console.log(`Stored chunk ${stored._id} cosine similarity: ${sim.toFixed(6)}`);
                if (sim < 0.9999) {
                    throw new Error(`Cosine similarity ${sim} is below 0.9999 threshold`);
                }
                console.log('PASS: Stored v0 chunk parity >= 0.9999.');
            }
        } finally {
            await mongoose.connection.close();
        }
    } else {
        console.log('SKIP: MONGO_URI not set; skipped stored chunk comparison.');
    }
}

run().catch((err) => {
    console.error('Embedding parity check failed:', err.message);
    process.exit(1);
});
