import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChunkerVersion, ACTIVE } from './pipelines.js';

test('buildChunkerVersion formats v0 without normalize suffix', () => {
    assert.equal(
        buildChunkerVersion('v0'),
        'v0:sliding-600-50:text:gemini-embedding-001:768:raw'
    );
});

test('buildChunkerVersion throws on unknown ingest version', () => {
    assert.throws(() => buildChunkerVersion('v999'), /Unknown ingest version: v999/);
});

test('ACTIVE defaults to v0 when env overrides are unset', () => {
    assert.deepEqual(ACTIVE, {
        ingest: process.env.INGEST_VERSION || 'v0',
        retrieval: process.env.RETRIEVAL_PROFILE || 'v0',
        prompt: process.env.PROMPT_VERSION || 'v0'
    });
});

test('ACTIVE respects INGEST_VERSION, RETRIEVAL_PROFILE, and PROMPT_VERSION overrides', async () => {
    const prevIngest = process.env.INGEST_VERSION;
    const prevRetrieval = process.env.RETRIEVAL_PROFILE;
    const prevPrompt = process.env.PROMPT_VERSION;

    process.env.INGEST_VERSION = 'v1a';
    process.env.RETRIEVAL_PROFILE = 'hybrid';
    process.env.PROMPT_VERSION = 'v1';

    try {
        const mod = await import(`./pipelines.js?override=${Date.now()}`);
        assert.deepEqual(mod.ACTIVE, {
            ingest: 'v1a',
            retrieval: 'hybrid',
            prompt: 'v1'
        });
    } finally {
        if (prevIngest === undefined) delete process.env.INGEST_VERSION;
        else process.env.INGEST_VERSION = prevIngest;
        if (prevRetrieval === undefined) delete process.env.RETRIEVAL_PROFILE;
        else process.env.RETRIEVAL_PROFILE = prevRetrieval;
        if (prevPrompt === undefined) delete process.env.PROMPT_VERSION;
        else process.env.PROMPT_VERSION = prevPrompt;
    }
});
