
'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Check, ClipboardCopy, ChevronUp, ChevronDown } from 'lucide-react';

// Corrected import syntax for lowlight v3+
import { createLowlight } from 'lowlight';
import { toHtml } from 'hast-util-to-html';

import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';

// Import the stylesheet for the theme
import 'highlight.js/styles/github-dark.css';

// Create and configure the lowlight instance
const lowlight = createLowlight();
lowlight.register('js', javascript);
lowlight.register('ts', typescript);
lowlight.register('py', python);
lowlight.register('html', xml);
lowlight.register('css', css);
lowlight.register('json', json);
lowlight.register('bash', bash);

interface RenderedCodeBlockProps {
  rawCodeContent: string;
  language: string;
  title?: string;
  maxHeight?: string;
  isCollapsible?: boolean;
  isCollapsed?: boolean;
}

export const RenderedCodeBlock: React.FC<RenderedCodeBlockProps> = ({
  rawCodeContent,
  language,
  title,
  maxHeight = '400px',
  isCollapsible = false,
  isCollapsed = false,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [collapsedState, setCollapsedState] = useState(isCollapsed);

  const handleCopy = () => {
    navigator.clipboard.writeText(rawCodeContent).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const highlightedHtml = useMemo(() => {
    try {
      if (lowlight.registered(language)) {
        const tree = lowlight.highlight(language, rawCodeContent);
        return toHtml(tree);
      }
      // Fallback for unregistered languages
      return rawCodeContent.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    } catch (error) {
      console.error('Highlighting error:', error);
      return rawCodeContent.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
  }, [language, rawCodeContent]);

  const displayLanguage = title || language || 'code';
  const shouldRenderHtml = lowlight.registered(language);

  return (
    <div className="not-prose my-4 relative group/code-block">
      <div className="relative bg-muted/30 border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between bg-card-foreground/5 px-2 py-1.5 border-b border-border text-xs">
          <span className="text-muted-foreground text-xs w-full mr-2 truncate">
            {displayLanguage}
          </span>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
              {isCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
            </Button>
            {isCollapsible && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCollapsedState(prev => !prev)}>
                {collapsedState ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
        {!collapsedState && (
          <pre
            className="tiptap-code-block hljs"
            style={{ maxHeight: maxHeight, overflowY: 'auto' }}
          >
            {shouldRenderHtml ? (
              <code
                className={`language-${language}`}
                dangerouslySetInnerHTML={{ __html: highlightedHtml }}
              />
            ) : (
              <code className={`language-${language}`}>
                {rawCodeContent}
              </code>
            )}
          </pre>
        )}
      </div>
    </div>
  );
};
