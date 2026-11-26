import mongoose from 'mongoose';

const collectionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    sourceRoot: { type: String, default: null },
    kbConfig: { type: mongoose.Schema.Types.Mixed, default: null },
    corpusVersion: { type: String, default: null }
}, {
    timestamps: true
});

collectionSchema.index({ userId: 1, name: 1 }, { unique: true });

export default mongoose.model('Collection', collectionSchema);
