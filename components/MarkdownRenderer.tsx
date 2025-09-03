import React from 'react';

const HIGHLIGHT_CLASSES: Record<string, string> = {
  y: 'text-yellow-300 bg-yellow-500/20 px-1 rounded-sm',
  c: 'text-cyan-300 bg-cyan-500/20 px-1 rounded-sm',
  m: 'text-pink-300 bg-pink-500/20 px-1 rounded-sm',
  l: 'text-lime-300 bg-lime-500/20 px-1 rounded-sm',
};

const parseMarkdown = (text: string): string => {
  if (!text) return '';

  const escapeHtml = (unsafe: string) =>
    unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const processInlines = (str: string) => {
    // IMPORTANT: The order of replacements matters for nesting.
    // The input 'str' is a single line of text, already HTML-escaped.
    // We are replacing markdown with HTML tags on the safe string.
    return str
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\|\|([ycml])\|(.*?)\|\|/g, (_match, colorCode, content) => {
          const className = HIGHLIGHT_CLASSES[colorCode] || '';
          // The 'content' part might already contain <strong> or <em> tags. This is safe.
          return `<span class="${className}">${content}</span>`;
      });
  };
  
  // Process blocks (paragraphs) separated by one or more empty lines.
  const blocks = text.split(/\n\s*\n/);

  const htmlBlocks = blocks.map(block => {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) return '';
    
    // All blocks are treated as paragraphs. They can have soft line breaks.
    // Escape each line's content first, then apply inline formatting.
    const lines = trimmedBlock.split('\n');
    const processedLines = lines.map(line => processInlines(escapeHtml(line)));
    return `<p>${processedLines.join('<br />')}</p>`;
  });

  return htmlBlocks.join('');
};


interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  const htmlContent = parseMarkdown(content);
  return (
    <div
      className={`${className || ''} space-y-4`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export default MarkdownRenderer;
