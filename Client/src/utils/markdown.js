import { marked } from 'marked';
import DOMPurify from 'dompurify';

const renderer = new marked.Renderer();

renderer.code = function ({ text, lang }) {
    const escapedCode = (text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const languageLabel = lang || '';

    return `<div class="code-block">
        ${languageLabel ? `<span class="language-label">${languageLabel}</span>` : ''}
        <button class="copy-button" data-action="copy" title="Copy code">Copy</button>
        <pre><code>${escapedCode}</code></pre>
    </div>`;
};

marked.use({
    renderer,
    gfm: true,
    breaks: true
});

export const formatMarkdown = (content) => {
    if (!content) return '';
    try {
        const rawHtml = marked.parse(content);
        return DOMPurify.sanitize(rawHtml, {
            ADD_ATTR: ['data-action']
        });
    } catch (err) {
        console.error('Markdown parse error:', err);
        return DOMPurify.sanitize(content);
    }
};
