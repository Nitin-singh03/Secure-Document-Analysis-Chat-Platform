import mongoose from 'mongoose';
import Chunk from '../../models/ChunkModel.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));

export const buildVectorFilter = ({
    userId,
    collectionId,
    documentIds,
    filters,
    chunkerVersion
}) => {
    const and = [
        { userId: { $eq: oid(userId) } },
        { collectionId: { $eq: oid(collectionId) } },
        { status: { $eq: 'active' } },
        { chunkerVersion: { $eq: chunkerVersion } }
    ];

    if (Array.isArray(documentIds) && documentIds.length > 0) {
        and.push({ documentId: { $in: documentIds.map(oid) } });
    }
    if (Array.isArray(filters?.folderPath) && filters.folderPath.length > 0) {
        and.push({ folderPath: { $in: filters.folderPath } });
    }
    if (Array.isArray(filters?.tags) && filters.tags.length > 0) {
        and.push({ tags: { $in: filters.tags } });
    }

    return { $and: and };
};

export const vectorSearch = async ({
    userId,
    collectionId,
    documentIds,
    filters,
    queryEmbedding,
    chunkerVersion,
    topK = 3,
    numCandidates
}) => {
    const filter = buildVectorFilter({
        userId,
        collectionId,
        documentIds,
        filters,
        chunkerVersion
    });

    return Chunk.aggregate([
        {
            $vectorSearch: {
                index: 'vector_index',
                path: 'embedding',
                queryVector: queryEmbedding,
                numCandidates: numCandidates ?? Math.max(30, topK * 10),
                limit: topK,
                filter
            }
        },
        {
            $project: {
                _id: 1,
                documentId: 1,
                chunkIndex: 1,
                text: 1,
                header: 1,
                sectionPath: 1,
                pageStart: 1,
                pageEnd: 1,
                sourcePath: 1,
                filename: 1,
                folderPath: 1,
                tags: 1,
                authority: 1,
                metadata: 1,
                score: { $meta: 'vectorSearchScore' }
            }
        }
    ]);
};
