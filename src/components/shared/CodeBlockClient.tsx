

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Copy, Check, ChevronDown, Languages } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// This is the React component that will be injected into the static HTML.
function CodeBlockHeaderClient({ language, codeText, isCollapsible, contentElement, title }: { language: string | null; codeText: string; isCollapsible: boolean; contentElement: HTMLElement; title: string | null }) {
  const [hasCopied, setHasCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(isCollapsible); // Start collapsed if it's collapsible
  const { toast } = useToast();

  useEffect(() => {
    if (isCollapsible) {
      if (isCollapsed) {
        contentElement.classList.add('collapsed');
      } else {
        contentElement.classList.remove('collapsed');
      }
    }
  }, [isCollapsed, isCollapsible, contentElement]);


  const onCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(codeText);
    toast({ title: 'Copied to clipboard!' });
    setHasCopied(true);
  };

  const toggleCollapse = () => {
      if (isCollapsible) {
          setIsCollapsed(!isCollapsed);
      }
  };

  const headerContent = (
      <div className="flex justify-between items-center w-full gap-2">
        {/* Left Side */}
        <div className="flex items-center gap-2 flex-grow min-w-0">
          <Languages className="w-4 h-4 text-muted-foreground shrink-0" />
          {title ? (
              <span className="font-semibold text-foreground truncate" title={title}>{title}</span>
          ) : (
              <span className="font-semibold uppercase text-muted-foreground">{language || 'code'}</span>
          )}
        </div>
        {/* Right Side */}
        <div className="flex items-center gap-1 shrink-0">
            {title && language && <span className="font-semibold uppercase text-muted-foreground text-xs">{language}</span>}
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Copy code" onClick={onCopy}>
                {hasCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
            {isCollapsible && (
                <ChevronDown className={cn("w-4 h-4 transition-transform", !isCollapsed && "rotate-180")} />
            )}
        </div>
    </div>
  );

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (hasCopied) {
      timeout = setTimeout(() => {
        setHasCopied(false);
      }, 2000);
    }
    return () => clearTimeout(timeout);
  }, [hasCopied]);

  if (isCollapsible) {
      return (
          <div
            role="button"
            tabIndex={0}
            onClick={toggleCollapse}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleCollapse();
              }
            }}
            className="w-full cursor-pointer"
          >
              {headerContent}
          </div>
      )
  }

  return headerContent;
}


// This component finds static code blocks and hydrates their headers.
export function CodeBlockClient() {
  const [hydratedBlocks, setHydratedBlocks] = useState<Element[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
        const codeBlocks = Array.from(document.querySelectorAll('div[data-code-block="true"]'));
        setHydratedBlocks(codeBlocks);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {hydratedBlocks.map((element) => {
        const headerElement = element.querySelector<HTMLElement>('div[data-code-block-header="true"]');
        const contentElement = element.querySelector<HTMLElement>('div[data-code-block-content="true"]');
        const preElement = contentElement?.querySelector('pre');
        const codeElement = preElement?.querySelector('code');
        
        if (!headerElement || !contentElement || !preElement || !codeElement) {
          return null;
        }

        const language = preElement.getAttribute('data-language') || null;
        const codeText = codeElement.textContent || '';
        const isCollapsible = element.getAttribute('data-collapsible') === 'true';
        const title = element.getAttribute('data-title') || null;
        
        const key = element.id || `code-block-${preElement.className}-${Math.random()}`;

        return createPortal(
          <CodeBlockHeaderClient 
            key={key}
            language={language} 
            codeText={codeText}
            isCollapsible={isCollapsible}
            contentElement={contentElement}
            title={title}
          />,
          headerElement
        );
      })}
    </>
  );
}
