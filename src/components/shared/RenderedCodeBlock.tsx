
'use client';

import React, { useState, useEffect } from 'react';
import { createLowlight } from 'lowlight';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import cpp from 'highlight.js/lib/languages/cpp';
import plaintext from 'highlight.js/lib/languages/plaintext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Check, ClipboardCopy } from 'lucide-react';

const lowlight = createLowlight({ javascript, typescript, css, xml, json, bash, python, java, cpp, plaintext });

interface RenderedCodeBlockProps {
  codeContent: string;
  language?: string;
  title?: string;
  maxHeight?: string;
}

export const RenderedCodeBlock: React.FC<RenderedCodeBlockProps> = ({
  codeContent,
  language = 'plaintext',
  title,
  maxHeight = '400px',
}) => {
  const [highlightedHtml, setHighlightedHtml] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    try {
      if (!lowlight.registered(language)) {
        throw new Error(`Language '${language}' not registered.`);
      }
      const highlighted = lowlight.highlight(language, codeContent);
      setHighlightedHtml(highlighted.value);
    } catch (error) {
      console.warn(`Error highlighting language ${language}, falling back to plaintext:`, error);
      const highlighted = lowlight.highlight('plaintext', codeContent);
      setHighlightedHtml(highlighted.value);
    }
  }, [codeContent, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeContent).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <div className="not-prose my-4 relative group/code-block">
      <div className="relative bg-muted/30 border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between bg-card-foreground/5 px-2 py-1.5 border-b border-border text-xs">
          <span className="text-muted-foreground text-xs w-full mr-2 truncate">
            {title || language}
          </span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
            {isCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
          </Button>
        </div>
        <pre
          className="tiptap-code-block"
          style={{ maxHeight: maxHeight, overflowY: 'auto' }}
        >
          <code
            className={`language-${language}`}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        </pre>
      </div>
    </div>
  );
};
