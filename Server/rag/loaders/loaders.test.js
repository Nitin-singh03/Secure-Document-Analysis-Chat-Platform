import test from 'node:test';
import assert from 'node:assert/strict';
import { loadMarkdown } from './markdown.js';
import { parsePdfItems } from './pdf.js';

test('loadMarkdown normalizes CRLF, parses YAML front matter, and tracks sectionPath by offset', () => {
    const raw = [
        '---',
        'title: Custom Title',
        'tags: [policy, hr]',
        'author: Jane Doe',
        '---',
        '# Overview',
        'Intro text.',
        '## Details',
        'Detail body.'
    ].join('\r\n');

    const loaded = loadMarkdown(Buffer.from(raw, 'utf8'), 'company/overview.md');

    assert.equal(loaded.title, 'Custom Title');
    assert.deepEqual(loaded.frontMatter, {
        title: 'Custom Title',
        tags: ['policy', 'hr'],
        author: 'Jane Doe'
    });
    assert.equal(loaded.pages.length, 1);
    assert.ok(!loaded.pages[0].text.includes('\r'));
    assert.deepEqual(loaded.sections, [
        { sectionPath: ['Overview'], startChar: 0 },
        { sectionPath: ['Overview', 'Details'], startChar: loaded.pages[0].text.indexOf('## Details') }
    ]);
});

test('parsePdfItems preserves item.text + space joining and per-page character offsets', () => {
    const items = [
        { page: 1 },
        { text: 'Hello' },
        { text: 'world' },
        { page: 2 },
        { text: 'Page' },
        { text: 'two' }
    ];

    const pages = parsePdfItems(items);
    assert.deepEqual(pages, [
        { page: 1, text: 'Hello world ', startChar: 0, endChar: 12 },
        { page: 2, text: 'Page two ', startChar: 12, endChar: 21 }
    ]);
});
