/**
 * Very simple Markdown-to-HTML converter.
 * For production use, consider react-markdown or marked with DOMPurify.
 * This implementation handles common patterns without external deps.
 */
export function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Escape HTML to prevent XSS from raw HTML in markdown
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Fenced code blocks (``` lang ... ```)
  html = html.replace(
    /```(\w+)?\n?([\s\S]*?)```/g,
    (_match, _lang, code: string) => {
      return `<pre><code>${code.trim()}</code></pre>`;
    },
  );

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headers
  html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

  // Unordered lists
  html = html.replace(/^[\*\-] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr />');

  // Paragraphs — wrap lines not already wrapped in a block element
  const blockTags = /^<(h[1-6]|ul|ol|li|pre|blockquote|hr)/;
  html = html
    .split('\n')
    .map((line) => {
      if (line.trim() === '') return '';
      if (blockTags.test(line.trim())) return line;
      return `<p>${line}</p>`;
    })
    .join('\n');

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}

/**
 * Sanitize HTML by stripping dangerous tags/attributes.
 * Very basic — for production use DOMPurify.
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '');
}

/**
 * Convert markdown to sanitized HTML.
 */
export function renderMarkdown(markdown: string): string {
  return sanitizeHtml(markdownToHtml(markdown));
}
