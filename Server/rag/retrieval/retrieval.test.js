import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { buildVectorFilter } from './vector.js';

const USER_ID = '507f1f77bcf86cd799439011';
const COLLECTION_ID = '507f1f77bcf86cd799439012';
const DOC_ID_1 = '507f1f77bcf86cd799439013';
const DOC_ID_2 = '507f1f77bcf86cd799439014';
const CHUNKER_VERSION = 'v0:sliding-600-50:text:gemini-embedding-001:768:raw';

test('buildVectorFilter includes required pre-filters and omits empty optional arrays', () => {
    const filter = buildVectorFilter({
        userId: USER_ID,
        collectionId: COLLECTION_ID,
        documentIds: [],
        filters: { folderPath: [], tags: [] },
        chunkerVersion: CHUNKER_VERSION
    });

    assert.deepEqual(filter, {
        $and: [
            { userId: { $eq: new mongoose.Types.ObjectId(USER_ID) } },
            { collectionId: { $eq: new mongoose.Types.ObjectId(COLLECTION_ID) } },
            { status: { $eq: 'active' } },
            { chunkerVersion: { $eq: CHUNKER_VERSION } }
        ]
    });
});

test('buildVectorFilter includes non-empty documentIds, folderPath, and tags', () => {
    const filter = buildVectorFilter({
        userId: USER_ID,
        collectionId: COLLECTION_ID,
        documentIds: [DOC_ID_1, DOC_ID_2],
        filters: { folderPath: ['contracts'], tags: ['type:contract'] },
        chunkerVersion: CHUNKER_VERSION
    });

    assert.deepEqual(filter, {
        $and: [
            { userId: { $eq: new mongoose.Types.ObjectId(USER_ID) } },
            { collectionId: { $eq: new mongoose.Types.ObjectId(COLLECTION_ID) } },
            { status: { $eq: 'active' } },
            { chunkerVersion: { $eq: CHUNKER_VERSION } },
            {
                documentId: {
                    $in: [
                        new mongoose.Types.ObjectId(DOC_ID_1),
                        new mongoose.Types.ObjectId(DOC_ID_2)
                    ]
                }
            },
            { folderPath: { $in: ['contracts'] } },
            { tags: { $in: ['type:contract'] } }
        ]
    });
});
