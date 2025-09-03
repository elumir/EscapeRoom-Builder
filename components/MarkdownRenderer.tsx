import React from 'react';

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
    // Escape the raw string content first to prevent XSS.
    const escaped = escapeHtml(str);
    // Then apply markdown formatting to the safe string.
    return escaped
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  };

  // Process blocks (paragraphs, lists) which are separated by one or more empty lines.
  const blocks = text.split(/\n\s*\n/);

  const htmlBlocks = blocks.map(block => {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) return '';
    
    // Check if the block is a list by inspecting the first line.
    if (trimmedBlock.startsWith('- ') || trimmedBlock.startsWith('* ')) {
      const listItems = trimmedBlock.split('\n').map(item => {
        const content = item.trim().substring(2); // Remove the list marker ("- " or "* ")
        return `<li>${processInlines(content)}</li>`;
      }).join('');
      return `<ul>${listItems}</ul>`;
    } else {
      // It's a paragraph. Paragraphs can have soft line breaks.
      // We process each line for inline formatting and then join them with <br />.
      const lines = trimmedBlock.split('\n');
      const processedLines = lines.map(line => processInlines(line));
      return `<p>${processedLines.join('<br />')}</p>`;
    }
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
      className={className}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export default MarkdownRenderer;
