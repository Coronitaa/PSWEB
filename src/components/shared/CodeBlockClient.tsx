
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Copy, Check, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// This is the React component that will be injected into the static HTML.
function CodeBlockHeaderClient({ language, codeText, isCollapsible, contentElement }: { language: string | null; codeText: string; isCollapsible: boolean; contentElement: HTMLElement }) {
  const [hasCopied, setHasCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(isCollapsible); // Start collapsed if it's collapsible
  const { toast } = useToast();

  useEffect(() => {
    if (isCollapsible) {
      contentElement.style.maxHeight = isCollapsed ? '0px' : '400px';
      // Add a transition class for smooth collapse/expand
      contentElement.classList.add('transition-all', 'duration-300', 'ease-in-out', 'overflow-hidden');
    }
  }, [isCollapsed, isCollapsible, contentElement]);


  const onCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(codeText);
    setHasCopied(true);
    toast({ title: 'Copied to clipboard!' });
    setTimeout(() => setHasCopied(false), 2000);
  };

  const toggleCollapse = () => {
      if (isCollapsible) {
          setIsCollapsed(!isCollapsed);
      }
  };

  const headerContent = (
    <>
        <span className="font-semibold uppercase text-muted-foreground">{language || 'code'}</span>
        <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCopy} aria-label="Copy code">
                {hasCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
            {isCollapsible && (
                <ChevronDown className={cn("w-4 h-4 transition-transform", !isCollapsed && "rotate-180")} />
            )}
        </div>
    </>
  );

  if (isCollapsible) {
      return (
          <button type="button" onClick={toggleCollapse} className="flex justify-between items-center w-full">
              {headerContent}
          </button>
      )
  }

  return headerContent;
}


// This component finds static code blocks and hydrates their headers.
export function CodeBlockClient() {
  const [hydratedBlocks, setHydratedBlocks] = useState<Element[]>([]);

  useEffect(() => {
    // Need a small delay to ensure the parsed HTML is in the DOM
    const timer = setTimeout(() => {
        const codeBlocks = Array.from(document.querySelectorAll('div[data-code-block="true"]'));
        setHydratedBlocks(codeBlocks);
    }, 100); // 100ms delay might be enough
    
    return () => clearTimeout(timer);
  }, []); // Re-run if path changes, maybe? No, empty array is fine. It will re-mount on navigation.

  return (
    <>
      {hydratedBlocks.map((element) => {
        const headerElement = element.querySelector<HTMLElement>('div[data-code-block-header="true"]');
        const preElement = element.querySelector('pre');
        const codeElement = element.querySelector('pre > code');
        const contentElement = element.querySelector<HTMLElement>('div[data-code-block-content="true"]');
        
        if (!headerElement || !preElement || !codeElement || !contentElement) {
          return null;
        }

        const language = preElement.dataset.language || null;
        const codeText = codeElement.textContent || '';
        const isCollapsible = element.getAttribute('data-collapsible') === 'true';
        
        // Use element's unique ID or generate one for the key
        const key = element.id || `code-block-${Math.random()}`;

        return createPortal(
          <CodeBlockHeaderClient 
            key={key}
            language={language} 
            codeText={codeText}
            isCollapsible={isCollapsible}
            contentElement={contentElement}
          />,
          headerElement
        );
      })}
    </>
  );
}
