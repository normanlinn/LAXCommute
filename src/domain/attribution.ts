// Attribution is configurable HTML, but it must never introduce active content.
export function safeAttribution(value: string): string {
  const escape = (text: string) =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  if (typeof DOMParser === 'undefined') return escape(value);
  const parsed = new DOMParser().parseFromString(value, 'text/html');
  const render = (node: Node): string => {
    if (node.nodeType === 3) return escape(node.textContent || '');
    if (!(node instanceof Element)) return '';
    if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH'].includes(node.tagName))
      return '';
    const text = Array.from(node.childNodes).map(render).join('');
    if (node.tagName === 'A') {
      try {
        const url = new URL(node.getAttribute('href') || '');
        if (url.protocol === 'https:')
          return `<a href="${escape(url.href)}" rel="noopener noreferrer">${text}</a>`;
      } catch {
        /* Invalid links become plain text. */
      }
    }
    return text;
  };
  return Array.from(parsed.body.childNodes).map(render).join('');
}
