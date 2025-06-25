
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TiptapLink from '@tiptap/extension-link';
import TiptapImage from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import { Bold, Italic, Link, Pilcrow, Heading2, Heading3, List, ListOrdered } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const Toolbar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null;
  }
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const handleSetLink = useCallback(() => {
    if (linkUrl) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl, target: '_blank' }).run();
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    }
    setIsLinkPopoverOpen(false);
    setLinkUrl('');
  }, [editor, linkUrl]);

  useEffect(() => {
    if (isLinkPopoverOpen) {
      setLinkUrl(editor.getAttributes('link').href || '');
    }
  }, [isLinkPopoverOpen, editor]);

  const headingLevel = editor.isActive('heading', { level: 2 }) ? 2 : editor.isActive('heading', { level: 3 }) ? 3 : 0;
  
  const toggleHeading = () => {
    if (headingLevel === 2) editor.chain().focus().toggleHeading({ level: 3 }).run();
    else if (headingLevel === 3) editor.chain().focus().setParagraph().run();
    else editor.chain().focus().toggleHeading({ level: 2 }).run();
  };

  return (
    <div className="flex items-center gap-1 p-2 border-b bg-card/50">
      <Button type="button" variant="ghost" size="icon" onClick={toggleHeading} className={cn("h-8 w-8", headingLevel > 0 && "bg-muted text-primary")}>
        {headingLevel === 2 && <Heading2 className="h-4 w-4" />}
        {headingLevel === 3 && <Heading3 className="h-4 w-4" />}
        {headingLevel === 0 && <Pilcrow className="h-4 w-4" />}
      </Button>
      <Separator orientation="vertical" className="h-6" />
      <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBold().run()} className={cn("h-8 w-8", editor.isActive('bold') && "bg-muted text-primary")}>
        <Bold className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("h-8 w-8", editor.isActive('italic') && "bg-muted text-primary")}>
        <Italic className="h-4 w-4" />
      </Button>
      <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8", editor.isActive('link') && "bg-muted text-primary")}>
            <Link className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" onOpenAutoFocus={(e) => e.preventDefault()}>
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Set Link</h4>
              <p className="text-sm text-muted-foreground">Paste the URL for the link.</p>
            </div>
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSetLink();
                }
              }}
              placeholder="https://example.com"
            />
            <div className="flex justify-between">
              <Button type="button" variant="outline" size="sm" onClick={() => {
                  editor.chain().focus().extendMarkRange('link').unsetLink().run();
                  setIsLinkPopoverOpen(false);
              }}>
                Remove link
              </Button>
              <Button type="button" size="sm" onClick={handleSetLink}>Set link</Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <Separator orientation="vertical" className="h-6" />
      <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn("h-8 w-8", editor.isActive('bulletList') && "bg-muted text-primary")}>
        <List className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn("h-8 w-8", editor.isActive('orderedList') && "bg-muted text-primary")}>
        <ListOrdered className="h-4 w-4" />
      </Button>
    </div>
  );
};

const BubbleToolbar = ({ editor }: { editor: Editor }) => {
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const handleSetLink = useCallback(() => {
    if (linkUrl) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl, target: '_blank' }).run();
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    }
    setIsLinkPopoverOpen(false);
    setLinkUrl('');
  }, [editor, linkUrl]);

  useEffect(() => {
    if (isLinkPopoverOpen) {
      setLinkUrl(editor.getAttributes('link').href || '');
    }
  }, [isLinkPopoverOpen, editor]);

  return (
    <>
      <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBold().run()} className={cn("h-8 w-8", editor.isActive('bold') && "bg-muted text-primary")}>
        <Bold className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("h-8 w-8", editor.isActive('italic') && "bg-muted text-primary")}>
        <Italic className="h-4 w-4" />
      </Button>
      <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8", editor.isActive('link') && "bg-muted text-primary")}>
            <Link className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" onOpenAutoFocus={(e) => e.preventDefault()}>
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Set Link</h4>
              <p className="text-sm text-muted-foreground">Paste the URL for the link.</p>
            </div>
            <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSetLink(); } }} placeholder="https://example.com" />
            <Button type="button" size="sm" onClick={handleSetLink}>Set link</Button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
};


interface RichTextEditorProps {
  initialContent?: string;
  onChange: (html: string) => void;
}

export const RichTextEditor = ({ initialContent, onChange }: RichTextEditorProps) => {
  const [bubbleMenuState, setBubbleMenuState] = useState<{ isVisible: boolean; top: number; left: number; }>({ isVisible: false, top: 0, left: 0 });
  const mouseMoveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Placeholder.configure({ placeholder: "Share the details of your resource..." }),
      TiptapLink.configure({ openOnClick: false, autolink: true, HTMLAttributes: { class: 'text-primary hover:text-accent transition-colors cursor-pointer underline' } }),
      TiptapImage.configure({ inline: false, allowBase64: true }),
      Youtube.configure({ controls: false, nocookie: true }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => { onChange(editor.getHTML()); },
    editorProps: {
      attributes: {
        class: cn('prose dark:prose-invert max-w-none prose-sm sm:prose-base', 'prose-headings:text-primary prose-a:text-primary', 'focus:outline-none'),
      },
    },
  });

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !editor) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (mouseMoveTimerRef.current) {
        clearTimeout(mouseMoveTimerRef.current);
      }
      setBubbleMenuState(prev => ({ ...prev, isVisible: false }));

      mouseMoveTimerRef.current = setTimeout(() => {
        const { empty } = editor.state.selection;
        if (!empty && editor.isFocused) {
          setBubbleMenuState({ isVisible: true, top: event.clientY + 15, left: event.clientX });
        }
      }, 1000); // 1-second delay
    };
    
    const handleMouseLeave = () => {
        if (mouseMoveTimerRef.current) {
            clearTimeout(mouseMoveTimerRef.current);
        }
        setBubbleMenuState(prev => ({...prev, isVisible: false}));
    };

    const handleSelectionChange = () => {
      const { empty } = editor.state.selection;
      if (empty) {
        if (mouseMoveTimerRef.current) {
          clearTimeout(mouseMoveTimerRef.current);
        }
        setBubbleMenuState(prev => ({ ...prev, isVisible: false }));
      }
    };
    
    wrapper.addEventListener('mousemove', handleMouseMove);
    wrapper.addEventListener('mouseleave', handleMouseLeave);
    editor.on('selectionUpdate', handleSelectionChange);

    return () => {
      wrapper.removeEventListener('mousemove', handleMouseMove);
      wrapper.removeEventListener('mouseleave', handleMouseLeave);
      editor.off('selectionUpdate', handleSelectionChange);
      if (mouseMoveTimerRef.current) {
        clearTimeout(mouseMoveTimerRef.current);
      }
    };
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="w-full rounded-md border border-input bg-card/30 ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2" ref={wrapperRef}>
      {bubbleMenuState.isVisible && (
          <div
            className="fixed z-50 bg-card p-2 rounded-lg shadow-lg border border-border flex items-center gap-1 animate-in fade-in-0 zoom-in-95"
            style={{
              top: `${bubbleMenuState.top}px`,
              left: `${bubbleMenuState.left}px`,
              transform: 'translateX(-50%)', // Center on cursor
            }}
          >
            <BubbleToolbar editor={editor} />
          </div>
      )}
      <div className="sticky top-0 bg-card/95 backdrop-blur-sm z-10">
        <Toolbar editor={editor} />
      </div>
      <div className="min-h-[250px] overflow-y-auto px-3 py-2">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
