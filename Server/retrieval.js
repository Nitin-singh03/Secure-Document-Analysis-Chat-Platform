import mongoose from 'mongoose';
import Chunk from './models/ChunkModel.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));

/** Top-k chunks of ONE document owned by ONE user, via Atlas $vectorSearch (ANN, cosine). */
export async function retrieveChunks({ documentId, userId, queryEmbedding, topK = 3, numCandidates }) {
  return Chunk.aggregate([
    {
      $vectorSearch: {
        index: 'vector_index',
        path: 'embedding',
        queryVector: queryEmbedding,
        numCandidates: numCandidates ?? Math.max(30, topK * 10),
        limit: topK,
        filter: {
          $and: [
            { documentId: { $eq: oid(documentId) } },
            { userId: { $eq: oid(userId) } },
          ],
        },
      },
    },
    { $project: { text: 1, chunkIndex: 1, score: { $meta: 'vectorSearchScore' } } },
  ]);
}
