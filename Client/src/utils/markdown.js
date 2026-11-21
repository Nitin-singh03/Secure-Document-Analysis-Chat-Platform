import { marked } from 'marked';

const renderer = new marked.Renderer();

renderer.code = function ({ text, lang }) {
    const codeId = 'code-' + Math.random().toString(36).substring(2, 9);
    const escapedCode = (text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const languageLabel = lang || '';

    return `<div class="code-block">
        ${languageLabel ? `<span class="language-label">${languageLabel}</span>` : ''}
        <button class="copy-button" onclick="copyCode('${codeId}')" title="Copy code">Copy</button>
        <pre><code id="${codeId}">${escapedCode}</code></pre>
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
        return marked.parse(content);
    } catch (err) {
        console.error('Markdown parse error:', err);
        return content;
    }
};

