import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import connectDB from '../../config/mongodb.js';
import User from '../../models/UserModel.js';
import Collection from '../../models/CollectionModel.js';
import { INGEST_VERSIONS } from '../pipelines.js';
import { loadFile } from '../loaders/index.js';
import { chunkDocument } from '../chunking/sliding.js';
import { walkFolder } from './walk.js';
import { loadKbConfig, applyRules } from './rules.js';
import { ingestFile } from './ingestFile.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const parseArgs = (argv) => {
    const args = { version: 'v0', dryRun: false, force: false };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--dir') args.dir = argv[++i];
        else if (arg === '--collection') args.collection = argv[++i];
        else if (arg === '--email') args.email = argv[++i];
        else if (arg === '--version') args.version = argv[++i];
        else if (arg === '--dry-run') args.dryRun = true;
        else if (arg === '--force') args.force = true;
    }
    return args;
};

const sha256 = (val) => crypto.createHash('sha256').update(val, 'utf8').digest('hex');

async function run() {
    const args = parseArgs(process.argv.slice(2));
    if (!args.dir || !args.collection || !args.email) {
        console.error('Usage: node rag/ingest/ingestFolder.js --dir <path> --collection <name> --email <userEmail> [--version v0] [--dry-run] [--force]');
        process.exit(1);
    }

    const cfg = INGEST_VERSIONS[args.version];
    if (!cfg) {
        console.error(`Unknown ingest version: ${args.version}`);
        process.exit(1);
    }

    const startTime = Date.now();
    const resolvedDir = path.resolve(args.dir);
    const walked = await walkFolder(resolvedDir);
    const kbConfig = await loadKbConfig(resolvedDir);

    let user = null;
    let collection = null;

    if (!args.dryRun) {
        await connectDB();
        user = await User.findOne({ email: args.email });
        if (!user) {
            throw new Error(`User not found for email: ${args.email}`);
        }
        collection = await Collection.findOneAndUpdate(
            { userId: user._id, name: args.collection },
            {
                $set: {
                    sourceRoot: resolvedDir,
                    kbConfig
                }
            },
            { upsert: true, new: true }
        );
    }

    let totalChunks = 0;
    let skippedFiles = 0;
    let failedFiles = 0;
    let reusedEmbeddings = 0;
    const manifestFiles = [];

    for (const file of walked) {
        if (args.dryRun) {
            try {
                const loaded = await loadFile(file.absolutePath, file.relativePosixPath);
                const { tags } = applyRules({
                    relativePosixPath: file.relativePosixPath,
                    frontMatter: loaded.frontMatter,
                    kbConfig
                });
                const chunks = chunkDocument(loaded, {
                    size: cfg.chunker.size,
                    overlap: cfg.chunker.overlap,
                    sourcePath: file.relativePosixPath
                });
                totalChunks += chunks.length;
                manifestFiles.push({
                    path: file.relativePosixPath,
                    sha256: loaded.sha256,
                    bytes: loaded.sizeBytes,
                    folderPath: file.folderPath,
                    tags,
                    chunks: chunks.length
                });
            } catch (err) {
                failedFiles += 1;
                console.error(`Dry-run load failed for ${file.relativePosixPath}:`, err.message);
            }
            continue;
        }

        const res = await ingestFile({
            absolutePath: file.absolutePath,
            relativePosixPath: file.relativePosixPath,
            folderPath: file.folderPath,
            collectionId: collection._id,
            userId: user._id,
            kbConfig,
            ingestVersion: args.version,
            force: args.force
        });

        totalChunks += res.chunks || 0;
        reusedEmbeddings += res.reused || 0;
        if (res.status === 'skipped') skippedFiles += 1;
        if (res.status === 'failed') failedFiles += 1;

        if (res.sha256) {
            manifestFiles.push({
                path: file.relativePosixPath,
                sha256: res.sha256,
                bytes: res.bytes,
                folderPath: file.folderPath,
                tags: res.tags || [],
                chunks: res.chunks || 0
            });
        }
    }

    const corpusVersion = sha256(
        JSON.stringify(manifestFiles.map((f) => ({ path: f.path, sha256: f.sha256 })))
    );

    if (!args.dryRun && collection) {
        await Collection.updateOne({ _id: collection._id }, { $set: { corpusVersion } });
    }

    const safeCollectionName = args.collection.replace(/[^a-zA-Z0-9._-]/g, '_');
    const corpusDir = path.resolve(__dirname, '../../eval/corpus');
    await fs.mkdir(corpusDir, { recursive: true });
    const manifestPath = path.join(corpusDir, `manifest.${safeCollectionName}.json`);

    await fs.writeFile(
        manifestPath,
        JSON.stringify(
            {
                collection: args.collection,
                version: args.version,
                corpusVersion,
                generatedAt: new Date().toISOString(),
                files: manifestFiles
            },
            null,
            2
        ),
        'utf8'
    );

    const seconds = ((Date.now() - startTime) / 1000).toFixed(2);
    console.table([
        {
            mode: args.dryRun ? 'dry-run' : 'ingest',
            files: walked.length,
            chunks: totalChunks,
            skipped: skippedFiles,
            failed: failedFiles,
            'embeddings reused': reusedEmbeddings,
            seconds
        }
    ]);
    console.log(`Manifest written: ${manifestPath}`);
    console.log(`corpusVersion: ${corpusVersion}`);

    if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
    }
}

run().catch(async (err) => {
    console.error('Folder ingest failed:', err);
    if (mongoose.connection.readyState === 1) {
        try {
            await mongoose.connection.close();
        } catch {}
    }
    process.exit(1);
});
