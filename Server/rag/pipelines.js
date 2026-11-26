export const INGEST_VERSIONS = {
    v0: {
        chunker: { strategy: 'sliding', size: 600, overlap: 50 },
        embedInput: 'text',
        model: 'gemini-embedding-001',
        dim: 768,
        taskType: null
    }
    // Phase 3-A (de-bundled):
    // v1a: { chunker: { strategy: 'sliding', size: 600, overlap: 50 }, embedInput: 'text',
    //        model: 'gemini-embedding-001', dim: 768, taskType: 'RETRIEVAL_DOCUMENT' }
    // v1b: { chunker: { strategy: 'sliding', size: 600, overlap: 50 }, embedInput: 'header+text',
    //        model: 'gemini-embedding-001', dim: 768, taskType: 'RETRIEVAL_DOCUMENT' }
    // v2:  { chunker: { strategy: 'heading', size: 1000, overlap: 120 }, embedInput: 'header+text',
    //        model: 'gemini-embedding-001', dim: 768, taskType: 'RETRIEVAL_DOCUMENT' }
};

export const RETRIEVAL_PROFILES = {
    v0: { mode: 'vector', topK: 3, numCandidates: 30, rerank: null, expandNeighbors: 0 }
    // keyword, hybrid, hybrid_rerank, hybrid_rerank_expand, plus Phase 3-D flags added in later phases
};

export const PROMPT_VERSIONS = { v0: 'baseline' };

export const ACTIVE = {
    ingest: process.env.INGEST_VERSION || 'v0',
    retrieval: process.env.RETRIEVAL_PROFILE || 'v0',
    prompt: process.env.PROMPT_VERSION || 'v0'
};

export const buildChunkerVersion = (v) => {
    const cfg = INGEST_VERSIONS[v];
    if (!cfg) throw new Error(`Unknown ingest version: ${v}`);
    const { strategy, size, overlap } = cfg.chunker;
    const task = cfg.taskType || 'raw';
    return `${v}:${strategy}-${size}-${overlap}:${cfg.embedInput}:${cfg.model}:${cfg.dim}:${task}`;
};
