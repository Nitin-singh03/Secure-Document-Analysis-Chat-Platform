import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_ALLOWED_EXTS = new Set(['.md', '.txt', '.pdf', '.docx']);
const DEFAULT_MAX_BYTES = 20 * 1024 * 1024;

export const walkFolder = async (
    rootDir,
    { maxFileBytes = DEFAULT_MAX_BYTES, allowedExts = DEFAULT_ALLOWED_EXTS } = {}
) => {
    const resolvedRoot = path.resolve(rootDir);
    const entries = [];

    const visit = async (currentDir, relSegments) => {
        const dirEntries = await fs.readdir(currentDir, { withFileTypes: true });
        for (const entry of dirEntries) {
            if (entry.name.startsWith('.')) continue;
            if (entry.name === 'node_modules') continue;

            const absPath = path.join(currentDir, entry.name);
            const nextSegments = [...relSegments, entry.name];

            if (entry.isDirectory()) {
                await visit(absPath, nextSegments);
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if (!allowedExts.has(ext)) continue;

                const stat = await fs.stat(absPath);
                if (stat.size > maxFileBytes) {
                    console.warn(`Skipping oversized file (${stat.size} bytes): ${nextSegments.join('/')}`);
                    continue;
                }

                entries.push({
                    absolutePath: absPath,
                    relativePosixPath: nextSegments.join('/'),
                    folderPath: relSegments,
                    sizeBytes: stat.size
                });
            }
        }
    };

    await visit(resolvedRoot, []);

    entries.sort((a, b) => {
        if (a.relativePosixPath < b.relativePosixPath) return -1;
        if (a.relativePosixPath > b.relativePosixPath) return 1;
        return 0;
    });

    return entries;
};
