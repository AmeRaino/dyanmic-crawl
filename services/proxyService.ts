const PROXY_BASE = "https://cloudflare-cors-anywhere.minhvh1232.workers.dev/?";

export const fetchUrlContent = async (url: string): Promise<string> => {
  try {
    // Ensure URL has protocol
    let targetUrl = url;
    if (!targetUrl.startsWith('http')) {
      targetUrl = `https://${targetUrl}`;
    }

    const response = await fetch(`${PROXY_BASE}${encodeURIComponent(targetUrl)}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    return html;
  } catch (error) {
    console.error("Proxy Fetch Error:", error);
    throw error;
  }
};