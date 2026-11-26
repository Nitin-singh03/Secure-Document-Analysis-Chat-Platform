import crypto from 'node:crypto';

export const estimateTokens = (text = '') => Math.ceil(text.length / 3.5);

const sha256 = (text) => crypto.createHash('sha256').update(text, 'utf8').digest('hex');

const findPageRange = (pages, charStart, charEnd) => {
    if (!pages || pages.length === 0) {
        return { pageStart: 1, pageEnd: 1 };
    }

    let cursor = 0;
    let pageStart = null;
    let pageEnd = null;

    for (const p of pages) {
        const pStart = typeof p.startChar === 'number' ? p.startChar : cursor;
        const pEnd = typeof p.endChar === 'number' ? p.endChar : pStart + (p.text?.length || 0);
        cursor = pEnd;

        if (pEnd > charStart && pStart < charEnd) {
            if (pageStart === null) pageStart = p.page;
            pageEnd = p.page;
        }
    }

    const fallback = pages[0].page || 1;
    return {
        pageStart: pageStart ?? fallback,
        pageEnd: pageEnd ?? pageStart ?? fallback
    };
};

const findSectionPath = (sections, charStart) => {
    if (!sections || sections.length === 0) return [];
    let matched = [];
    for (const sec of sections) {
        if (sec.startChar <= charStart) {
            matched = sec.sectionPath || [];
        } else {
            break;
        }
    }
    return matched;
};

export const chunkDocument = (loaded, { size = 600, overlap = 50, sourcePath = '' } = {}) => {
    const pages = loaded.pages || [];
    const text = typeof loaded.text === 'string' ? loaded.text : pages.map((p) => p.text).join('');
    const resolvedSourcePath = sourcePath || loaded.sourcePath || '';
    const chunks = [];
    let start = 0;
    let chunkIndex = 0;

    while (start < text.length) {
        const end = Math.min(start + size, text.length);
        const chunkTextStr = text.slice(start, end);
        const sectionPath = findSectionPath(loaded.sections, start);
        const { pageStart, pageEnd } = findPageRange(pages, start, end);
        const header = sectionPath.length > 0
            ? `${resolvedSourcePath} > ${sectionPath.join(' > ')}`
            : resolvedSourcePath;

        chunks.push({
            chunkIndex,
            text: chunkTextStr,
            charStart: start,
            charEnd: end,
            pageStart,
            pageEnd,
            sectionPath,
            sectionId: sha256(`${resolvedSourcePath}|${sectionPath.join(' > ')}`),
            blockType: 'paragraph',
            tokenCount: estimateTokens(chunkTextStr),
            header,
            contentHash: sha256(chunkTextStr)
        });

        chunkIndex += 1;
        if (end >= text.length) break;
        start = end - overlap;
    }

    return chunks;
};
