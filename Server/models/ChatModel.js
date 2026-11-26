import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    collectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', default: null },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    scopeKey: { type: String },
    messages: [{
        type: { type: String, enum: ['user', 'ai'], required: true },
        content: { type: String, required: true },
        sources: { type: [mongoose.Schema.Types.Mixed], default: undefined },
        timestamp: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

chatSchema.index(
    { userId: 1, documentId: 1 },
    { unique: true, partialFilterExpression: { documentId: { $exists: true } } }
);
chatSchema.index(
    { userId: 1, scopeKey: 1 },
    { unique: true, partialFilterExpression: { scopeKey: { $type: 'string' } } }
);

export default mongoose.model('Chat', chatSchema);
