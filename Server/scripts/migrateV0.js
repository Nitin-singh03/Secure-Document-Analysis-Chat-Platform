import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import connectDB from '../config/mongodb.js';
import Collection from '../models/CollectionModel.js';
import Document from '../models/DocumentModel.js';
import Chunk from '../models/ChunkModel.js';
import { buildChunkerVersion } from '../rag/pipelines.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const apply = process.argv.includes('--apply');
const sha256 = (text) => crypto.createHash('sha256').update(text, 'utf8').digest('hex');

async function getCounts() {
    const [collections, documents, docsWithCollection, chunks, chunksWithVersion] = await Promise.all([
        Collection.countDocuments(),
        Document.countDocuments(),
        Document.countDocuments({ collectionId: { $exists: true, $ne: null } }),
        Chunk.countDocuments(),
        Chunk.countDocuments({ chunkerVersion: { $exists: true, $ne: null } })
    ]);
    return { collections, documents, docsWithCollection, chunks, chunksWithVersion };
}

async function run() {
    await connectDB();

    const before = await getCounts();
    console.log(`Mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);
    console.log('Before:', before);

    const chunkerVersion = buildChunkerVersion('v0');
    const userIds = await Document.distinct('userId');
    const userDefaultCollection = new Map();
    let collectionsCreated = 0;

    for (const userId of userIds) {
        let col = await Collection.findOne({ userId, name: 'Default' });
        if (!col) {
            collectionsCreated += 1;
            if (apply) {
                col = await Collection.create({ userId, name: 'Default' });
            }
        }
        if (col) {
            userDefaultCollection.set(String(userId), col._id);
        }
    }

    const docs = await Document.find({}).select('-embedding');
    const docCollectionMap = new Map();
    let docsToUpdate = 0;

    for (const doc of docs) {
        const defaultColId = userDefaultCollection.get(String(doc.userId));
        const targetColId = doc.collectionId || defaultColId;
        if (targetColId) {
            docCollectionMap.set(String(doc._id), targetColId);
        }

        const setFields = {};
        if (!doc.collectionId && targetColId) setFields.collectionId = targetColId;
        if (!doc.sourcePath && doc.filename) setFields.sourcePath = doc.filename;
        if (!Array.isArray(doc.folderPath)) setFields.folderPath = [];
        if (!Array.isArray(doc.tags)) setFields.tags = [];
        if (!doc.authority) setFields.authority = 'normal';

        if (Object.keys(setFields).length > 0) {
            docsToUpdate += 1;
            if (apply) {
                await Document.updateOne({ _id: doc._id }, { $set: setFields });
            }
        }
    }

    const cursor = Chunk.collection.find({}, { projection: { embedding: 0 } });
    let chunksToUpdate = 0;
    const bulkOps = [];

    for await (const chunk of cursor) {
        const setFields = {};
        if (chunk.chunkIndex === undefined && chunk.index !== undefined) {
            setFields.chunkIndex = chunk.index;
        }
        if (!chunk.collectionId) {
            const colId = docCollectionMap.get(String(chunk.documentId));
            if (colId) setFields.collectionId = colId;
        }
        if (!chunk.chunkerVersion) setFields.chunkerVersion = chunkerVersion;
        if (!Array.isArray(chunk.folderPath)) setFields.folderPath = [];
        if (!Array.isArray(chunk.tags)) setFields.tags = [];
        if (!chunk.authority) setFields.authority = 'normal';
        if (!chunk.embeddingModel) setFields.embeddingModel = 'gemini-embedding-001';
        if (!chunk.embeddingDim) setFields.embeddingDim = 768;
        if (!chunk.embedInput) setFields.embedInput = 'text';
        if (!chunk.embedTaskType) setFields.embedTaskType = 'none';
        if (!chunk.contentHash && typeof chunk.text === 'string') {
            setFields.contentHash = sha256(chunk.text);
        }
        if (!chunk.embedHash && typeof chunk.text === 'string') {
            setFields.embedHash = sha256(`${chunk.text}|gemini-embedding-001|768|none`);
        }
        if (!chunk.status) setFields.status = 'active';

        if (Object.keys(setFields).length > 0) {
            chunksToUpdate += 1;
            if (apply) {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: chunk._id },
                        $set: setFields
                    }
                });
                if (bulkOps.length >= 500) {
                    await Chunk.collection.bulkWrite(bulkOps.splice(0, bulkOps.length));
                }
            }
        }
    }

    if (apply && bulkOps.length > 0) {
        await Chunk.collection.bulkWrite(bulkOps);
    }

    console.log({
        collectionsToCreate: collectionsCreated,
        docsToUpdate,
        chunksToUpdate
    });

    const after = await getCounts();
    console.log('After:', after);

    await mongoose.connection.close();
}

run().catch(async (err) => {
    console.error('Migration failed:', err);
    try {
        await mongoose.connection.close();
    } catch {}
    process.exit(1);
});
