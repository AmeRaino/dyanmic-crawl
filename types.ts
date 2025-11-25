export interface ParsedNode {
  id: string; // Unique path ID e.g., "0-1-2"
  tag: string;
  attributes: Record<string, string>;
  children: ParsedNode[];
  textContent?: string;
  isSelfClosing?: boolean;
}

export interface InspectorState {
  html: string;
  parsedRoot: ParsedNode | null;
  selectedId: string | null;
  hoveredId: string | null;
}

export interface ScrapeTarget {
  id: string;       // internal inspector id
  selector: string; // generated css selector
  name: string;     // user provided name (e.g., "Product Title")
  description: string; // User instruction e.g. "Get all hrefs from a tags inside"
  exampleValue: string; // text content preview
}

export enum ViewMode {
  Split = 'SPLIT',
  Visual = 'VISUAL',
  Code = 'CODE'
}