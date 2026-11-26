import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    collectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', default: null },
    filename: { type: String, required: true },
    sourcePath: { type: String },
    folderPath: { type: [String], default: [] },
    ext: { type: String },
    mimeType: { type: String },
    sizeBytes: { type: Number },
    sha256: { type: String },
    storageKey: { type: String },
    title: { type: String },
    tags: { type: [String], default: [] },
    frontMatter: { type: mongoose.Schema.Types.Mixed, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    language: { type: String, default: 'en' },
    pageCount: { type: Number, default: null },
    authority: {
        type: String,
        enum: ['primary', 'normal', 'secondary'],
        default: 'normal'
    },
    status: {
        type: String,
        enum: ['queued', 'processing', 'ready', 'partial', 'failed'],
        default: 'ready'
    },
    error: { type: String },
    progress: {
        done: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    },
    totalChunks: { type: Number, default: 0 },
    indexedChunks: { type: Number, default: 0 },
    skippedChunks: { type: Number, default: 0 },
    extractionFailed: { type: Boolean, default: false },
    ingestVersions: [{
        chunkerVersion: { type: String },
        chunks: { type: Number },
        ingestedAt: { type: Date }
    }],
    content: {
        type: String,
        default: '',
        required: function () {
            return !this.extractionFailed;
        }
    }
}, {
    timestamps: true
});

documentSchema.index(
    { collectionId: 1, sourcePath: 1 },
    {
        unique: true,
        partialFilterExpression: {
            collectionId: { $exists: true, $ne: null },
            sourcePath: { $type: 'string' }
        }
    }
);
documentSchema.index({ userId: 1, collectionId: 1, status: 1 });
documentSchema.index({ collectionId: 1, folderPath: 1 });

export default mongoose.model('Document', documentSchema);
