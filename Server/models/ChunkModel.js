import mongoose from 'mongoose';

const chunkSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    collectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection' },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    chunkerVersion: { type: String },
    status: { type: String, enum: ['active', 'retired'], default: 'active' },
    filename: { type: String },
    sourcePath: { type: String },
    folderPath: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    authority: {
        type: String,
        enum: ['primary', 'normal', 'secondary'],
        default: 'normal'
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    text: { type: String, required: true },
    header: { type: String },
    sectionPath: { type: [String], default: [] },
    sectionId: { type: String },
    blockType: { type: String, enum: ['paragraph', 'list', 'table', 'code', 'heading'] },
    chunkIndex: { type: Number, required: true },
    charStart: { type: Number },
    charEnd: { type: Number },
    pageStart: { type: Number },
    pageEnd: { type: Number },
    tokenCount: { type: Number },
    embedding: { type: [Number], required: true },
    embeddingModel: { type: String },
    embeddingDim: { type: Number },
    embedInput: { type: String },
    embedTaskType: { type: String, default: 'none' },
    contentHash: { type: String },
    embedHash: { type: String },
    ingestedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

chunkSchema.index({ documentId: 1, chunkerVersion: 1, chunkIndex: 1 }, { unique: true });
chunkSchema.index({ documentId: 1, chunkerVersion: 1, sectionId: 1 });
chunkSchema.index({ userId: 1, collectionId: 1, chunkerVersion: 1, status: 1 });
chunkSchema.index({ embedHash: 1 });

export default mongoose.model('Chunk', chunkSchema);
