import { ACTIVE, RETRIEVAL_PROFILES, buildChunkerVersion } from '../pipelines.js';
import { vectorSearch } from './vector.js';

export const retrieve = async ({
    userId,
    collectionId,
    documentIds,
    filters,
    queryEmbedding,
    profile = ACTIVE.retrieval,
    ingestVersion = ACTIVE.ingest
}) => {
    const profileCfg = RETRIEVAL_PROFILES[profile];
    if (!profileCfg) {
        throw new Error(`Unknown retrieval profile: ${profile}`);
    }

    const chunkerVersion = buildChunkerVersion(ingestVersion);

    return vectorSearch({
        userId,
        collectionId,
        documentIds,
        filters,
        queryEmbedding,
        chunkerVersion,
        topK: profileCfg.topK,
        numCandidates: profileCfg.numCandidates
    });
};
