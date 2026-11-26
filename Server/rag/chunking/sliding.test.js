import test from 'node:test';
import assert from 'node:assert/strict';
import { chunkText } from '../../vectorUtils.js';
import { chunkDocument, estimateTokens } from './sliding.js';

const SAMPLE_TEXTS = [
    'Short text under 600 chars.',
    'A'.repeat(600),
    'Lorem ipsum dolor sit amet. '.repeat(45),
    'Line one\nLine two\nLine three\n'.repeat(60),
    'Unicode café naïve résumé — ' + 'word '.repeat(250)
];

test('chunkDocument matches legacy chunkText(600, 50) output on 5 sample texts', () => {
    for (const sample of SAMPLE_TEXTS) {
        const expected = chunkText(sample, 600, 50);
        const loaded = {
            sourcePath: 'docs/sample.md',
            pages: [{ page: 1, text: sample, startChar: 0, endChar: sample.length }],
            sections: [{ sectionPath: ['Intro'], startChar: 0 }],
            text: sample
        };
        const actual = chunkDocument(loaded, { size: 600, overlap: 50 });

        assert.deepEqual(
            actual.map((c) => c.text),
            expected
        );

        actual.forEach((chunk, idx) => {
            assert.equal(chunk.chunkIndex, idx);
            assert.equal(chunk.blockType, 'paragraph');
            assert.equal(chunk.pageStart, 1);
            assert.equal(chunk.pageEnd, 1);
            assert.deepEqual(chunk.sectionPath, ['Intro']);
            assert.equal(chunk.header, 'docs/sample.md > Intro');
            assert.equal(chunk.tokenCount, estimateTokens(chunk.text));
            assert.equal(chunk.charEnd - chunk.charStart, chunk.text.length);
            assert.ok(chunk.sectionId);
        });
    }
});

test('estimateTokens uses Math.ceil(text.length / 3.5)', () => {
    assert.equal(estimateTokens(''), 0);
    assert.equal(estimateTokens('abcd'), 2);
    assert.equal(estimateTokens('abcdefg'), 2);
    assert.equal(estimateTokens('abcdefgh'), 3);
});
