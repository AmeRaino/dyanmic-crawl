import React, { useState, useEffect, useRef } from 'react';
import { ParsedNode } from '../types';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '../utils/cn';

interface CodeViewerProps {
  node: ParsedNode;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  depth?: number;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ 
  node, 
  selectedId, 
  hoveredId, 
  onSelect, 
  onHover,
  depth = 0 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  const isSelected = node.id === selectedId;
  const isHovered = node.id === hoveredId;
  
  // Auto-scroll into view when selected
  useEffect(() => {
    if (isSelected && elementRef.current) {
      elementRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, [isSelected]);

  const handleMouseEnter = (e: React.MouseEvent) => {
    e.stopPropagation();
    onHover(node.id);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node.id);
  };

  const toggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCollapsed(!isCollapsed);
  };

  if (node.tag === '#text') {
     if (!node.textContent?.trim()) return null;
     return (
         <div 
            ref={isSelected ? elementRef : null}
            className={cn(
                "pl-4 font-mono text-sm whitespace-pre-wrap cursor-pointer transition-colors duration-150 rounded-sm",
                isSelected && "bg-accent text-accent-foreground",
                isHovered && !isSelected && "bg-muted/50"
            )}
            style={{ paddingLeft: `${depth * 1.5 + 1}rem` }}
            onMouseEnter={handleMouseEnter}
            onClick={handleClick}
         >
             <span className="text-string">{node.textContent}</span>
         </div>
     );
  }

  return (
    <div className="font-mono text-sm leading-6">
      {/* Opening Tag Line */}
      <div 
        ref={isSelected ? elementRef : null}
        className={cn(
            "group flex items-center cursor-pointer pr-2 transition-colors duration-150 rounded-sm",
            isSelected ? "bg-accent text-accent-foreground" : "text-foreground",
            isHovered && !isSelected && "bg-muted/50"
        )}
        style={{ paddingLeft: `${depth * 1.5}rem` }}
        onMouseEnter={handleMouseEnter}
        onClick={handleClick}
      >
        <span 
            className="w-4 h-4 flex items-center justify-center mr-1 text-muted-foreground hover:text-foreground"
            onClick={toggleCollapse}
        >
          {node.children.length > 0 && (
            isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />
          )}
        </span>
        
        <span className="opacity-50">&lt;</span>
        <span className="text-tag font-medium">{node.tag}</span>
        
        {/* Attributes */}
        {Object.entries(node.attributes).map(([key, value]) => (
          <span key={key} className="ml-2">
            <span className="text-attr">{key}</span>
            <span className="opacity-50">=</span>
            <span className="text-string">"{value}"</span>
          </span>
        ))}

        {node.isSelfClosing ? (
             <span className="opacity-50"> /&gt;</span>
        ) : (
             <span className="opacity-50">&gt;</span>
        )}

        {/* Inline text preview if collapsed */}
        {isCollapsed && node.children.length > 0 && (
            <span className="text-muted-foreground ml-2 select-none">...</span>
        )}

        {/* Closing tag on same line if collapsed */}
        {isCollapsed && !node.isSelfClosing && (
            <span className="opacity-50 ml-1">
                &lt;/<span className="text-tag font-medium">{node.tag}</span>&gt;
            </span>
        )}
      </div>

      {/* Children */}
      {!isCollapsed && !node.isSelfClosing && node.children.length > 0 && (
        <div>
          {node.children.map(child => (
            <CodeViewer
              key={child.id}
              node={child}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onSelect={onSelect}
              onHover={onHover}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      {/* Closing Tag Line (if not collapsed and has children) */}
      {!isCollapsed && !node.isSelfClosing && node.children.length > 0 && (
         <div 
            className={cn(
                "cursor-pointer pl-6 transition-colors duration-150 rounded-sm",
                isSelected ? "bg-accent text-accent-foreground" : "text-foreground",
                isHovered && !isSelected && "bg-muted/50"
            )}
            style={{ paddingLeft: `${depth * 1.5}rem` }}
            onMouseEnter={handleMouseEnter}
            onClick={handleClick}
         >
             <span className="ml-5 opacity-50">&lt;/</span>
             <span className="text-tag font-medium">{node.tag}</span>
             <span className="opacity-50">&gt;</span>
         </div>
      )}
    </div>
  );
};