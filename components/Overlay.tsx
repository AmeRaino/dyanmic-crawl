import React, { useEffect, useState } from 'react';

interface OverlayProps {
  targetId: string | null;
  iframeRef: React.RefObject<HTMLIFrameElement>;
  scrollTrigger: number;
  color: string;
  label?: string;
  isActive: boolean;
}

export const Overlay: React.FC<OverlayProps> = ({ targetId, iframeRef, scrollTrigger, color, label, isActive }) => {
  const [rect, setRect] = useState<Partial<DOMRect> | null>(null);

  useEffect(() => {
    if (!targetId || !iframeRef.current || !iframeRef.current.contentDocument) {
      setRect(null);
      return;
    }

    const doc = iframeRef.current.contentDocument;
    const targetElement = doc.querySelector(`[data-inspector-id="${targetId}"]`);
    
    if (targetElement) {
      const updateRect = () => {
        const elementRect = targetElement.getBoundingClientRect();
        
        // Since the overlay is absolutely positioned inside the parent of the iframe,
        // and the iframe fills the parent, the position of the element relative to the
        // iframe's viewport is exactly where we want the overlay.
        
        // Check if element is off-screen (scrolled out of view)
        // We can just render it, CSS will crop it due to overflow:hidden on parent if needed.
        
        setRect({
          top: elementRect.top,
          left: elementRect.left,
          width: elementRect.width,
          height: elementRect.height,
        });
      };

      updateRect();
    } else {
        setRect(null);
    }
  }, [targetId, iframeRef, isActive, scrollTrigger]);

  if (!rect || !isActive) return null;

  return (
    <div
      className="absolute pointer-events-none transition-all duration-75 ease-out z-50 flex flex-col items-start"
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        border: `2px solid ${color}`,
        backgroundColor: `${color}1A`, 
        boxShadow: `0 0 15px ${color}33` 
      }}
    >
        {label && (
            <span 
                className="text-[10px] font-mono font-bold text-zinc-950 px-1.5 py-0.5 -mt-6 rounded-t-sm shadow-sm whitespace-nowrap pointer-events-none"
                style={{ backgroundColor: color }}
            >
                {label}
            </span>
        )}
    </div>
  );
};