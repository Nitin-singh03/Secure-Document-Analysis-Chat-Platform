// Server/retrieval.js
// The ONE retrieval function. The controller and the eval script both call it, so the eval
// measures exactly what production runs. Atlas-only: no fallbacks that could hide failures.
//
// ASSUMPTION: ./models/ChunkModel.js has a default export (the Chunk mongoose model).
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
    { $project: { text: 1, index: 1, score: { $meta: 'vectorSearchScore' } } },
  ]);
}
