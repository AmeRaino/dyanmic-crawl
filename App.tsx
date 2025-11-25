import React, { useState, useMemo, useRef } from 'react';
import { parseHtmlContent, EXAMPLE_HTML } from './utils/domParser';
import { CodeViewer } from './components/CodeViewer';
import { VisualViewer, VisualViewerHandle } from './components/VisualViewer';
import { ParsedNode, ScrapeTarget } from './types';
import { analyzeElementStream, generateScrapingScriptStream } from './services/geminiService';
import { fetchUrlContent } from './services/proxyService';
import { ResizableHandle } from './components/ResizableHandle';
import { cn } from './utils/cn';
import { 
    Layout, Code, Eye, Wand2, Loader2, MousePointer2, Globe, Plus, Trash2, 
    Terminal, Play, Target, ArrowRight, Command, Sparkles
} from 'lucide-react';
import { finder } from '@medv/finder';
import { Button, Input, Label, Badge, Card, ScrollArea, Textarea } from './components/ui';

export default function App() {
  // Layout State
  const [leftPanelWidth, setLeftPanelWidth] = useState(window.innerWidth * 0.45);
  const [rightPanelWidth, setRightPanelWidth] = useState(400); 
  const [outputHeight, setOutputHeight] = useState(300); // New vertical resize state
  const [isResizing, setIsResizing] = useState(false);

  // Content State
  const [urlInput, setUrlInput] = useState('');
  const [loadedUrl, setLoadedUrl] = useState<string>('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [rawHtml, setRawHtml] = useState<string>(EXAMPLE_HTML);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isInspectMode, setIsInspectMode] = useState(true);
  
  // AI State
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Scraper Builder State
  const [scrapeTargets, setScrapeTargets] = useState<ScrapeTarget[]>([]);
  const [targetName, setTargetName] = useState('');
  const [targetDescription, setTargetDescription] = useState('');
  const [generatedScript, setGeneratedScript] = useState('');
  const [scrapedResult, setScrapedResult] = useState<any>(null);
  const [isScraping, setIsScraping] = useState(false);

  // Refs
  const visualViewerRef = useRef<VisualViewerHandle>(null);

  // Parse HTML
  const { root, injectedHtml } = useMemo(() => parseHtmlContent(rawHtml), [rawHtml]);

  // Find selected node model
  const selectedNode = useMemo(() => {
    if (!selectedId || !root) return null;
    const findNode = (node: ParsedNode): ParsedNode | null => {
        if (node.id === selectedId) return node;
        for (const child of node.children) {
            const found = findNode(child);
            if (found) return found;
        }
        return null;
    };
    return findNode(root);
  }, [selectedId, root]);

  // Generate Selector
  const currentSelector = useMemo(() => {
      if (!selectedId || !visualViewerRef.current) return '';
      const container = visualViewerRef.current.getContainer(); 
      if (!container) return '';
      
      const element = container.querySelector(`[data-inspector-id="${selectedId}"]`);
      if (element) {
          try {
             // @ts-ignore
             return finder(element as Element, {
                 root: container,
                 idName: (name) => !name.startsWith('root'),
                 className: (name) => true,
                 tagName: (name) => true,
                 seedMinLength: 3,
                 threshold: 1000,
             });
          } catch (e) {
              return 'Unable to generate unique selector';
          }
      }
      return '';
  }, [selectedId]);

  const handleUrlSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!urlInput) return;
      setIsLoadingUrl(true);
      try {
          const content = await fetchUrlContent(urlInput);
          setRawHtml(content);
          setLoadedUrl(urlInput);
          setScrapeTargets([]);
          setGeneratedScript('');
          setScrapedResult(null);
          setSelectedId(null);
      } catch (err) {
          alert("Failed to load URL. Ensure it allows CORS or try another.");
      } finally {
          setIsLoadingUrl(false);
      }
  };

  const handleAddTarget = () => {
      if (!selectedId || !targetName) return;
      
      const preview = selectedNode?.textContent?.substring(0, 30) || 'Element';

      setScrapeTargets(prev => [
          ...prev, 
          {
              id: selectedId,
              selector: currentSelector,
              name: targetName,
              description: targetDescription || 'Get text content',
              exampleValue: preview
          }
      ]);
      setTargetName('');
      setTargetDescription('');
  };

  const handleRemoveTarget = (index: number) => {
      setScrapeTargets(prev => prev.filter((_, i) => i !== index));
  };

  const handleAiAnalyze = async () => {
    if (!selectedNode) return;
    setIsAnalyzing(true);
    setAiAnalysis('');
    
    const stream = analyzeElementStream(selectedNode);
    for await (const chunk of stream) {
        setAiAnalysis(prev => prev + chunk);
    }
    setIsAnalyzing(false);
  };

  const handleGenerateScraper = async () => {
      if (scrapeTargets.length === 0) return;
      setIsScraping(true);
      setGeneratedScript(''); // Clear previous script
      
      const stream = generateScrapingScriptStream(rawHtml, scrapeTargets);
      
      for await (const chunk of stream) {
          setGeneratedScript(prev => prev + chunk);
      }
      
      setIsScraping(false);
  };

  const handleRunScraper = () => {
      if (!generatedScript) return;
      try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(rawHtml, 'text/html');
          
          const wrapper = `
            ${generatedScript}
            return extractData(doc);
          `;
          
          const fn = new Function('doc', wrapper);
          const result = fn(doc);
          setScrapedResult(result);
      } catch (e) {
          setScrapedResult({ error: "Failed to execute script", details: String(e) });
      }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden font-sans selection:bg-white/20">
      {/* Minimal Polish Header */}
      <header className="h-16 border-b border-white/5 bg-background/95 backdrop-blur-md flex items-center justify-between px-5 shrink-0 z-50 relative">
        
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3 select-none w-[260px] shrink-0">
            <div className="h-9 w-9 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center shadow-inner group">
                <Target size={18} className="text-white group-hover:scale-105 transition-transform" />
            </div>
            <div className="flex flex-col justify-center">
                <h1 className="font-bold text-sm tracking-wide text-white leading-none">ScrapeScope</h1>
                <span className="text-[9px] text-zinc-500 font-medium tracking-widest mt-0.5 uppercase">AI Extraction Engine</span>
            </div>
        </div>

        {/* Center: URL Command Bar */}
        <div className="flex-1 flex justify-center max-w-2xl px-4">
             <form onSubmit={handleUrlSubmit} className="w-full relative group">
                <div className="relative flex items-center">
                     <div className="absolute left-3 text-zinc-500 transition-colors duration-300 group-focus-within:text-white">
                        {isLoadingUrl ? <Loader2 size={14} className="animate-spin"/> : <Globe size={14} />}
                     </div>
                     <input 
                        type="text" 
                        placeholder="https://example.com" 
                        className="w-full h-9 pl-9 pr-12 bg-zinc-900 border border-white/5 rounded-md text-xs sm:text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:bg-zinc-800 focus:border-white/10 focus:ring-1 focus:ring-white/5 shadow-sm transition-all font-medium tracking-normal"
                        value={urlInput}
                        onChange={e => setUrlInput(e.target.value)}
                     />
                     <div className="absolute right-1.5 top-1 bottom-1 flex items-center">
                        {urlInput && (
                             <Button 
                                type="submit"
                                size="icon"
                                className="h-7 w-7 rounded-sm bg-white/10 text-white hover:bg-white hover:text-black transition-all border-none"
                                disabled={isLoadingUrl}
                             >
                                <ArrowRight size={12} strokeWidth={2.5} />
                             </Button>
                        )}
                     </div>
                </div>
            </form>
        </div>

        {/* Right: Meta & Status */}
        <div className="flex items-center justify-end gap-3 w-[260px] shrink-0">
             <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/40 border border-white/5">
                 <div className="flex items-center gap-1.5">
                    <Sparkles size={10} className="text-white" />
                    <span className="text-[10px] text-zinc-400 font-medium tracking-wide">Gemini 2.5 Flash</span>
                 </div>
                 <div className="h-1 w-1 rounded-full bg-white"></div>
                 <span className="text-[10px] text-zinc-300 font-mono">READY</span>
            </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {/* COLUMN 1: Visual Preview */}
        <section 
            className="flex flex-col relative group/panel"
            style={{ width: leftPanelWidth }}
        >
            <div className="h-10 border-b border-border/40 flex items-center justify-between px-4 shrink-0 bg-zinc-900/30 backdrop-blur-sm">
                 <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                    <Eye size={14} />
                    <span className="tracking-tight">Visual Preview</span>
                </div>
                
                {/* Segmented Toggle */}
                <div className="bg-black/40 p-0.5 rounded-lg flex border border-white/5">
                    <button
                        onClick={() => setIsInspectMode(false)}
                        className={cn(
                            "px-3 py-1 text-[10px] font-medium rounded-md transition-all duration-200 flex items-center gap-1.5",
                            !isInspectMode 
                                ? "bg-white text-black shadow-sm" 
                                : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        <MousePointer2 size={10} /> Interact
                    </button>
                    <button
                        onClick={() => setIsInspectMode(true)}
                        className={cn(
                            "px-3 py-1 text-[10px] font-medium rounded-md transition-all duration-200 flex items-center gap-1.5",
                            isInspectMode 
                                ? "bg-white text-black shadow-sm" 
                                : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        <Target size={10} /> Inspect
                    </button>
                </div>
            </div>
            
            <div className="flex-1 relative overflow-hidden bg-zinc-100/5 dark:bg-zinc-900/20">
                <VisualViewer 
                    ref={visualViewerRef}
                    html={injectedHtml}
                    baseUrl={loadedUrl}
                    selectedId={selectedId}
                    hoveredId={hoveredId}
                    isInspectMode={isInspectMode}
                    isResizing={isResizing}
                    onSelect={setSelectedId}
                    onHover={setHoveredId}
                />
            </div>
        </section>

        <ResizableHandle 
            onResize={setLeftPanelWidth} 
            orientation="vertical"
            onResizeStart={() => setIsResizing(true)}
            onResizeEnd={() => setIsResizing(false)}
        />

        {/* COLUMN 2: DOM Tree */}
        <section className="flex-1 flex flex-col min-w-[250px] bg-background overflow-hidden border-r border-border/40">
            <div className="h-10 border-b border-border/40 flex items-center px-4 space-x-2 text-xs font-medium text-zinc-400 tracking-tight shrink-0 bg-zinc-900/30 backdrop-blur-sm">
                <Code size={14} />
                <span>DOM Structure</span>
            </div>
            <ScrollArea className="flex-1">
                <div className="py-2">
                    {root && (
                        <CodeViewer 
                            node={root}
                            selectedId={selectedId}
                            hoveredId={hoveredId}
                            onSelect={setSelectedId}
                            onHover={setHoveredId}
                        />
                    )}
                </div>
            </ScrollArea>
        </section>

        <ResizableHandle 
            onResize={(w) => setRightPanelWidth(w)} 
            orientation="vertical"
            inverse={true}
            onResizeStart={() => setIsResizing(true)}
            onResizeEnd={() => setIsResizing(false)}
        />

        {/* COLUMN 3: Builder & Results (Vertically Split) */}
        <section 
            className="flex flex-col bg-background z-10"
            style={{ width: rightPanelWidth, minWidth: 340 }}
        >
             {/* TOP: Workbench */}
             <div className="flex-1 flex flex-col min-h-0">
                 <div className="h-10 border-b border-border/40 flex items-center px-4 space-x-2 text-xs font-medium text-zinc-400 tracking-tight shrink-0 bg-zinc-900/30 backdrop-blur-sm">
                    <Target size={14} />
                    <span>Extraction Rules</span>
                </div>
                
                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-6 pb-6">
                        {/* Selection Editor - ALWAYS VISIBLE to prevent layout shift */}
                        <div className={cn("space-y-3 transition-opacity duration-200", !selectedId && "opacity-60 grayscale-[0.5]")}>
                            <div className="flex items-center justify-between">
                                <Label className="text-foreground font-semibold">
                                    {selectedId ? "Active Element" : "Active Element (None)"}
                                </Label>
                                <div className="flex gap-1">
                                    <Button 
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 hover:bg-primary/10 hover:text-primary"
                                        onClick={handleAiAnalyze}
                                        disabled={isAnalyzing || !selectedId}
                                        title="Ask AI to explain this element"
                                    >
                                        <Wand2 size={14} className={isAnalyzing ? "animate-pulse text-primary" : ""} />
                                    </Button>
                                </div>
                            </div>
                            
                            <Card className="p-3 space-y-3 bg-card/50 border-border/50 shadow-sm transition-all">
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <Label>Selector</Label>
                                        {selectedId && (
                                            <span className="text-[9px] text-muted-foreground font-mono opacity-50">{selectedId}</span>
                                        )}
                                    </div>
                                    <div className={cn(
                                        "font-mono text-[10px] bg-zinc-950/50 p-2 rounded border border-white/5 break-all select-all min-h-[32px] flex items-center",
                                        selectedId ? "text-zinc-400" : "text-zinc-700 italic"
                                    )}>
                                        {selectedId ? currentSelector : "Select an element in the preview..."}
                                    </div>
                                </div>
                                
                                <div className="grid gap-3">
                                    <div className="space-y-1.5">
                                        <Label>Field Name</Label>
                                        <Input 
                                            value={targetName}
                                            onChange={(e) => setTargetName(e.target.value)}
                                            placeholder={selectedId ? "e.g. productTitle" : ""}
                                            className="bg-zinc-950/30 h-8"
                                            disabled={!selectedId}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Instruction</Label>
                                        <Textarea 
                                            value={targetDescription}
                                            onChange={(e) => setTargetDescription(e.target.value)}
                                            placeholder={selectedId ? "E.g. Get text content, or list of all hrefs..." : ""}
                                            className="min-h-[60px] text-xs bg-zinc-950/30 leading-relaxed resize-y"
                                            disabled={!selectedId}
                                        />
                                    </div>
                                    <Button 
                                        onClick={handleAddTarget}
                                        disabled={!targetName || !selectedId}
                                        size="sm"
                                        className="w-full font-medium bg-white text-black hover:bg-zinc-200 border-none"
                                    >
                                        <Plus size={14} className="mr-2" /> Add Rule
                                    </Button>
                                </div>

                                    {aiAnalysis && selectedId && (
                                    <div className="pt-2 border-t border-border/40 mt-1 animate-in fade-in slide-in-from-top-1">
                                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                                            <span className="text-primary/80 font-medium mr-1">AI Insight:</span>
                                            {aiAnalysis}
                                        </p>
                                    </div>
                                )}
                            </Card>
                        </div>

                        {/* Configured List */}
                        <div className="space-y-3 pt-2 border-t border-border/20">
                            <div className="flex items-center justify-between">
                                <Label className="uppercase tracking-widest text-[10px] font-semibold text-zinc-500">Queue</Label>
                                <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-mono bg-zinc-900/50 border-zinc-800">{scrapeTargets.length}</Badge>
                            </div>

                            <div className="space-y-2 min-h-[50px]">
                                {scrapeTargets.map((target, idx) => (
                                    <div key={idx} className="relative group flex items-start gap-3 p-3 rounded-md border border-border/40 bg-card/30 hover:bg-card hover:border-primary/30 transition-all">
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-foreground">{target.name}</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground truncate pr-4">{target.description}</p>
                                            <p className="text-[9px] text-muted-foreground/40 font-mono truncate">{target.selector}</p>
                                        </div>
                                        <button 
                                            onClick={() => handleRemoveTarget(idx)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-all"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                                {scrapeTargets.length === 0 && (
                                    <div className="text-[10px] text-zinc-600 italic text-center py-4 border border-dashed border-zinc-800 rounded-md">
                                        No rules added yet
                                    </div>
                                )}
                            </div>

                            {scrapeTargets.length > 0 && (
                                <Button 
                                    onClick={handleGenerateScraper}
                                    disabled={isScraping}
                                    className="w-full mt-4 bg-white text-black hover:bg-zinc-200 border-none font-medium"
                                >
                                    {isScraping ? <Loader2 size={14} className="mr-2 animate-spin"/> : <Terminal size={14} className="mr-2" />}
                                    {isScraping ? 'Generating Script...' : 'Generate Scraper'}
                                </Button>
                            )}
                        </div>
                    </div>
                </ScrollArea>
             </div>

             <ResizableHandle 
                onResize={(h) => setOutputHeight(h)} 
                orientation="horizontal"
                inverse={true} // Bottom panel resizing upwards
                min={100}
                max={800}
                onResizeStart={() => setIsResizing(true)}
                onResizeEnd={() => setIsResizing(false)}
            />

             {/* BOTTOM: Output (Resizable) */}
             <div 
                className="flex flex-col bg-zinc-950 border-t border-border/40 shadow-inner"
                style={{ height: outputHeight }}
             >
                 <div className="h-9 border-b border-border/20 bg-white/5 flex items-center justify-between px-3 shrink-0">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                        <Terminal size={10} />
                        Output Console
                    </span>
                    {generatedScript && (
                        <Button 
                            onClick={handleRunScraper}
                            variant="ghost"
                            size="sm"
                            className="h-5 text-[10px] px-2 text-white hover:text-black hover:bg-white"
                        >
                            <Play size={8} fill="currentColor" className="mr-1.5"/>
                            RUN
                        </Button>
                    )}
                 </div>

                 <div className="flex-1 flex flex-col min-h-0">
                     {generatedScript ? (
                         <div className="flex flex-1 min-h-0">
                             {/* Script View */}
                             <ScrollArea className="flex-1 border-r border-white/5">
                                 <div className="p-3">
                                     <pre className="text-[10px] font-mono text-zinc-400 leading-relaxed whitespace-pre-wrap">{generatedScript}</pre>
                                     {isScraping && <span className="inline-block w-2 h-4 bg-primary/50 animate-pulse ml-1 align-middle"></span>}
                                 </div>
                             </ScrollArea>
                             
                             {/* JSON Result View */}
                             <ScrollArea className="flex-1 bg-black/20">
                                 <div className="p-3">
                                     {scrapedResult ? (
                                         <pre className="text-[10px] font-mono text-zinc-50 whitespace-pre-wrap">
                                             {JSON.stringify(scrapedResult, null, 2)}
                                         </pre>
                                     ) : (
                                         <div className="h-full flex flex-col items-center justify-center text-zinc-700">
                                             <span className="text-[10px] italic">Waiting for execution...</span>
                                         </div>
                                     )}
                                 </div>
                             </ScrollArea>
                         </div>
                     ) : (
                         <div className="flex-1 flex flex-col items-center justify-center text-zinc-800 p-4 text-center space-y-2">
                             <Code size={18} className="opacity-20" />
                             <span className="text-[10px] opacity-50">Generated script & data will appear here</span>
                         </div>
                     )}
                 </div>
             </div>
        </section>
      </main>
    </div>
  );
}