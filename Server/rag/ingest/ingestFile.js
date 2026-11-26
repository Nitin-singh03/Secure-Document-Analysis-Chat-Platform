import path from 'node:path';
import Document from '../../models/DocumentModel.js';
import Chunk from '../../models/ChunkModel.js';
import { INGEST_VERSIONS, buildChunkerVersion } from '../pipelines.js';
import { loadFile } from '../loaders/index.js';
import { chunkDocument } from '../chunking/sliding.js';
import { embedTexts } from '../embeddings.js';
import { applyRules } from './rules.js';

export const ingestFile = async ({
    absolutePath,
    relativePosixPath,
    folderPath = [],
    collectionId,
    userId,
    kbConfig = null,
    ingestVersion = 'v0',
    force = false
}) => {
    const cfg = INGEST_VERSIONS[ingestVersion];
    if (!cfg) throw new Error(`Unknown ingest version: ${ingestVersion}`);

    const chunkerVersion = buildChunkerVersion(ingestVersion);
    const filename = path.posix.basename(relativePosixPath);

    let loaded;
    try {
        loaded = await loadFile(absolutePath, relativePosixPath);
    } catch (extractErr) {
        await Document.findOneAndUpdate(
            { collectionId, sourcePath: relativePosixPath },
            {
                $set: {
                    userId,
                    collectionId,
                    filename,
                    sourcePath: relativePosixPath,
                    folderPath,
                    status: 'failed',
                    extractionFailed: true,
                    error: extractErr.message,
                    totalChunks: 0,
                    indexedChunks: 0,
                    skippedChunks: 0,
                    content: ''
                }
            },
            { upsert: true, new: true }
        );
        return {
            status: 'failed',
            chunks: 0,
            skipped: 0,
            reused: 0,
            generated: 0,
            error: extractErr.message
        };
    }

    const { authority, tags, metadata } = applyRules({
        relativePosixPath,
        frontMatter: loaded.frontMatter,
        kbConfig
    });

    const existingDoc = await Document.findOne({ collectionId, sourcePath: relativePosixPath })
        .select('sha256 indexedChunks ingestVersions');

    const alreadyIngestedVersion = existingDoc?.ingestVersions?.some(
        (v) => v.chunkerVersion === chunkerVersion
    );

    if (!force && existingDoc && existingDoc.sha256 === loaded.sha256 && alreadyIngestedVersion) {
        return {
            status: 'skipped',
            chunks: existingDoc.indexedChunks || 0,
            skipped: 0,
            reused: 0,
            generated: 0,
            sha256: loaded.sha256,
            bytes: loaded.sizeBytes,
            tags
        };
    }

    const doc = await Document.findOneAndUpdate(
        { collectionId, sourcePath: relativePosixPath },
        {
            $set: {
                userId,
                collectionId,
                filename,
                sourcePath: relativePosixPath,
                folderPath,
                ext: loaded.ext,
                mimeType: loaded.mimeType,
                sizeBytes: loaded.sizeBytes,
                sha256: loaded.sha256,
                title: loaded.title,
                tags,
                frontMatter: loaded.frontMatter,
                metadata,
                pageCount: loaded.pageCount,
                authority,
                status: 'processing',
                error: null,
                extractionFailed: false,
                content: loaded.text
            }
        },
        { upsert: true, new: true }
    );

    const rawChunks = chunkDocument(loaded, {
        size: cfg.chunker.size,
        overlap: cfg.chunker.overlap,
        sourcePath: relativePosixPath
    });

    const { results, reusedCount, generatedCount, skippedCount } = await embedTexts(rawChunks, {
        model: cfg.model,
        dim: cfg.dim,
        taskType: cfg.taskType
    });

    if (results.length === 0) {
        await Chunk.deleteMany({ documentId: doc._id, chunkerVersion });
        await Document.updateOne(
            { _id: doc._id },
            {
                $set: {
                    status: 'failed',
                    totalChunks: rawChunks.length,
                    indexedChunks: 0,
                    skippedChunks: rawChunks.length,
                    error: 'Failed to generate vector embeddings for document.'
                }
            }
        );
        return {
            status: 'failed',
            chunks: 0,
            skipped: rawChunks.length,
            reused: reusedCount,
            generated: generatedCount,
            sha256: loaded.sha256,
            bytes: loaded.sizeBytes,
            tags
        };
    }

    const chunkDocs = results.map((c) => ({
        userId,
        collectionId,
        documentId: doc._id,
        chunkerVersion,
        status: 'active',
        filename,
        sourcePath: relativePosixPath,
        folderPath,
        tags,
        authority,
        metadata,
        text: c.text,
        header: c.header,
        sectionPath: c.sectionPath,
        sectionId: c.sectionId,
        blockType: c.blockType,
        chunkIndex: c.chunkIndex,
        charStart: c.charStart,
        charEnd: c.charEnd,
        pageStart: c.pageStart,
        pageEnd: c.pageEnd,
        tokenCount: c.tokenCount,
        embedding: c.embedding,
        embeddingModel: c.embeddingModel,
        embeddingDim: c.embeddingDim,
        embedInput: c.embedInput,
        embedTaskType: c.embedTaskType,
        contentHash: c.contentHash,
        embedHash: c.embedHash
    }));

    try {
        await Chunk.deleteMany({ documentId: doc._id, chunkerVersion });
        await Chunk.insertMany(chunkDocs);
    } catch (insertError) {
        await Chunk.deleteMany({ documentId: doc._id, chunkerVersion });
        await Document.updateOne(
            { _id: doc._id },
            {
                $set: {
                    status: 'failed',
                    error: insertError.message
                }
            }
        );
        throw insertError;
    }

    const finalStatus = skippedCount > 0 ? 'partial' : 'ready';
    const nextVersions = (doc.ingestVersions || []).filter((v) => v.chunkerVersion !== chunkerVersion);
    nextVersions.push({
        chunkerVersion,
        chunks: chunkDocs.length,
        ingestedAt: new Date()
    });

    await Document.updateOne(
        { _id: doc._id },
        {
            $set: {
                totalChunks: rawChunks.length,
                indexedChunks: chunkDocs.length,
                skippedChunks: skippedCount,
                status: finalStatus,
                ingestVersions: nextVersions
            }
        }
    );

    return {
        status: finalStatus,
        chunks: chunkDocs.length,
        skipped: skippedCount,
        reused: reusedCount,
        generated: generatedCount,
        sha256: loaded.sha256,
        bytes: loaded.sizeBytes,
        tags
    };
};
