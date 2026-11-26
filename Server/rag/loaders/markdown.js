import path from 'node:path';

const normalizeLineEndings = (raw) => raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

const stripQuotes = (val) => {
    const trimmed = val.trim();
    if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
        return trimmed.slice(1, -1);
    }
    return trimmed;
};

export const parseFrontMatter = (normalizedText) => {
    const match = normalizedText.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
    if (!match) {
        return { frontMatter: null, body: normalizedText };
    }

    const rawYaml = match[1];
    const body = normalizedText.slice(match[0].length);
    const frontMatter = {};
    let currentArrayKey = null;

    for (const line of rawYaml.split('\n')) {
        const listMatch = line.match(/^\s*-\s+(.+)$/);
        if (listMatch && currentArrayKey) {
            frontMatter[currentArrayKey].push(stripQuotes(listMatch[1]));
            continue;
        }

        const kvMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (!kvMatch) {
            currentArrayKey = null;
            continue;
        }

        const key = kvMatch[1];
        const rawVal = kvMatch[2].trim();

        if (rawVal === '') {
            frontMatter[key] = [];
            currentArrayKey = key;
        } else if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
            const inner = rawVal.slice(1, -1).trim();
            frontMatter[key] = inner
                ? inner.split(',').map((item) => stripQuotes(item)).filter(Boolean)
                : [];
            currentArrayKey = null;
        } else {
            frontMatter[key] = stripQuotes(rawVal);
            currentArrayKey = null;
        }
    }

    return { frontMatter, body };
};

export const extractHeadingSections = (text) => {
    const sections = [];
    const stack = [];
    let offset = 0;
    let inCodeFence = false;

    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/^\s*(```|~~~)/.test(line)) {
            inCodeFence = !inCodeFence;
        } else if (!inCodeFence) {
            const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*$/);
            if (headingMatch) {
                const level = headingMatch[1].length;
                const title = headingMatch[2].replace(/\s+#+\s*$/, '').trim();
                while (stack.length > 0 && stack[stack.length - 1].level >= level) {
                    stack.pop();
                }
                stack.push({ level, title });
                sections.push({
                    sectionPath: stack.map((item) => item.title),
                    startChar: offset
                });
            }
        }
        offset += line.length + (i < lines.length - 1 ? 1 : 0);
    }

    return sections;
};

export const loadMarkdown = (buffer, relativePosixPath) => {
    const normalized = normalizeLineEndings(buffer.toString('utf8'));
    const { frontMatter, body } = parseFrontMatter(normalized);
    const sections = extractHeadingSections(body);
    const firstHeading = sections[0]?.sectionPath?.[0];
    const baseName = path.posix.basename(relativePosixPath, path.posix.extname(relativePosixPath));
    const title = (typeof frontMatter?.title === 'string' && frontMatter.title) || firstHeading || baseName;

    return {
        title,
        pages: [{ page: 1, text: body, startChar: 0, endChar: body.length }],
        sections,
        frontMatter
    };
};
