import React from 'react';

const parseMarkdown = (text: string): string => {
  if (!text) return '';

  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // Process lists first to avoid conflicts with other syntax
  const lines = html.split('\n');
  let inList = false;
  const processedLines = lines.map(line => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      const content = trimmedLine.substring(2);
      const listItem = `<li>${content}</li>`;
      if (!inList) {
        inList = true;
        return `<ul>${listItem}`;
      }
      return listItem;
    } else {
      if (inList) {
        inList = false;
        return `</ul>${line}`;
      }
      return line;
    }
  });

  if (inList) {
    processedLines.push('</ul>');
  }

  html = processedLines.join('\n');
  
  // Bold (**text**) - after list processing
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Italic (*text*)
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Convert remaining newlines to <br>, but not if they are next to a list tag
  html = html.replace(/<\/ul>\n/g, '</ul>');
  html = html.replace(/\n<ul>/g, '<ul>');
  html = html.replace(/\n/g, '<br />');

  return html;
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
