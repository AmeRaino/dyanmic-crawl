import { GoogleGenAI } from "@google/genai";
import { ParsedNode, ScrapeTarget } from "../types";

// Helper to format node back to HTML string for the prompt
const nodeToHtmlString = (node: ParsedNode): string => {
  if (node.tag === '#text') return node.textContent || '';
  
  const attrs = Object.entries(node.attributes)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
    
  const openTag = `<${node.tag}${attrs ? ' ' + attrs : ''}>`;
  if (node.isSelfClosing) return openTag;
  
  const childrenStr = node.children.map(c => {
      if (c.tag === '#text') return c.textContent;
      return `<${c.tag}>...</${c.tag}>`; 
  }).join('');
  
  return `${openTag}${childrenStr}</${node.tag}>`;
};

export const analyzeElementStream = async function* (node: ParsedNode) {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        yield "Please provide a valid API_KEY in your environment variables to use Gemini features.";
        return;
    }

    const ai = new GoogleGenAI({ apiKey });
    const elementSnippet = nodeToHtmlString(node);

    const prompt = `
      You are an expert web developer and accessibility specialist.
      Analyze the following HTML element snippet and explain its likely purpose, styling implications, and any accessibility considerations.
      Keep it concise (under 100 words).
      
      HTML Snippet:
      \`\`\`html
      ${elementSnippet}
      \`\`\`
    `;

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }

  } catch (error) {
    console.error("Gemini API Error:", error);
    yield "Failed to analyze element. Please check your API key and connection.";
  }
};

export const generateScrapingScript = async (html: string, targets: ScrapeTarget[]): Promise<string> => {
  // Legacy non-streaming wrapper
  let result = '';
  const stream = generateScrapingScriptStream(html, targets);
  for await (const chunk of stream) {
    result += chunk;
  }
  return result;
}

export const generateScrapingScriptStream = async function* (html: string, targets: ScrapeTarget[]) {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      yield "// Error: No API Key";
      return;
    }

    const ai = new GoogleGenAI({ apiKey });

    const targetsDesc = targets.map(t => `
      - Field Name: "${t.name}"
      - Selector: "${t.selector}"
      - User Instruction: "${t.description}"
      - Example of raw text: "${t.exampleValue}"
    `).join('\n');

    const prompt = `
      You are a web scraping expert. I have an HTML page and a list of data points I want to extract.
      
      Target Data Points:
      ${targetsDesc}

      Task:
      Write a JavaScript function named \`extractData\` that takes the \`document\` object as an argument.
      It should return a JSON object where the keys are the "Field Name" (normalized to camelCase).
      
      Important Rules:
      1. **Follow User Instructions**: The "User Instruction" is the most important part. If it says "get all links" or "list of items", return an Array. If it says "text", return a String.
      2. **Selector Fallback**: Use the provided selector as a starting point. If the user instruction implies children of that selector (e.g. "get links inside this div"), find elements *within* that selector.
      3. **Robustness**: Handle missing elements gracefully (null or empty string/array).
      4. **Output**: Return ONLY the raw JavaScript code for the function. Do not wrap in markdown code blocks.
      
      Example output structure:
      function extractData(doc) {
        const root = doc.querySelector('...');
        return {
           productTitle: root ? root.innerText : '',
           images: Array.from(root.querySelectorAll('img')).map(i => i.src)
        };
      }
    `;

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash', 
      contents: prompt,
    });

    for await (const chunk of responseStream) {
      let text = chunk.text || '';
      // Basic cleanup of markdown blocks if they appear in stream chunks
      text = text.replace(/```javascript|```/g, '');
      if (text) yield text;
    }

  } catch (error) {
    console.error("Gemini Scraper Gen Error:", error);
    yield "// Error generating scraping script. Check API Key.";
  }
}