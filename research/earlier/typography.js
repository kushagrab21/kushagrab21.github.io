// Keep readable separators in source data; render them as CSS circles in the DOM.
export const separator = ' · ';
export const spaceDots = value => String(value).replace(/[ \t\u00a0\u202f]*·[ \t\u00a0\u202f]*/g, separator);
export const htmlText = value => spaceDots(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export function separatedText(value, doc = document) {
  const fragment = doc.createDocumentFragment();
  String(value).split('·').forEach((part, index) => {
    if (index) {
      const dot = doc.createElement('span');
      dot.className = 'sep';
      dot.setAttribute('aria-hidden', 'true');
      fragment.append(dot);
    }
    fragment.append(doc.createTextNode(part.trim()));
  });
  return fragment;
}

// Convert existing text nodes, preserving surrounding markup and never parsing data as HTML.
export function renderSeparators(root) {
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, 4); // NodeFilter.SHOW_TEXT
  const nodes = [];
  while (walker.nextNode()) if (walker.currentNode.textContent.includes('·')) nodes.push(walker.currentNode);
  for (const node of nodes) node.replaceWith(separatedText(node.textContent, doc));
}

export function setSeparatedText(element, value) {
  element.replaceChildren(separatedText(value, element.ownerDocument));
}
