import path from 'node:path';
import { parseFrontMatter, extractHeadingSections } from './markdown.js';

export const loadText = (buffer, relativePosixPath) => {
    const normalized = buffer.toString('utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const { frontMatter, body } = parseFrontMatter(normalized);
    const sections = extractHeadingSections(body);
    const baseName = path.posix.basename(relativePosixPath, path.posix.extname(relativePosixPath));
    const title = (typeof frontMatter?.title === 'string' && frontMatter.title) || baseName;

    return {
        title,
        pages: [{ page: 1, text: body, startChar: 0, endChar: body.length }],
        sections,
        frontMatter
    };
};
