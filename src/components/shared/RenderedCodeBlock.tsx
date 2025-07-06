
'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Check, ClipboardCopy } from 'lucide-react';

interface RenderedCodeBlockProps {
  rawCodeContent: string; // The raw text content for the copy button
  language?: string;
  title?: string;
  maxHeight?: string;
  children: React.ReactNode; // The pre-rendered, highlighted content from the parser
}

export const RenderedCodeBlock: React.FC<RenderedCodeBlockProps> = ({
  rawCodeContent,
  language = 'plaintext',
  title,
  maxHeight = '400px',
  children, // This will be the pre-rendered <span> elements
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(rawCodeContent).then(() => {
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
          <code className={`language-${language}`}>
            {children}
          </code>
        </pre>
      </div>
    </div>
  );
};
