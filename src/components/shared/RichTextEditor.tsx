
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent, BubbleMenu, type Editor, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TiptapLink from '@tiptap/extension-link';
import TiptapImage from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Underline from '@tiptap/extension-underline';
import { 
  Bold, Italic, Link as LinkIcon, List, ListOrdered, Strikethrough, Underline as UnderlineIcon,
  AlignLeft, AlignCenter, AlignRight, Image as ImageIcon, Video, Palette
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';


export interface FontSizeOptions {
  types: string[],
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType,
      unsetFontSize: () => ReturnType,
    }
  }
}

export const FontSize = Extension.create<FontSizeOptions>({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {}
              }

              return {
                style: `font-size: ${attributes.fontSize}`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run()
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          // @ts-ignore
          .removeEmptyTextStyle()
          .run()
      },
    }
  },
});

const MediaResizeComponent = (props: NodeViewProps) => {
  const { node, updateAttributes, selected, editor } = props;
  const isImage = node.type.name === 'image';
  const isVideo = node.type.name === 'youtube';

  const containerRef = useRef<HTMLDivElement>(null);

  const createResizeHandler = (direction: 'left' | 'right') => (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startWidth = containerRef.current!.offsetWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      
      const newWidth = direction === 'left'
        ? startWidth - (dx * 2)
        : startWidth + (dx * 2);

      updateAttributes({ width: `${Math.max(50, newWidth)}px` });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const setAlignment = (align: 'left' | 'center' | 'right' | null) => {
    updateAttributes({ 'data-float': align });
  };
  
  const float = node.attrs['data-float'];
  const width = node.attrs.width;

  const handles = [
    { pos: 'top-1/2 -translate-y-1/2 left-[-6px]', direction: 'left', cursor: 'ew-resize' },
    { pos: 'top-1/2 -translate-y-1/2 right-[-6px]', direction: 'right', cursor: 'ew-resize' },
  ];
  
  return (
    <NodeViewWrapper
      as="div"
      className="rich-text-media-node group clear-both relative"
      style={{ width }}
      data-float={float}
      draggable="true" data-drag-handle
    >
      <div 
        ref={containerRef}
        className={cn(
          "relative",
          selected && 'outline-2 outline-primary outline-dashed'
        )}
      >
        {isImage && (
          <img src={node.attrs.src} alt={node.attrs.alt} className="w-full h-auto block" />
        )}
        {isVideo && (
          <div className="aspect-video w-full h-full relative">
              <iframe
                className="absolute inset-0 w-full h-full"
                src={node.attrs.src}
                frameBorder="0"
                allowFullScreen
              />
              {editor.isEditable && (
                  <div 
                      className={cn("absolute inset-0 z-10", selected && "cursor-move")} 
                      aria-hidden="true" 
                  />
              )}
          </div>
        )}
      
        {selected && (
          <>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[calc(100%+12px)] z-[1] flex gap-1 bg-card p-1 rounded-md shadow-lg border border-border pointer-events-auto">
              <Button type="button" size="icon" variant={float === 'left' ? 'default' : 'ghost'} className="h-7 w-7" onClick={() => setAlignment('left')} title="Align left"><AlignLeft className="w-4 h-4" /></Button>
              <Button type="button" size="icon" variant={!float || float === 'center' ? 'default' : 'ghost'} className="h-7 w-7" onClick={() => setAlignment('center')} title="Align center"><AlignCenter className="w-4 h-4" /></Button>
              <Button type="button" size="icon" variant={float === 'right' ? 'default' : 'ghost'} className="h-7 w-7" onClick={() => setAlignment('right')} title="Align right"><AlignRight className="w-4 h-4" /></Button>
            </div>

            {handles.map((handle, index) => (
                <div
                  key={index}
                  className={cn(
                    "absolute w-3 h-3 bg-primary rounded-full border-2 border-card pointer-events-auto",
                    handle.pos
                  )}
                  style={{ cursor: handle.cursor }}
                  onMouseDown={createResizeHandler(handle.direction as 'left' | 'right')}
                />
              ))}
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
};

const CustomImage = TiptapImage.extend({
  draggable: true,
  addAttributes() {
    return {
      ...this.parent?.(),
      class: {
        default: 'rich-text-media-node',
      },
      width: {
        default: '100%',
        renderHTML: attributes => {
            if (!attributes.width) return {};
            return { style: `width: ${attributes.width};` };
        },
        parseHTML: element => element.style.width || null,
      },
      'data-float': {
        default: 'center',
        renderHTML: attributes => ({
          'data-float': attributes['data-float'],
        }),
        parseHTML: element => element.getAttribute('data-float'),
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(MediaResizeComponent);
  },
});

const CustomYoutube = Youtube.extend({
    draggable: true,
    addAttributes() {
        return {
            ...this.parent?.(),
            class: {
              default: 'rich-text-media-node',
            },
            width: {
                default: '100%',
                renderHTML: attributes => {
                    if (!attributes.width) return {};
                    return { style: `width: ${attributes.width}; height: auto; aspect-ratio: ${attributes.width}/${attributes.height}` };
                },
                parseHTML: element => element.style.width || null,
            },
             height: {
                default: '480',
                parseHTML: element => element.getAttribute('height'),
            },
            'data-float': {
                default: 'center',
                renderHTML: attributes => ({
                    'data-float': attributes['data-float']
                }),
                parseHTML: element => element.getAttribute('data-float'),
            },
        }
    },
    addNodeView() {
        return ReactNodeViewRenderer(MediaResizeComponent)
    }
});


const Toolbar = ({ editor }: { editor: Editor | null }) => {
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [url, setUrl] = useState('');

  if (!editor) {
    return null;
  }

  const openLinkModal = () => {
    const previousUrl = editor.getAttributes('link').href;
    setUrl(previousUrl || '');
    setIsLinkModalOpen(true);
  };
  
  const setLink = () => {
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank' }).run();
    }
    setIsLinkModalOpen(false);
    setUrl('');
  };

  const addImage = () => {
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
    setIsImageModalOpen(false);
    setUrl('');
  };

  const addYoutubeVideo = () => {
    if (url) {
      editor.chain().focus().setYoutubeVideo({ src: url }).run();
    }
    setIsVideoModalOpen(false);
    setUrl('');
  };

  const fontSizes = [
    { label: "Just a little peek", value: "12px" },
    { label: "Perfectly average", value: "14px" },
    { label: "Comfortably numb", value: "_default_size_" },
    { label: "Making a statement", value: "18px" },
    { label: "Hard to miss", value: "24px" },
    { label: "Absolutely massive", value: "30px" },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-1 p-1 border-b">
        <Select
            value={editor.getAttributes('textStyle').fontSize || '_default_size_'}
            onValueChange={(value) => {
                if (value === '_default_size_') {
                    editor.chain().focus().unsetFontSize().run();
                } else {
                    editor.chain().focus().setFontSize(value).run();
                }
            }}
        >
          <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="Text size" />
          </SelectTrigger>
          <SelectContent>
              {fontSizes.map(size => (
                  <SelectItem key={size.label} value={size.value} className="text-xs" style={{ fontSize: size.value === '_default_size_' ? '16px' : size.value }}>{size.label}</SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Separator orientation="vertical" className="h-6" />
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBold().run()} className={cn("h-8 w-8", editor.isActive('bold') && "bg-muted text-primary")}><Bold className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("h-8 w-8", editor.isActive('italic') && "bg-muted text-primary")}><Italic className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleUnderline().run()} className={cn("h-8 w-8", editor.isActive('underline') && "bg-muted text-primary")}><UnderlineIcon className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleStrike().run()} className={cn("h-8 w-8", editor.isActive('strike') && "bg-muted text-primary")}><Strikethrough className="h-4 w-4" /></Button>
        <Separator orientation="vertical" className="h-6" />
        <Button variant="ghost" size="icon" className="h-8 w-8 p-1.5 relative">
              <Palette className="h-4 w-4"/>
              <input
                type="color"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onInput={(event) => editor.chain().focus().setColor((event.target as HTMLInputElement).value).run()}
                value={editor.getAttributes('textStyle').color || '#ffffff'}
                data-testid="setColor"
              />
          </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={cn("h-8 w-8", editor.isActive({ textAlign: 'left' }) && "bg-muted text-primary")}><AlignLeft className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={cn("h-8 w-8", editor.isActive({ textAlign: 'center' }) && "bg-muted text-primary")}><AlignCenter className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={cn("h-8 w-8", editor.isActive({ textAlign: 'right' }) && "bg-muted text-primary")}><AlignRight className="h-4 w-4" /></Button>
        <Separator orientation="vertical" className="h-6" />
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn("h-8 w-8", editor.isActive('bulletList') && "bg-muted text-primary")}><List className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn("h-8 w-8", editor.isActive('orderedList') && "bg-muted text-primary")}><ListOrdered className="h-4 w-4" /></Button>
        <Separator orientation="vertical" className="h-6" />
        <Button type="button" variant="ghost" size="icon" onClick={openLinkModal} className={cn("h-8 w-8", editor.isActive('link') && "bg-muted text-primary")}><LinkIcon className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => { setUrl(''); setIsImageModalOpen(true); }} className="h-8 w-8"><ImageIcon className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => { setUrl(''); setIsVideoModalOpen(true); }} className="h-8 w-8"><Video className="h-4 w-4" /></Button>
      </div>

      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Set Link URL</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="linkUrl">URL</Label>
            <Input id="linkUrl" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="button" onClick={setLink}>Set Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Embed Image</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="imageUrl">Image URL</Label>
            <Input id="imageUrl" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/image.png" />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="button" onClick={addImage}>Add Image</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isVideoModalOpen} onOpenChange={setIsVideoModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Embed YouTube Video</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="videoUrl">YouTube URL</Label>
            <Input id="videoUrl" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="button" onClick={addYoutubeVideo}>Add Video</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

interface RichTextEditorProps {
  initialContent?: string;
  onChange: (html: string) => void;
}

export const RichTextEditor = ({ initialContent, onChange }: RichTextEditorProps) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      TextStyle,
      FontSize.configure({
        types: ['textStyle'],
      }),
      Placeholder.configure({ placeholder: "Share the details of your resource..." }),
      TiptapLink.configure({ openOnClick: false, autolink: true, HTMLAttributes: { class: 'text-primary hover:text-accent transition-colors cursor-pointer underline' } }),
      CustomImage.configure({
        inline: false, 
        allowBase64: true,
      }),
      CustomYoutube.configure({
        inline: false, 
        controls: false,
        nocookie: true,
        HTMLAttributes: {
          height: 'auto'
        }
      }),
      TextAlign.configure({ types: ['paragraph', 'image', 'youtube'] }),
      Color,
      Underline,
    ],
    content: initialContent,
    onUpdate: ({ editor }) => { onChange(editor.getHTML()); },
    editorProps: {
      attributes: {
        class: cn(
          'prose dark:prose-invert max-w-none prose-sm sm:prose-base',
          'focus:outline-none'
        ),
      },
    },
  });

  return (
    <div className="w-full rounded-md border border-input bg-card ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      {editor && (
         <BubbleMenu 
          editor={editor}
          tippyOptions={{ duration: 100 }}
          className="bg-card p-1 rounded-lg shadow-lg border border-border flex items-center gap-0.5"
          shouldShow={({ editor, view, from, to }) => {
            if (!editor.isFocused) {
              return false;
            }
            
            const { from: selectionFrom, to: selectionTo } = editor.state.selection;
            let isMediaSelection = false;
            editor.state.doc.nodesBetween(selectionFrom, selectionTo, (node) => {
              if (node.type.name === 'image' || node.type.name === 'youtube') {
                isMediaSelection = true;
              }
            });
            if (isMediaSelection) {
              return false;
            }
      
            if (toolbarRef.current) {
              const toolbarRect = toolbarRef.current.getBoundingClientRect();
              const selectionCoords = view.coordsAtPos(from);
              
              const bubbleMenuHeight = 50; 
              
              if (selectionCoords.top < toolbarRect.bottom + bubbleMenuHeight) {
                return false;
              }
            }
            
            return from !== to;
          }}
         >
            <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBold().run()} className={cn("h-8 w-8", editor.isActive('bold') && "bg-muted text-primary")}><Bold className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("h-8 w-8", editor.isActive('italic') && "bg-muted text-primary")}><Italic className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleUnderline().run()} className={cn("h-8 w-8", editor.isActive('underline') && "bg-muted text-primary")}><UnderlineIcon className="h-4 w-4" /></Button>
            <Separator orientation="vertical" className="h-6" />
             <Button variant="ghost" size="icon" className="h-8 w-8 p-1.5 relative">
                <Palette className="h-4 w-4"/>
                <input
                  type="color"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onInput={(event) => editor.chain().focus().setColor((event.target as HTMLInputElement).value).run()}
                  value={editor.getAttributes('textStyle').color || '#ffffff'}
                  data-testid="setColorBubble"
                />
            </Button>
        </BubbleMenu>
      )}
      
      <div ref={toolbarRef} className="sticky top-0 bg-card/95 backdrop-blur-sm z-10">
        <Toolbar editor={editor} />
      </div>

      <div className="min-h-[250px] overflow-y-auto px-3 py-2">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

    