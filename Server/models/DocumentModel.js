import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    filename: { type: String, required: true },
    content: {
        type: String,
        default: '',
        required: function () {
            return !this.extractionFailed;
        }
    },
    totalChunks: { type: Number, default: 0 },
    indexedChunks: { type: Number, default: 0 },
    skippedChunks: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['ready', 'partial', 'failed'],
        default: 'ready'
    },
    extractionFailed: { type: Boolean, default: false }
}, {
    timestamps: true
});

export default mongoose.model('Document', documentSchema);
