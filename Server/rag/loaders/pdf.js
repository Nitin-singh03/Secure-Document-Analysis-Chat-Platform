import path from 'node:path';
import { PdfReader } from 'pdfreader';

export const parsePdfItems = (items) => {
    const pageTexts = new Map();
    let currentPage = 1;

    for (const item of items) {
        if (!item) continue;
        if (item.page) {
            currentPage = item.page;
            if (!pageTexts.has(currentPage)) {
                pageTexts.set(currentPage, '');
            }
        } else if (item.text) {
            const prev = pageTexts.get(currentPage) || '';
            pageTexts.set(currentPage, prev + item.text + ' ');
        }
    }

    const sortedPageNums = Array.from(pageTexts.keys()).sort((a, b) => a - b);
    const pages = [];
    let cursor = 0;

    for (const pageNum of sortedPageNums) {
        const text = pageTexts.get(pageNum) || '';
        const startChar = cursor;
        const endChar = cursor + text.length;
        pages.push({ page: pageNum, text, startChar, endChar });
        cursor = endChar;
    }

    return pages;
};

export const loadPdf = (buffer, relativePosixPath) => {
    return new Promise((resolve, reject) => {
        const items = [];
        new PdfReader().parseBuffer(buffer, (err, item) => {
            if (err) {
                reject(err);
            } else if (!item) {
                const pages = parsePdfItems(items);
                const title = path.posix.basename(relativePosixPath, path.posix.extname(relativePosixPath));
                resolve({
                    title,
                    pages,
                    sections: [],
                    frontMatter: null
                });
            } else {
                items.push(item);
            }
        });
    });
};
