import path from 'node:path';
import mammoth from 'mammoth';

export const loadDocx = async (buffer, relativePosixPath) => {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value || '';
    const title = path.posix.basename(relativePosixPath, path.posix.extname(relativePosixPath));

    return {
        title,
        pages: [{ page: 1, text, startChar: 0, endChar: text.length }],
        sections: [],
        frontMatter: null
    };
};
