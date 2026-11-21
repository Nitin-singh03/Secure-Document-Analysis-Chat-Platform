import mongoose from 'mongoose';
import Chunk from '../models/ChunkModel.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));

export const cosineSimilarity = (vecA, vecB) => {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
};

/** Exact exhaustive cosine search over all chunks of ONE document owned by ONE user. */
export async function exactRetrieveChunks({ documentId, userId, queryEmbedding, topK = 3 }) {
  const chunks = await Chunk.find({
    documentId: oid(documentId),
    userId: oid(userId),
  }).select('text index embedding');

  const scored = chunks.map((c) => ({
    _id: c._id,
    text: c.text,
    index: c.index,
    score: cosineSimilarity(queryEmbedding, c.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
