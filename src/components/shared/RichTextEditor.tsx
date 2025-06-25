
"use client";

import React, { useState } from 'react';
import { useEditor, EditorContent, BubbleMenu, type Editor } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TiptapLink from '@tiptap/extension-link';
import TiptapImage from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
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

export interface FontSizeOptions {
  types: string[],
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      /**
       * Set the font size
       */
      setFontSize: (size: string) => ReturnType,
      /**
       * Unset the font size
       */
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
    { label: 'Small', value: '14px' },
    { label: 'Normal', value: '_default_size_' },
    { label: 'Large', value: '18px' },
    { label: 'X-Large', value: '24px' },
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
          <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue placeholder="Text size" />
          </SelectTrigger>
          <SelectContent>
              {fontSizes.map(size => (
                  <SelectItem key={size.label} value={size.value} style={{ fontSize: size.value === '_default_size_' ? '16px' : size.value }}>{size.label}</SelectItem>
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
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      TextStyle,
      FontSize.configure({
        types: ['textStyle'],
      }),
      Placeholder.configure({ placeholder: "Share the details of your resource..." }),
      TiptapLink.configure({ openOnClick: false, autolink: true, HTMLAttributes: { class: 'text-primary hover:text-accent transition-colors cursor-pointer underline' } }),
      TiptapImage.configure({ inline: false, allowBase64: true }),
      Youtube.configure({ controls: false, nocookie: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
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
    <div className="w-full rounded-md border border-input bg-background/50 ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      {editor && (
         <BubbleMenu 
          editor={editor}
          tippyOptions={{ duration: 100 }}
          className="bg-card p-1 rounded-lg shadow-lg border border-border flex items-center gap-0.5"
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
      
      <div className="sticky top-0 bg-card/95 backdrop-blur-sm z-10">
        <Toolbar editor={editor} />
      </div>

      <div className="min-h-[250px] overflow-y-auto px-3 py-2">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
