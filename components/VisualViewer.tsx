import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import { Overlay } from './Overlay';

interface VisualViewerProps {
  html: string;
  baseUrl?: string;
  selectedId: string | null;
  hoveredId: string | null;
  isInspectMode: boolean;
  isResizing?: boolean; 
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

export interface VisualViewerHandle {
  getContainer: () => HTMLElement | null; // Returns iframe body
  getWindow: () => Window | null;
}

export const VisualViewer = forwardRef<VisualViewerHandle, VisualViewerProps>(({ 
  html, 
  baseUrl,
  selectedId, 
  hoveredId, 
  isInspectMode,
  isResizing = false,
  onSelect, 
  onHover 
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [scrollTrigger, setScrollTrigger] = useState(0); // Force overlay update on scroll

  useImperativeHandle(ref, () => ({
    getContainer: () => iframeRef.current?.contentDocument?.body || null,
    getWindow: () => iframeRef.current?.contentWindow || null
  }));

  // Write content to iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    
    const doc = iframe.contentDocument;
    if (!doc) return;

    let finalHtml = html;
    
    // Inject Base Tag for relative paths if baseUrl is provided
    if (baseUrl) {
      if (finalHtml.includes('<head>')) {
        finalHtml = finalHtml.replace('<head>', `<head><base href="${baseUrl}" />`);
      } else {
        finalHtml = `<head><base href="${baseUrl}" /></head>${finalHtml}`;
      }
    }

    // Inject styles for hover effects inside the iframe
    const styleInjection = `
      <style>
        [data-inspector-id] { cursor: ${isInspectMode ? 'crosshair' : 'auto'} !important; }
        /* Disable pointer events on everything if not in inspect mode? No, we want interaction. */
      </style>
    `;
    if (finalHtml.includes('</head>')) {
        finalHtml = finalHtml.replace('</head>', `${styleInjection}</head>`);
    } else {
        finalHtml = `${finalHtml}${styleInjection}`;
    }

    doc.open();
    doc.write(finalHtml);
    doc.close();

    // Mark as loaded to trigger listener attachment
    setIframeLoaded(false); // reset first
    iframe.onload = () => {
        setIframeLoaded(true);
    };
    // Fallback if onload doesn't fire (sometimes doc.write is sync and doesn't trigger load the same way)
    setTimeout(() => setIframeLoaded(true), 100);

  }, [html, baseUrl, isInspectMode]);

  // Attach Event Listeners to Iframe
  useEffect(() => {
    if (!iframeLoaded || !iframeRef.current) return;
    
    const iframe = iframeRef.current;
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;

    if (!doc || !win) return;

    const handleMouseOver = (e: Event) => {
      if (!isInspectMode) return;
      e.stopPropagation();
      const target = e.target as HTMLElement;
      const element = target.closest('[data-inspector-id]');
      if (element) {
        const id = element.getAttribute('data-inspector-id');
        onHover(id);
      } else {
        onHover(null);
      }
    };

    const handleClick = (e: Event) => {
      if (!isInspectMode) return;
      e.preventDefault();
      e.stopPropagation();
      const target = e.target as HTMLElement;
      const element = target.closest('[data-inspector-id]');
      if (element) {
        const id = element.getAttribute('data-inspector-id');
        if (id) onSelect(id);
      }
    };

    const handleMouseLeave = () => {
      if (!isInspectMode) return;
      onHover(null);
    };

    const handleScroll = () => {
        setScrollTrigger(prev => prev + 1);
    };

    doc.addEventListener('mouseover', handleMouseOver);
    doc.addEventListener('click', handleClick, true);
    doc.addEventListener('mouseleave', handleMouseLeave);
    win.addEventListener('scroll', handleScroll);
    win.addEventListener('resize', handleScroll);

    return () => {
      doc.removeEventListener('mouseover', handleMouseOver);
      doc.removeEventListener('click', handleClick, true);
      doc.removeEventListener('mouseleave', handleMouseLeave);
      win.removeEventListener('scroll', handleScroll);
      win.removeEventListener('resize', handleScroll);
    };
  }, [iframeLoaded, isInspectMode, onHover, onSelect]);

  return (
    <div className="relative w-full h-full bg-zinc-900/50 isolate" ref={containerRef}>
       <iframe
          ref={iframeRef}
          title="Visual Inspector"
          className="w-full h-full border-none bg-white" 
          sandbox="allow-same-origin allow-scripts allow-forms"
       />

       {/* Overlay to capture mouse events during resize to prevent iframe from stealing focus */}
       {isResizing && (
         <div className="absolute inset-0 z-[100] bg-transparent" />
       )}

      {isInspectMode && iframeRef.current && !isResizing && (
        <>
          <Overlay 
            targetId={selectedId} 
            iframeRef={iframeRef}
            scrollTrigger={scrollTrigger}
            color="#ffffff" 
            label="Selected"
            isActive={!!selectedId}
          />
          <Overlay 
            targetId={hoveredId} 
            iframeRef={iframeRef}
            scrollTrigger={scrollTrigger}
            color="#71717a" 
            isActive={!!hoveredId && hoveredId !== selectedId}
          />
        </>
      )}
    </div>
  );
});

VisualViewer.displayName = 'VisualViewer';