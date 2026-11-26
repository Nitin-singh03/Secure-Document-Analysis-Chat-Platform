import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { loadMarkdown } from './markdown.js';
import { loadText } from './text.js';
import { loadPdf } from './pdf.js';
import { loadDocx } from './docx.js';

const MIME_BY_EXT = {
    '.md': 'text/markdown',
    '.txt': 'text/plain',
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};

export const loadFile = async (absolutePath, relativePosixPath) => {
    const ext = path.posix.extname(relativePosixPath).toLowerCase();
    const mimeType = MIME_BY_EXT[ext];
    if (!mimeType) {
        throw new Error(`Unsupported file extension: ${ext}`);
    }

    const buffer = await fs.readFile(absolutePath);
    if (!buffer || buffer.length === 0) {
        throw new Error(`File is empty: ${relativePosixPath}`);
    }

    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    let loaded;

    if (ext === '.md') {
        loaded = loadMarkdown(buffer, relativePosixPath);
    } else if (ext === '.txt') {
        loaded = loadText(buffer, relativePosixPath);
    } else if (ext === '.pdf') {
        loaded = await loadPdf(buffer, relativePosixPath);
    } else if (ext === '.docx') {
        loaded = await loadDocx(buffer, relativePosixPath);
    }

    const text = (loaded.pages || []).map((p) => p.text).join('');
    if (!text || text.trim().length === 0) {
        throw new Error(`Could not extract text from document: ${relativePosixPath}`);
    }

    return {
        ...loaded,
        text,
        ext,
        mimeType,
        sizeBytes: buffer.length,
        sha256,
        pageCount: loaded.pages.length || 1,
        sourcePath: relativePosixPath
    };
};
