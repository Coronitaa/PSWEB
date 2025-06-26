"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent, type Editor, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Bold from '@tiptap/extension-bold';
import Placeholder from '@tiptap/extension-placeholder';
import TiptapLink from '@tiptap/extension-link';
import TiptapImage from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Underline from '@tiptap/extension-underline';
import {
  Bold as BoldIcon, Italic, Link as LinkIcon, List, ListOrdered, Strikethrough, Underline as UnderlineIcon,
  AlignLeft, AlignCenter, AlignRight, Image as ImageIcon, Video, Palette, RotateCw, Trash2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TAG_PALETTES } from '@/lib/tag-palettes';
import { cn } from '@/lib/utils';

// --- TIPTAP CUSTOM EXTENSIONS ---

// 1. Gradient Text Extension
const GradientText = Extension.create({
  name: 'gradientText',
  addAttributes() {
    return {
      gradient: {
        default: null,
        parseHTML: element => element.style.backgroundImage,
        renderHTML: attributes => {
          if (!attributes.gradient) return {};
          return {
            style: `background-image: ${attributes.gradient}; -webkit-background-clip: text; background-clip: text; color: transparent;`,
          };
        },
      },
    };
  },
  addCommands() {
    return {
      setGradient: (gradient: string) => ({ chain }) => {
        return chain().setMark('textStyle', { gradient }).run();
      },
      unsetGradient: () => ({ chain }) => {
        // Correctly chain commands to remove the gradient attribute and clean up empty style tags.
        return chain().setMark('textStyle', { gradient: null }).removeEmptyTextStyle().run();
      },
    };
  },
});

// 2. Custom Bold extension to prevent prose color conflicts
const CustomBold = Bold.extend({
  renderHTML({ HTMLAttributes }) {
    // Render with a <b> tag to avoid Tailwind's `prose` styling override on <strong> tags.
    return ['b', HTMLAttributes, 0];
  },
});

// 3. Resizable Media Node View (for Images and Videos)
const MediaResizeComponent = (props: NodeViewProps) => {
  const { node, updateAttributes, selected, editor } = props;
  const isImage = node.type.name === 'image';
  const isVideo = node.type.name === 'youtube';

  const containerRef = useRef<HTMLDivElement>(null);

  const setAlignment = (align: 'left' | 'center' | 'right' | null) => {
    updateAttributes({ 'data-float': align });
  };

  const float = node.attrs['data-float'];
  const width = node.attrs.width;
  const height = node.attrs.height;
  const rotation = node.attrs.rotate || 0;

  const rotateByAxis = (degrees: number) => {
    const currentRotation = node.attrs.rotate || 0;
    updateAttributes({ rotate: currentRotation + degrees });
  };

  return (
    <NodeViewWrapper as="div" className="rich-text-media-node group clear-both relative" style={{ width }} data-float={float} draggable="true" data-drag-handle>
       <div ref={containerRef} className={cn("relative w-full", selected && 'border-2 border-primary border-dashed')} style={{ height: height || 'auto', transform: `rotate(${rotation}deg)`}}>
        {isImage && <img src={node.attrs.src} alt={node.attrs.alt} className="w-full h-full block object-fill" />}
        {isVideo && (
          <div className="w-full h-full relative">
              <iframe className="absolute inset-0 w-full h-full" src={node.attrs.src} frameBorder="0" allowFullScreen />
              {editor.isEditable && <div className={cn("absolute inset-0 z-10", selected && "cursor-move")} aria-hidden="true" />}
          </div>
        )}
      </div>
      {selected && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[calc(100%+12px)] z-20 flex gap-1 bg-card p-1 rounded-md shadow-lg border border-border pointer-events-auto">
              <Button type="button" size="icon" variant={float === 'left' ? 'default' : 'ghost'} className="h-7 w-7" onClick={() => setAlignment('left')} title="Align left"><AlignLeft className="w-4 h-4" /></Button>
              <Button type="button" size="icon" variant={!float || float === 'center' ? 'default' : 'ghost'} className="h-7 w-7" onClick={() => setAlignment('center')} title="Align center"><AlignCenter className="w-4 h-4" /></Button>
              <Button type="button" size="icon" variant={float === 'right' ? 'default' : 'ghost'} className="h-7 w-7" onClick={() => setAlignment('right')} title="Align right"><AlignRight className="w-4 h-4" /></Button>
              <div className="w-px h-5 bg-border mx-1 self-center" />
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => rotateByAxis(90)} title="Rotate 90°"><RotateCw className="w-4 h-4" /></Button>
          </div>
      )}
    </NodeViewWrapper>
  );
};

// 4. Custom Image & Youtube extensions that use the resizable view
const CustomImage = TiptapImage.extend({ draggable: true, addNodeView() { return ReactNodeViewRenderer(MediaResizeComponent); } });
const CustomYoutube = Youtube.extend({ draggable: true, addNodeView() { return ReactNodeViewRenderer(MediaResizeComponent); } });


// --- COLOR & GRADIENT PICKER COMPONENT ---
const ColorGradientPicker = ({ editor }: { editor: Editor }) => {
    const [recentColors, setRecentColors] = useState<string[]>([]);
    const currentColor = editor.getAttributes('textStyle').color || '#000000';

    useEffect(() => {
        const storedColors = localStorage.getItem('tiptapRecentColors');
        if (storedColors) setRecentColors(JSON.parse(storedColors));
    }, []);

    const addRecentColor = (color: string) => {
        const newRecentColors = [color, ...recentColors.filter(c => c !== color)].slice(0, 14);
        setRecentColors(newRecentColors);
        localStorage.setItem('tiptapRecentColors', JSON.stringify(newRecentColors));
    };

    const applyColor = (color: string) => {
        editor.chain().focus().unsetGradient().setColor(color).run();
        addRecentColor(color);
    };
    
    const applyGradient = (gradient: string) => {
        editor.chain().focus().unsetColor().setGradient(gradient).run();
    };
    
    const removeStyle = () => {
        editor.chain().focus().unsetColor().unsetGradient().run();
    }

    const paletteColors = [...new Set(TAG_PALETTES.flatMap(p => [p.base.background, p.base.text, p.hover.background, p.hover.text]).filter(Boolean))] as string[];
    const gradients = [
        'linear-gradient(to right, #E64A8B, #F252A2)', 'linear-gradient(to right, #e67e22, #e74c3c)',
        'linear-gradient(to right, #27ae60, #2ecc71)', 'linear-gradient(to right, #8e44ad, #9b59b6)',
        'linear-gradient(to right, #2980b9, #3498db)', 'linear-gradient(to right, #f1c40f, #f39c12)',
    ];

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                    <Palette className="h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
                <Tabs defaultValue="solid" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="solid">Solid</TabsTrigger>
                        <TabsTrigger value="gradient">Gradient</TabsTrigger>
                    </TabsList>
                    <TabsContent value="solid" className="p-2 space-y-3">
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={currentColor}
                                onInput={(e) => applyColor((e.target as HTMLInputElement).value)}
                                className="p-0 w-8 h-8 rounded-md border-none cursor-pointer bg-transparent"
                            />
                            <Input
                                value={currentColor}
                                onChange={(e) => applyColor(e.target.value)}
                                placeholder="#000000"
                                className="h-8 flex-1"
                            />
                        </div>
                        <Separator />
                        <div>
                           <p className="text-xs font-semibold text-muted-foreground mb-1.5">Project Colors</p>
                           <div className="grid grid-cols-7 gap-1">
                                {paletteColors.map((color, i) => (
                                    <Button key={`palette-${i}`} variant="ghost" size="icon" className="h-6 w-6 rounded-full p-0" onClick={() => applyColor(color)}>
                                        <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: color }} />
                                    </Button>
                                ))}
                            </div>
                        </div>
                         {recentColors.length > 0 && <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Recent</p>
                            <div className="grid grid-cols-7 gap-1">
                                {recentColors.map((color, i) => (
                                    <Button key={`recent-${i}`} variant="ghost" size="icon" className="h-6 w-6 rounded-full p-0" onClick={() => applyColor(color)}>
                                        <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: color }} />
                                    </Button>
                                ))}
                            </div>
                        </div>}
                         <Button variant="outline" size="sm" className="w-full h-8 mt-2" onClick={removeStyle}>
                            <Trash2 className="w-4 h-4 mr-2"/>
                            Remove Color
                        </Button>
                    </TabsContent>
                    <TabsContent value="gradient" className="p-2 space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                            {gradients.map((gradient, i) => (
                                <Button key={`grad-${i}`} variant="ghost" className="h-8 w-full p-0 rounded-md" onClick={() => applyGradient(gradient)}>
                                    <div className="w-full h-full rounded-md" style={{ backgroundImage: gradient }} />
                                </Button>
                            ))}
                        </div>
                        <Button variant="outline" size="sm" className="w-full h-8 mt-2" onClick={removeStyle}>
                            <Trash2 className="w-4 h-4 mr-2"/>
                            Remove Gradient
                        </Button>
                    </TabsContent>
                </Tabs>
            </PopoverContent>
        </Popover>
    );
};


// --- TOOLBAR COMPONENT ---
const Toolbar = ({ editor }: { editor: Editor | null }) => {
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [url, setUrl] = useState('');

  if (!editor) return null;

  const openLinkModal = () => {
    setUrl(editor.getAttributes('link').href || '');
    setIsLinkModalOpen(true);
  };
  
  const setLink = () => {
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank' }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setIsLinkModalOpen(false);
    setUrl('');
  };

  const addImage = () => { if (url) editor.chain().focus().setImage({ src: url }).run(); setIsImageModalOpen(false); setUrl(''); };
  const addYoutubeVideo = () => { if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run(); setIsVideoModalOpen(false); setUrl(''); };
  
  return (
    <>
        <div className="flex flex-wrap items-center gap-1 p-1 border-b">
            <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBold().run()} className={cn("h-8 w-8", editor.isActive('bold') && "bg-muted text-primary")}><BoldIcon className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("h-8 w-8", editor.isActive('italic') && "bg-muted text-primary")}><Italic className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleUnderline().run()} className={cn("h-8 w-8", editor.isActive('underline') && "bg-muted text-primary")}><UnderlineIcon className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleStrike().run()} className={cn("h-8 w-8", editor.isActive('strike') && "bg-muted text-primary")}><Strikethrough className="h-4 w-4" /></Button>
            <Separator orientation="vertical" className="h-6" />
            
            <ColorGradientPicker editor={editor} />
            
            <Separator orientation="vertical" className="h-6" />
            <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={cn("h-8 w-8", editor.isActive({ textAlign: 'left' }) && "bg-muted text-primary")}><AlignLeft className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={cn("h-8 w-8", editor.isActive({ textAlign: 'center' }) && "bg-muted text-primary")}><AlignCenter className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={cn("h-8 w-8", editor.isActive({ textAlign: 'right' }) && "bg-muted text-primary")}><AlignRight className="h-4 w-4" /></Button>
            <Separator orientation="vertical" className="h-6" />
            <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn("h-8 w-8", editor.isActive('bulletList') && "bg-muted text-primary")}><List className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn("h-8 w-8", editor.isActive('orderedList') && "bg-muted text-primary")}><ListOrdered className="h-4 w-4" /></Button>
            <Separator orientation="vertical" className="h-6" />
            <Button type="button" variant="ghost" size="icon" onClick={openLinkModal} className={cn("h-8 w-8", editor.isActive('link') && "bg-muted text-primary")}><LinkIcon className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => setIsImageModalOpen(true)} className="h-8 w-8"><ImageIcon className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => setIsVideoModalOpen(true)} className="h-8 w-8"><Video className="h-4 w-4" /></Button>
      </div>

      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent><DialogHeader><DialogTitle>Edit Link URL</DialogTitle></DialogHeader><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" /><DialogFooter><Button type="button" variant="outline" onClick={() => setIsLinkModalOpen(false)}>Cancel</Button><Button type="button" onClick={setLink}>Save</Button></DialogFooter></DialogContent>
      </Dialog>
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent><DialogHeader><DialogTitle>Embed Image from URL</DialogTitle></DialogHeader><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." /><DialogFooter><Button type="button" variant="outline" onClick={() => setIsImageModalOpen(false)}>Cancel</Button><Button type="button" onClick={addImage}>Add Image</Button></DialogFooter></DialogContent>
      </Dialog>
      <Dialog open={isVideoModalOpen} onOpenChange={setIsVideoModalOpen}>
        <DialogContent><DialogHeader><DialogTitle>Embed YouTube Video</DialogTitle></DialogHeader><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." /><DialogFooter><Button type="button" variant="outline" onClick={() => setIsVideoModalOpen(false)}>Cancel</Button><Button type="button" onClick={addYoutubeVideo}>Add Video</Button></DialogFooter></DialogContent>
      </Dialog>
    </>
  );
};


// --- MAIN RICH TEXT EDITOR COMPONENT ---
interface RichTextEditorProps {
  initialContent?: string;
  onChange: (html: string) => void;
}

export const RichTextEditor = ({ initialContent, onChange }: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bold: false, // Deactivate the default bold extension
      }),
      CustomBold, // Use our custom bold extension
      Placeholder.configure({ placeholder: "Share the details of your resource..." }),
      TiptapLink.configure({ openOnClick: false, autolink: true, HTMLAttributes: { class: 'text-primary hover:text-accent transition-colors cursor-pointer underline' } }),
      CustomImage.configure({ inline: false, allowBase64: true }),
      CustomYoutube.configure({ inline: false, controls: false, nocookie: true }),
      TextAlign.configure({ types: ['heading', 'paragraph', 'image', 'youtube'] }),
      TextStyle,
      Color,
      Underline,
      GradientText,
    ],
    content: initialContent,
    onUpdate: ({ editor }) => { onChange(editor.getHTML()); },
    editorProps: {
      attributes: {
        class: cn(
          'prose dark:prose-invert max-w-none prose-sm sm:prose-base',
          'min-h-[250px] p-3 focus:outline-none'
        ),
      },
    },
  });

  return (
    <div className="w-full rounded-md border border-input bg-card ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      <Toolbar editor={editor} />
      <div className="overflow-y-auto overflow-x-hidden">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
