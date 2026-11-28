export const shapeSources = (chunks = []) => {
    return chunks.map((chunk, idx) => ({
        id: `S${idx + 1}`,
        documentId: chunk.documentId,
        sourcePath: chunk.sourcePath || chunk.filename || '',
        filename: chunk.filename || '',
        sectionPath: Array.isArray(chunk.sectionPath) ? chunk.sectionPath : [],
        pageStart: chunk.pageStart ?? null,
        pageEnd: chunk.pageEnd ?? null,
        chunkIndex: chunk.chunkIndex,
        snippet: (chunk.text || '').slice(0, 300),
        score: chunk.score ?? null
    }));
};
