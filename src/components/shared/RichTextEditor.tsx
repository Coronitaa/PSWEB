

"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useEditor, EditorContent, BubbleMenu, type Editor, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
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
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Image as ImageIcon, Video, Palette, RotateCw, ImagePlus
} from 'lucide-react';
import { GradientPicker } from './GradientPicker';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';


export interface FontFamilyOptions {
  types: string[],
}

export interface FontSizeOptions {
  types: string[],
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontFamily: {
      setFontFamily: (font: string) => ReturnType,
      unsetFontFamily: () => ReturnType,
    }
    fontSize: {
      setFontSize: (size: string) => ReturnType,
      unsetFontSize: () => ReturnType,
    }
  }
}

export const FontFamily = Extension.create<FontFamilyOptions>({
  name: 'fontFamily',

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
          fontFamily: {
            default: null,
            parseHTML: element => element.style.fontFamily?.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontFamily) {
                return {}
              }

              return {
                style: `font-family: ${attributes.fontFamily}`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setFontFamily: fontFamily => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontFamily })
          .run()
      },
      unsetFontFamily: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontFamily: null })
          // @ts-ignore
          .removeEmptyTextStyle()
          .run()
      },
    }
  },
});

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

export const TextGradient = Extension.create<any>({
    name: 'textGradient',
    addOptions() { return { types: ['textStyle'] } },
    addGlobalAttributes() {
        return [{
            types: this.options.types,
            attributes: {
                textGradient: {
                    default: null,
                    parseHTML: element => element.style.backgroundImage,
                    renderHTML: attributes => {
                        if (!attributes.textGradient) return {};
                        return { 
                            style: `background-image: ${attributes.textGradient}; color: transparent; -webkit-background-clip: text; background-clip: text;`,
                        };
                    },
                },
            },
        }];
    },
    addCommands() {
        return {
            setTextGradient: (gradient) => ({ chain }) => chain().setMark('textStyle', { textGradient: gradient }).run(),
            unsetTextGradient: () => ({ chain }) => chain().setMark('textStyle', { textGradient: null }).removeEmptyTextStyle().run(),
        };
    },
});

const MediaResizeComponent = (props: NodeViewProps) => {
  const { node, updateAttributes, selected, editor } = props;
  const isImage = node.type.name === 'image';
  const isVideo = node.type.name === 'youtube';
  const href = node.attrs.href;

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

  const handles = [
    { pos: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2', direction: 'top-left' },
    { pos: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2', direction: 'top' },
    { pos: 'top-0 right-0 translate-x-1/2 -translate-y-1/2', direction: 'top-right' },
    { pos: 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2', direction: 'left' },
    { pos: 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2', direction: 'right' },
    { pos: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2', direction: 'bottom-left' },
    { pos: 'bottom-0 left-1/2 -translate-x-1/2 -translate-y-1/2', direction: 'bottom' },
    { pos: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2', direction: 'bottom-right' },
  ];
  
  const initialHandleAngles: { [key: string]: number } = {
    'top-left': 135,
    'top': 90,
    'top-right': 45,
    'left': 180,
    'right': 0,
    'bottom-left': 225,
    'bottom': 270,
    'bottom-right': 315,
  };
  
  const getCursorForAngle = (angle: number): string => {
    const normalizedAngle = (angle % 360 + 360) % 360;
    const slice = Math.round(normalizedAngle / 45) % 8;

    switch (slice) {
      case 0: return 'ew-resize';
      case 1: return 'nesw-resize';
      case 2: return 'ns-resize';
      case 3: return 'nwse-resize';
      case 4: return 'ew-resize';
      case 5: return 'nesw-resize';
      case 6: return 'ns-resize';
      case 7: return 'nwse-resize';
      default: return 'auto';
    }
  };
  
  const handleStyles = useMemo(() => {
    return handles.map(handle => {
        const initialAngle = initialHandleAngles[handle.direction];
        const finalAngle = initialAngle + rotation;
        const cursorStyle = getCursorForAngle(finalAngle);
        return { cursor: cursorStyle };
    })
  }, [rotation, handles, initialHandleAngles]);


  const createResizeHandler = (direction: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const container = containerRef.current;
    if (!container) return;
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = container.offsetWidth;
    const startHeight = container.offsetHeight;
    const aspectRatio = startWidth / startHeight;
    const angleRad = rotation * (Math.PI / 180);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      const cos = Math.cos(angleRad);
      const sin = Math.sin(angleRad);
      const dxRot = dx * cos + dy * sin;
      const dyRot = -dx * sin + dy * cos;

      let newWidth = startWidth;
      let newHeight = startHeight;
      
      const shouldDeform = moveEvent.shiftKey;

      if (direction.includes('right')) newWidth = startWidth + dxRot;
      if (direction.includes('left')) newWidth = startWidth - dxRot;
      if (direction.includes('bottom')) newHeight = startHeight + dyRot;
      if (direction.includes('top')) newHeight = startHeight - dyRot;
      
      if (!shouldDeform) {
        const isCorner = direction.includes('-');
        if (isCorner) {
          if (Math.abs(dxRot) > Math.abs(dyRot)) {
            newHeight = newWidth / aspectRatio;
          } else {
            newWidth = newHeight * aspectRatio;
          }
        } else {
          if (direction.includes('left') || direction.includes('right')) {
            newHeight = newWidth / aspectRatio;
          } else {
            newWidth = newHeight * aspectRatio;
          }
        }
      }
      
      newWidth = Math.max(50, newWidth);
      newHeight = Math.max(20, newHeight);

      updateAttributes({ width: `${newWidth}px`, height: `${newHeight}px` });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };
  
  const createRotationHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    const initialRotation = rotation;

    const handleMouseMove = (moveEvent: MouseEvent) => {
        const currentAngle = Math.atan2(moveEvent.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
        const newRotation = initialRotation + (currentAngle - startAngle);
        updateAttributes({ rotate: newRotation });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const imageContent = <img src={node.attrs.src} alt={node.attrs.alt} className="w-full h-full block object-fill" />;

  const handleLinkClick = (e: React.MouseEvent) => {
    if (editor.isEditable) {
      e.preventDefault();
    }
  };

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
          "relative w-full",
          selected && 'border-2 border-primary border-dashed'
        )}
        style={{
            height: height || 'auto',
            transform: `rotate(${rotation}deg)`
        }}
      >
        {isImage && (
            href ? (
              <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="w-full h-full block cursor-pointer" onClick={handleLinkClick}>
                {imageContent}
              </a>
            ) : imageContent
        )}
        {isVideo && (
          <div className="w-full h-full relative">
              <iframe
                className="absolute inset-0 w-full h-full"
                src={node.attrs.src}
                frameBorder="0"
                allowFullScreen
              />
              {editor.isEditable && (
                  <div 
                      className={cn(
                          "absolute inset-0 z-10",
                          selected && "cursor-move"
                      )} 
                      aria-hidden="true" 
                  />
              )}
          </div>
        )}
      
        {selected && (
          <>
            {handles.map((handle, index) => (
                    <div
                      key={index}
                      className={cn(
                        "absolute w-2.5 h-2.5 bg-primary rounded-full border border-card pointer-events-auto z-20",
                        handle.pos
                      )}
                      style={handleStyles[index]}
                      onMouseDown={createResizeHandler(handle.direction)}
                    />
            ))}
              <div
                className="absolute bottom-0 right-0 translate-x-[150%] translate-y-[150%] p-1 bg-card rounded-full border border-primary pointer-events-auto z-20 cursor-alias"
                onMouseDown={createRotationHandler}
                title="Rotate"
              >
                  <RotateCw className="w-3 h-3 text-primary"/>
              </div>
          </>
        )}
      </div>
       {selected && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[calc(100%+12px)] z-20 flex gap-1 bg-card p-1 rounded-md shadow-lg border border-border pointer-events-auto">
              <Button type="button" size="icon" variant={float === 'left' ? 'default' : 'ghost'} className="h-7 w-7" onClick={() => setAlignment('left')} title="Align left"><AlignLeft className="w-4 h-4" /></Button>
              <Button type="button" size="icon" variant={!float || float === 'center' ? 'default' : 'ghost'} className="h-7 w-7" onClick={() => setAlignment('center')} title="Align center"><AlignCenter className="w-4 h-4" /></Button>
              <Button type="button" size="icon" variant={float === 'right' ? 'default' : 'ghost'} className="h-7 w-7" onClick={() => setAlignment('right')} title="Align right"><AlignRight className="w-4 h-4" /></Button>
              <div className="w-px h-5 bg-border mx-1 self-center" />
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => rotateByAxis(90)} title="Rotate 90°">
                  <RotateCw className="w-4 h-4" />
              </Button>
            </div>
      )}
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
        renderHTML: attributes => ({
          style: `width: ${attributes.width};`,
        }),
        parseHTML: element => element.style.width || null,
      },
      height: {
        default: null,
        renderHTML: attributes => ({
            style: `height: ${attributes.height};`,
        }),
        parseHTML: element => element.style.height || null,
      },
      'data-float': {
        default: 'center',
        renderHTML: attributes => ({
          'data-float': attributes['data-float'],
        }),
        parseHTML: element => element.getAttribute('data-float'),
      },
      rotate: {
          default: 0,
          renderHTML: attributes => ({
              style: `transform: rotate(${attributes.rotate}deg)`
          }),
          parseHTML: element => {
              const transform = element.style.transform;
              if (transform && transform.includes('rotate')) {
                  const match = transform.match(/rotate\(([^deg)]+)deg\)/);
                  return match ? parseFloat(match[1]) : 0;
              }
              return 0;
          }
      },
      href: {
        default: null,
      },
      target: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a[href]:not([href^="javascript:"]) > img[src]:not([src^="data:"])',
        getAttrs: dom => {
            const link = dom.parentElement as HTMLAnchorElement;
            const img = dom as HTMLImageElement;
            return {
                src: img.getAttribute('src'),
                alt: img.getAttribute('alt'),
                title: img.getAttribute('title'),
                href: link.getAttribute('href'),
                target: link.getAttribute('target'),
            };
        },
      },
      {
        tag: 'img[src]:not([src^="data:"])',
        getAttrs: dom => {
            const img = dom as HTMLImageElement;
            if (img.closest('a')) {
                return false; 
            }
            return {
                src: img.getAttribute('src'),
                alt: img.getAttribute('alt'),
                title: img.getAttribute('title'),
                href: null,
                target: null,
            };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { href, target, ...imgAttributes } = HTMLAttributes;
    const imgTag: any = ['img', imgAttributes]; // DOMOutputSpec for img

    if (href) {
      return ['a', { href, target, rel: 'noopener noreferrer nofollow' }, imgTag]; // DOMOutputSpec for a tag containing img
    }
    return imgTag; // DOMOutputSpec for img
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
                default: '640px',
                renderHTML: attributes => ({
                    style: `width: ${attributes.width};`
                }),
                parseHTML: element => element.style.width || '640px',
            },
            height: {
                default: '480px',
                renderHTML: attributes => ({
                  style: `height: ${attributes.height};`,
                }),
                parseHTML: element => element.style.height || '480px',
            },
            'data-float': {
                default: 'center',
                renderHTML: attributes => ({
                    'data-float': attributes['data-float']
                }),
                parseHTML: element => element.getAttribute('data-float'),
            },
            rotate: {
                default: 0,
                renderHTML: attributes => ({
                    style: `transform: rotate(${attributes.rotate}deg)`
                }),
                parseHTML: element => {
                    const transform = element.style.transform;
                    if (transform && transform.includes('rotate')) {
                        const match = transform.match(/rotate\(([^deg)]+)deg\)/);
                        return match ? parseFloat(match[1]) : 0;
                    }
                    return 0;
                }
            }
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

  const isLinkActive = editor.isActive('link') || (editor.isActive('image') && !!editor.getAttributes('image').href);

  const openLinkModal = () => {
    const isImageActive = editor.isActive('image');
    const previousUrl = isImageActive
      ? editor.getAttributes('image').href
      : editor.getAttributes('link').href;
    setUrl(previousUrl || '');
    setIsLinkModalOpen(true);
  };
  
  const handleClearLink = () => {
    const isImageActive = editor.isActive('image');
    if (isImageActive) {
      editor.chain().focus().updateAttributes('image', { href: null, target: null }).run();
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    }
    setIsLinkModalOpen(false);
    setUrl('');
  };

  const setLink = () => {
    if (url === null) return;
    
    if (url === '') {
      handleClearLink();
      return;
    }

    const isImageActive = editor.isActive('image');

    if (isImageActive) {
      editor.chain().focus().updateAttributes('image', { href: url, target: '_blank' }).run();
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

  const fontFamilies = [
    { label: "Default", value: "_default_font_" },
    { label: "Sans-Serif", value: "var(--font-geist-sans), sans-serif" },
    { label: "Serif", value: "serif" },
    { label: "Monospace", value: "var(--font-geist-mono), monospace" },
    { label: "Georgia", value: "Georgia, serif" },
    { label: "Impact", value: "Impact, sans-serif" },
    { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
    { label: "Cursive", value: "cursive" },
  ];

  const handleMediaModalOpen = (type: 'image' | 'video') => {
    setUrl('');
    if (type === 'image') setIsImageModalOpen(true);
    if (type === 'video') setIsVideoModalOpen(true);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-1 p-1 border-b">
        <Select
            value={editor.getAttributes('textStyle').fontFamily || '_default_font_'}
            onValueChange={(value) => {
                if (value === '_default_font_') {
                    editor.chain().focus().unsetFontFamily().run();
                } else {
                    editor.chain().focus().setFontFamily(value).run();
                }
            }}
        >
            <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="Font" />
            </SelectTrigger>
            <SelectContent>
                {fontFamilies.map(font => (
                    <SelectItem key={font.label} value={font.value} className="text-xs" style={{ fontFamily: font.value === '_default_font_' ? 'inherit' : font.value }}>{font.label}</SelectItem>
                ))}
            </SelectContent>
        </Select>
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
          <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue placeholder="Size" />
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
        <GradientPicker
          value={editor.getAttributes('textStyle').color || editor.getAttributes('textStyle').textGradient || '#ffffff'}
          onChange={(value) => {
            const isGradient = value.includes('gradient');
            if (isGradient) {
              editor.chain().focus().unsetColor().setTextGradient(value).run();
            } else {
              editor.chain().focus().unsetTextGradient().setColor(value).run();
            }
          }}
        />
        <Button type="button" variant="ghost" size="icon" onClick={openLinkModal} className={cn("h-8 w-8", isLinkActive && "bg-muted text-primary")}><LinkIcon className="h-4 w-4" /></Button>
        <Separator orientation="vertical" className="h-6" />
        
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Text Align">
                    <AlignJustify className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign('left').run()} className={cn(editor.isActive({ textAlign: 'left' }) && "bg-muted")}>
                    <AlignLeft className="h-4 w-4 mr-2" /> Left
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign('center').run()} className={cn(editor.isActive({ textAlign: 'center' }) && "bg-muted")}>
                    <AlignCenter className="h-4 w-4 mr-2" /> Center
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign('right').run()} className={cn(editor.isActive({ textAlign: 'right' }) && "bg-muted")}>
                    <AlignRight className="h-4 w-4 mr-2" /> Right
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Lists">
                    <List className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn(editor.isActive('bulletList') && "bg-muted")}>
                    <List className="h-4 w-4 mr-2" /> Bullet List
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn(editor.isActive('orderedList') && "bg-muted")}>
                    <ListOrdered className="h-4 w-4 mr-2" /> Numbered List
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
        
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Embed Media">
                    <ImagePlus className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleMediaModalOpen('image')}>
                    <ImageIcon className="h-4 w-4 mr-2" /> Embed Image
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMediaModalOpen('video')}>
                    <Video className="h-4 w-4 mr-2" /> Embed YouTube Video
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

      </div>

      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Set Link URL</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="linkUrl">URL</Label>
            <Input id="linkUrl" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" />
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
            <div>
              {isLinkActive && (
                <Button type="button" variant="ghost" className="w-full sm:w-auto justify-start text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleClearLink}>
                  Clear Link
                </Button>
              )}
            </div>
            <div className="flex justify-end gap-2">
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="button" onClick={setLink}>{url ? 'Update Link' : 'Set Link'}</Button>
            </div>
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
      FontFamily,
      FontSize.configure({
        types: ['textStyle'],
      }),
      TextGradient,
      TiptapLink.configure({ openOnClick: false, autolink: true, HTMLAttributes: { class: 'text-primary hover:text-accent transition-colors cursor-pointer underline' } }),
      CustomImage.configure({
        inline: false, 
        allowBase64: true,
      }),
      CustomYoutube.configure({
        inline: false, 
        controls: false,
        nocookie: true,
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
            <GradientPicker
                value={editor.getAttributes('textStyle').color || editor.getAttributes('textStyle').textGradient || '#ffffff'}
                onChange={(value) => {
                    const isGradient = value.includes('gradient');
                    if (isGradient) {
                    editor.chain().focus().unsetColor().setTextGradient(value).run();
                    } else {
                    editor.chain().focus().unsetTextGradient().setColor(value).run();
                    }
                }}
            />
        </BubbleMenu>
      )}
      
      <div ref={toolbarRef} className="sticky top-0 bg-card/95 backdrop-blur-sm z-10">
        <Toolbar editor={editor} />
      </div>

      <div className="min-h-[250px] overflow-y-auto overflow-x-hidden px-3 py-2">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

    














