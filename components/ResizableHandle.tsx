import React, { useCallback, useEffect, useState } from 'react';
import { cn } from '../utils/cn';
import { GripVertical, GripHorizontal } from 'lucide-react';

interface ResizableHandleProps {
  onResize: (newValue: number) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
  min?: number;
  max?: number;
  orientation?: 'vertical' | 'horizontal'; // vertical = handle is vertical line (resizes width), horizontal = handle is horizontal line (resizes height)
  inverse?: boolean; // If true, calculating from right/bottom instead of left/top
}

export const ResizableHandle: React.FC<ResizableHandleProps> = ({
  onResize,
  onResizeStart,
  onResizeEnd,
  min = 100,
  max = 1200,
  orientation = 'vertical',
  inverse = false
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    onResizeStart?.();
    
    const cursor = orientation === 'vertical' ? 'col-resize' : 'row-resize';
    document.body.style.cursor = cursor;
    document.body.style.userSelect = 'none';
  };

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      onResizeEnd?.();
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  }, [isDragging, onResizeEnd]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    let newValue;
    
    if (orientation === 'vertical') {
        // Resizing Width
        if (inverse) {
            newValue = window.innerWidth - e.clientX;
        } else {
            newValue = e.clientX;
        }
    } else {
        // Resizing Height
        if (inverse) {
             newValue = window.innerHeight - e.clientY; 
        } else {
            newValue = e.clientY;
        }
    }

    if (newValue < min) newValue = min;
    if (max && newValue > max) newValue = max;

    onResize(newValue);
  }, [isDragging, orientation, inverse, min, max, onResize]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className={cn(
        "relative flex items-center justify-center z-50 group focus:outline-none transition-colors",
        // Base Interactivity
        "hover:bg-primary/10",
        // Fixed dimensions to prevent layout shift & Permanent borders
        orientation === 'vertical' 
            ? "w-1 cursor-col-resize h-full border-l border-border" 
            : "h-1 cursor-row-resize w-full border-t border-border",
        // Active State
        isDragging && "bg-primary/20 border-primary"
      )}
    >
        {/* Decorative Grip - Only visible on hover/drag but absolutely positioned so it doesn't affect layout */}
        <div className={cn(
            "absolute bg-background border border-border rounded-full flex items-center justify-center transition-opacity duration-200 shadow-sm",
            isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            orientation === 'vertical' 
                ? "w-3 h-6" 
                : "h-3 w-6"
        )}>
             {orientation === 'vertical' 
                ? <GripVertical size={8} className="text-muted-foreground" />
                : <GripHorizontal size={8} className="text-muted-foreground" />
             }
        </div>
    </div>
  );
};