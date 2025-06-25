
"use client";

import React from 'react';
import { useEditor, EditorContent, BubbleMenu, type Editor } from '@tiptap/react';
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
  Bold, Italic, Link, List, ListOrdered, Strikethrough, Underline as UnderlineIcon,
  Heading2, Heading3, Pilcrow, AlignLeft, AlignCenter, AlignRight, Image as ImageIcon, Video, Palette
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const Toolbar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank' }).run();
  };
  
  const addImage = () => {
    const url = window.prompt('Image URL');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const addYoutubeVideo = () => {
    const url = prompt('Enter YouTube URL');
    if (url) {
      editor.chain().focus().setYoutubeVideo({ src: url }).run();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-1">
      <Select
        value={
            editor.isActive('heading', { level: 2 }) ? 'h2' :
            editor.isActive('heading', { level: 3 }) ? 'h3' : 'p'
        }
        onValueChange={(value) => {
            if (value === 'p') editor.chain().focus().setParagraph().run();
            if (value === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
            if (value === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
        }}
      >
        <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue placeholder="Text style" />
        </SelectTrigger>
        <SelectContent>
            <SelectItem value="p">Paragraph</SelectItem>
            <SelectItem value="h2">Heading 2</SelectItem>
            <SelectItem value="h3">Heading 3</SelectItem>
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
      <Button type="button" variant="ghost" size="icon" onClick={setLink} className={cn("h-8 w-8", editor.isActive('link') && "bg-muted text-primary")}><Link className="h-4 w-4" /></Button>
      <Button type="button" variant="ghost" size="icon" onClick={addImage} className="h-8 w-8"><ImageIcon className="h-4 w-4" /></Button>
      <Button type="button" variant="ghost" size="icon" onClick={addYoutubeVideo} className="h-8 w-8"><Video className="h-4 w-4" /></Button>
    </div>
  );
};

interface RichTextEditorProps {
  initialContent?: string;
  onChange: (html: string) => void;
}

export const RichTextEditor = ({ initialContent, onChange }: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Placeholder.configure({ placeholder: "Share the details of your resource..." }),
      TiptapLink.configure({ openOnClick: false, autolink: true, HTMLAttributes: { class: 'text-primary hover:text-accent transition-colors cursor-pointer underline' } }),
      TiptapImage.configure({ inline: false, allowBase64: true }),
      Youtube.configure({ controls: false, nocookie: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Underline,
    ],
    content: initialContent,
    onUpdate: ({ editor }) => { onChange(editor.getHTML()); },
    editorProps: {
      attributes: {
        class: cn('prose dark:prose-invert max-w-none prose-sm sm:prose-base', 'prose-headings:text-primary prose-a:text-primary', 'focus:outline-none'),
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
            <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={cn("h-8 w-8", editor.isActive('heading', {level: 2}) && "bg-muted text-primary")}><Heading2 className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={cn("h-8 w-8", editor.isActive('heading', {level: 3}) && "bg-muted text-primary")}><Heading3 className="h-4 w-4" /></Button>
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
      
      <div className="sticky top-0 bg-card/95 backdrop-blur-sm z-10 border-b">
        <Toolbar editor={editor} />
      </div>

      <div className="min-h-[250px] overflow-y-auto px-3 py-2">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
