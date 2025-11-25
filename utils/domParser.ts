import { ParsedNode } from '../types';

/**
 * Parses a raw HTML string into a structured tree (ParsedNode) and 
 * generates a modified HTML string with data-inspector-id attributes injected.
 */
export const parseHtmlContent = (html: string): { root: ParsedNode; injectedHtml: string } => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;

  // We wrap the user content in a wrapper to ensure a single root for our tree
  const rootNode: ParsedNode = {
    id: 'root',
    tag: 'div', // Abstract root
    attributes: { class: 'inspector-root' },
    children: [],
  };

  // Helper to traverse and build the tree + inject IDs
  const traverse = (domNode: Element, path: string): ParsedNode => {
    // Inject ID into the actual DOM node so we can serialize it back later
    domNode.setAttribute('data-inspector-id', path);

    // Build the abstract node
    const attributes: Record<string, string> = {};
    Array.from(domNode.attributes).forEach((attr) => {
      if (attr.name !== 'data-inspector-id') { 
        attributes[attr.name] = attr.value;
      }
    });

    const children: ParsedNode[] = [];
    let childIndex = 0;

    domNode.childNodes.forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const childPath = `${path}-${childIndex}`;
        children.push(traverse(child as Element, childPath));
        childIndex++;
      } else if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
        children.push({
          id: `${path}-txt-${childIndex}`,
          tag: '#text',
          attributes: {},
          children: [],
          textContent: child.textContent,
          isSelfClosing: true
        });
        childIndex++;
      }
    });

    const voidElements = [
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 
      'link', 'meta', 'param', 'source', 'track', 'wbr'
    ];

    return {
      id: path,
      tag: domNode.tagName.toLowerCase(),
      attributes,
      children,
      isSelfClosing: voidElements.includes(domNode.tagName.toLowerCase())
    };
  };

  // Process all body children for the tree view
  let childIndex = 0;
  Array.from(body.children).forEach((child) => {
    rootNode.children.push(traverse(child, `root-${childIndex}`));
    childIndex++;
  });

  // Serialize the FULL modified DOM back to string for the visual preview (iframe)
  const serializer = new XMLSerializer();
  const injectedHtml = serializer.serializeToString(doc);

  return { root: rootNode, injectedHtml };
};

/**
 * Generates a CSS selector string for a specific node ID within the tree.
 */
export const generateCssSelector = (root: ParsedNode, targetId: string): string => {
  const findPath = (node: ParsedNode, currentPath: ParsedNode[]): ParsedNode[] | null => {
    if (node.id === targetId) {
      return [...currentPath, node];
    }
    for (const child of node.children) {
      const result = findPath(child, [...currentPath, node]);
      if (result) return result;
    }
    return null;
  };

  const path = findPath(root, []);
  if (!path || path.length === 0) return '';

  const pathNodes = path.slice(1); 

  if (pathNodes.length === 0) return 'root';

  return pathNodes.map((node, idx) => {
      let selector = node.tag;
      
      if (node.attributes.id) {
          selector += `#${node.attributes.id}`;
      } else if (node.attributes.class) {
          const classes = node.attributes.class.trim().split(/\s+/);
          if (classes.length > 0 && classes[0]) {
             selector += `.${classes[0]}`; 
          }
      } else {
          const parent = path[idx]; 
          if (parent && parent.children) {
             const siblings = parent.children.filter(c => c.tag === node.tag);
             if (siblings.length > 1) {
                 const indexInSiblings = siblings.findIndex(c => c.id === node.id);
                 if (indexInSiblings >= 0) {
                     selector += `:nth-of-type(${indexInSiblings + 1})`;
                 }
             }
          }
      }
      return selector;
  }).join(' > ');
};

export const EXAMPLE_HTML = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Inter', sans-serif; background: #09090b; color: white; padding: 2rem; }
        .hero { background: #27272a; padding: 2rem; border-radius: 8px; border: 1px solid #3f3f46; }
        .h1 { font-size: 2.5rem; font-weight: bold; margin-bottom: 1rem; }
        .btn { background: #f97316; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 2rem; }
        .card { background: #18181b; padding: 1rem; border-radius: 6px; border: 1px solid #27272a; }
    </style>
</head>
<body>
<div class="hero">
  <h1 class="h1">Welcome to ScrapeScope</h1>
  <p>Inspect your scraped HTML with <span style="color: #34d399; font-weight: bold;">precision</span>.</p>
  <button class="btn">Get Started</button>
  <div class="grid">
    <div class="card">
      <h2>Visual Inspector</h2>
      <p>Now running inside an iframe for better isolation.</p>
    </div>
    <div class="card">
      <h2>Code Explorer</h2>
      <p>Syncs perfectly with the visual view.</p>
    </div>
  </div>
</div>
</body>
</html>
`;