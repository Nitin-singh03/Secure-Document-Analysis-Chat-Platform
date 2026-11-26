import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { walkFolder } from './walk.js';
import { applyRules } from './rules.js';

test('walkFolder sorts deterministically, skips dotfiles/node_modules, and handles apostrophes/spaces', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'intellidoc-walk-'));
    try {
        await fs.mkdir(path.join(tmpDir, 'employees'), { recursive: true });
        await fs.mkdir(path.join(tmpDir, 'contracts'), { recursive: true });
        await fs.mkdir(path.join(tmpDir, '.git'), { recursive: true });
        await fs.mkdir(path.join(tmpDir, 'node_modules', 'pkg'), { recursive: true });

        await fs.writeFile(path.join(tmpDir, 'employees', "Michael O'Brien.md"), '# Bio');
        await fs.writeFile(path.join(tmpDir, 'contracts', 'Contract with GlobalRe Partners for Rellm.md'), '# Contract');
        await fs.writeFile(path.join(tmpDir, '.hidden.md'), 'skip');
        await fs.writeFile(path.join(tmpDir, '.git', 'config.txt'), 'skip');
        await fs.writeFile(path.join(tmpDir, 'node_modules', 'pkg', 'readme.md'), 'skip');
        await fs.writeFile(path.join(tmpDir, 'ignore.png'), 'skip');

        const files = await walkFolder(tmpDir);
        assert.deepEqual(
            files.map((f) => ({ path: f.relativePosixPath, folderPath: f.folderPath })),
            [
                {
                    path: 'contracts/Contract with GlobalRe Partners for Rellm.md',
                    folderPath: ['contracts']
                },
                {
                    path: "employees/Michael O'Brien.md",
                    folderPath: ['employees']
                }
            ]
        );
    } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
    }
});

test('applyRules works zero-config without kb.config.json', () => {
    const res = applyRules({
        relativePosixPath: 'notes/rag-paper.md',
        frontMatter: { tags: ['ml', 'rag'], year: '2025' },
        kbConfig: null
    });

    assert.deepEqual(res, {
        authority: 'normal',
        tags: ['ml', 'rag'],
        metadata: { tags: ['ml', 'rag'], year: '2025' }
    });
});

test('applyRules matches kb.config.json contract entityRegex and apostrophe employee filename', () => {
    const kbConfig = {
        defaults: { authority: 'normal', tags: [], metadata: { docType: 'document' } },
        rules: [
            {
                pattern: 'employees/**',
                authority: 'normal',
                docType: 'employee',
                entityFrom: 'filename',
                tagPrefix: true
            },
            {
                pattern: 'contracts/**',
                authority: 'primary',
                docType: 'contract',
                entityRegex: '^Contract with (.+?) for (.+?)(?:\\s-\\s.*)?\\.(?:md|pdf|docx)$',
                entityGroups: { entity: 1, extra: [2] },
                tagPrefix: true
            }
        ]
    };

    const contractRes = applyRules({
        relativePosixPath: 'contracts/Contract with GlobalRe Partners for Rellm.md',
        kbConfig
    });
    assert.equal(contractRes.authority, 'primary');
    assert.equal(contractRes.metadata.docType, 'contract');
    assert.equal(contractRes.metadata.entity, 'GlobalRe Partners');
    assert.deepEqual(contractRes.metadata.entities, ['GlobalRe Partners', 'Rellm']);
    assert.deepEqual(contractRes.tags, [
        'type:contract',
        'entity:GlobalRe Partners',
        'entity:Rellm'
    ]);

    const empRes = applyRules({
        relativePosixPath: "employees/Michael O'Brien.md",
        kbConfig
    });
    assert.equal(empRes.authority, 'normal');
    assert.equal(empRes.metadata.docType, 'employee');
    assert.equal(empRes.metadata.entity, "Michael O'Brien");
    assert.deepEqual(empRes.tags, ['type:employee', "entity:Michael O'Brien"]);
});
