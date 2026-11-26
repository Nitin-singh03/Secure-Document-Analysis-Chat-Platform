import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Chunk from '../models/ChunkModel.js';
import { generateEmbedding } from '../vectorUtils.js';

const sha256 = (value) => crypto.createHash('sha256').update(value, 'utf8').digest('hex');

export const computeEmbedHash = ({ text, model, dim, taskType }) => {
    return sha256(`${text}|${model}|${dim}|${taskType || 'none'}`);
};

export const embedTexts = async (
    items,
    { model = 'gemini-embedding-001', dim = 768, taskType = null, pauseMs = 200 } = {}
) => {
    const results = [];
    let reusedCount = 0;
    let generatedCount = 0;
    let skippedCount = 0;
    const canQueryDb = mongoose.connection.readyState === 1;

    for (const item of items) {
        const embedHash = computeEmbedHash({ text: item.text, model, dim, taskType });
        let embedding = null;

        if (canQueryDb) {
            const existing = await Chunk.findOne({ embedHash }).select('embedding').lean();
            if (existing?.embedding && existing.embedding.length === dim) {
                embedding = existing.embedding;
                reusedCount += 1;
            }
        }

        if (!embedding) {
            try {
                embedding = await generateEmbedding(item.text);
                generatedCount += 1;
                if (pauseMs > 0) {
                    await new Promise((resolve) => setTimeout(resolve, pauseMs));
                }
            } catch (error) {
                console.error(`Failed to generate embedding for chunk ${item.chunkIndex}:`, error.message);
                skippedCount += 1;
                continue;
            }
        }

        results.push({
            ...item,
            embedding,
            embedHash,
            embeddingModel: model,
            embeddingDim: dim,
            embedInput: 'text',
            embedTaskType: taskType || 'none'
        });
    }

    return { results, reusedCount, generatedCount, skippedCount };
};
