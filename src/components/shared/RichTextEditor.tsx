

"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useEditor, EditorContent, BubbleMenu, type Editor, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps, Node, mergeAttributes } from '@tiptap/react';
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
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Image as ImageIcon, Video, Palette, RotateCw, ImagePlus, Box, GalleryHorizontal, GripVertical, Trash2
} from 'lucide-react';
import { GradientPicker } from './GradientPicker';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';
import { Carousel, CarouselItem } from '@/components/shared/Carousel';
import { Reorder, useDragControls } from 'framer-motion';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src?: string;
        alt?: string;
        'camera-controls'?: boolean;
        'auto-rotate'?: boolean;
      }, HTMLElement>;
    }
  }
}

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
    modelViewer: {
      setModelViewer: (options: { src: string }) => ReturnType,
    }
    iframe: {
      setIframe: (options: { src: string, width?: string, height?: string }) => ReturnType,
    }
    imageCarousel: {
      setImageCarousel: (options: { images: string[] }) => ReturnType,
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
            setTextGradient: (gradient) => ({ chain }) => {
              const { fontFamily, fontSize } = chain().getAttributes('textStyle');
              return chain().setMark('textStyle', { textGradient: gradient, fontFamily, fontSize }).run();
            },
            unsetTextGradient: () => ({ chain }) => {
              const { fontFamily, fontSize } = chain().getAttributes('textStyle');
              return chain().setMark('textStyle', { textGradient: null, fontFamily, fontSize }).removeEmptyTextStyle().run()
            },
        };
    },
});

// --- Media Resize Component ---

const handles = [
    { pos: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2', direction: 'top-left' },
    { pos: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2', direction: 'top' },
    { pos: 'top-0 right-0 translate-x-1/2 -translate-y-1/2', direction: 'top-right' },
    { pos: 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2', direction: 'left' },
    { pos: 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2', direction: 'right' },
    { pos: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2', direction: 'bottom-left' },
    { pos: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2', direction: 'bottom' },
    { pos: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2', direction: 'bottom-right' },
];

const getDynamicCursor = (handleDirection: string, objectRotation: number): string => {
    // Base angle for the visual representation of the cursor arrow
    const baseCursorAngles: { [key: string]: number } = {
        'top': 90, 'bottom': 90,
        'left': 0, 'right': 0,
        'top-left': 135, 'top-right': 45,
        'bottom-left': 45, 'bottom-right': 135,
    };

    const rotation = baseCursorAngles[handleDirection] + objectRotation;

    // A two-headed arrow SVG that we will rotate.
    // Stroke is white with a thin black outline for visibility on any background.
    const svg = `
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <g transform="rotate(${rotation} 16 16)">
                <path d="M4 16 H28 M4 16 L10 10 M4 16 L10 22 M28 16 L22 10 M28 16 L22 22" stroke="black" stroke-width="3.5" fill="none" stroke-linejoin="round" stroke-linecap="round" />
                <path d="M4 16 H28 M4 16 L10 10 M4 16 L10 22 M28 16 L22 10 M28 16 L22 22" stroke="white" stroke-width="1.5" fill="none" stroke-linejoin="round" stroke-linecap="round" />
            </g>
        </svg>
    `.replace(/>\s+</g, '><').replace(/\s\s+/g, ' ').trim();

    const encodedSvg = encodeURIComponent(svg);
    // The cursor hotspot is the center of the SVG (16, 16)
    return `url('data:image/svg+xml;charset=UTF-8,${encodedSvg}') 16 16, auto`;
};


const MediaResizeComponent = (props: NodeViewProps) => {
  const { node, updateAttributes, selected, editor } = props;
  const isImage = node.type.name === 'image';
  const isVideo = node.type.name === 'youtube';
  const isIframe = node.type.name === 'iframe';
  const isModel = node.type.name === 'modelViewer';
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
  
  const handleStyles = useMemo(() => {
    return handles.map(handle => ({
        cursor: getDynamicCursor(handle.direction, rotation)
    }));
  }, [rotation]);


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
          // Changed to solid border for a clearer edge
          selected && 'border-2 border-primary border-solid'
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
        {(isVideo || isIframe) && (
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
        {isModel && (
          <div className="w-full h-full relative">
              <model-viewer
                src={node.attrs.src}
                alt="A 3D model"
                camera-controls
                auto-rotate
                class="w-full h-full rounded-md"
              ></model-viewer>
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
                className="absolute bottom-0 right-0 translate-x-[110%] translate-y-[110%] p-1.5 bg-card rounded-full border border-primary pointer-events-auto z-20 cursor-alias transition-transform group-hover:scale-110"
                onMouseDown={createRotationHandler}
                title="Rotate Freely"
              >
                  <RotateCw className="w-4 h-4 text-primary"/>
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

// --- Custom Image Carousel Node and Components ---
const ImageCarouselModal = ({ isOpen, onOpenChange, initialImages = [], onSave }: { isOpen: boolean, onOpenChange: (open: boolean) => void, initialImages: string[], onSave: (images: string[]) => void }) => {
  const [images, setImages] = useState(initialImages);
  const [isImporting, setIsImporting] = useState(false);
  const [importText, setImportText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setImages(initialImages);
      setIsImporting(false);
      setImportText('');
    }
  }, [isOpen, initialImages]);

  const addImage = () => {
    setImages([...images, '']);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const updateImage = (index: number, url: string) => {
    const newImages = [...images];
    newImages[index] = url;
    setImages(newImages);
  };

  const handleImport = () => {
    const urls = importText.split('\n').map(url => url.trim()).filter(url => url);
    setImages([...images, ...urls]);
    setIsImporting(false);
    setImportText('');
  };

  const handleSave = () => {
    onSave(images.filter(url => url));
    onOpenChange(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configure Image Carousel</DialogTitle>
          <DialogDescription>Add, remove, and reorder images for your carousel.</DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-y-auto pr-4">
          {isImporting ? (
            <div className="space-y-2">
              <Label htmlFor="import-urls">Paste Image URLs (one per line)</Label>
              <Textarea id="import-urls" value={importText} onChange={e => setImportText(e.target.value)} rows={8} />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setIsImporting(false)}>Cancel</Button>
                <Button onClick={handleImport}>Import URLs</Button>
              </div>
            </div>
          ) : (
            <Reorder.Group axis="y" values={images} onReorder={setImages} className="space-y-2">
              {images.map((image, index) => (
                <Reorder.Item key={index} value={image} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                   <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                   <Input value={image} onChange={(e) => updateImage(index, e.target.value)} placeholder="https://..." />
                   <Button variant="ghost" size="icon" onClick={() => removeImage(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          )}
        </div>
        <DialogFooter>
          {!isImporting && (
            <>
              <Button variant="outline" onClick={addImage}>Add Image</Button>
              <Button variant="outline" onClick={() => setIsImporting(true)}>Import from URLs</Button>
            </>
          )}
          <div className="flex-grow" />
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={handleSave}>Save Carousel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


const ImageCarouselComponent = (props: NodeViewProps) => {
  const { node, selected, editor, updateAttributes } = props;
  const images = node.attrs.images || [];
  const containerRef = useRef<HTMLDivElement>(null);
  const float = node.attrs['data-float'];
  const width = node.attrs.width;
  const height = node.attrs.height;
  const rotation = node.attrs.rotate || 0;

  const setAlignment = (align: 'left' | 'center' | 'right' | null) => {
    updateAttributes({ 'data-float': align });
  };
  
  const rotateByAxis = (degrees: number) => {
    updateAttributes({ rotate: (rotation + degrees) % 360 });
  };

  const handleStyles = useMemo(() => {
    return handles.map(handle => ({
        cursor: getDynamicCursor(handle.direction, rotation)
    }));
  }, [rotation]);

  const createResizeHandler = (direction: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const container = containerRef.current;
    if (!container) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = container.offsetWidth;
    const startHeight = container.offsetHeight;
    const aspectRatio = 16 / 9; // Lock carousel to 16:9
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

      if (direction.includes('right')) newWidth = startWidth + dxRot;
      if (direction.includes('left')) newWidth = startWidth - dxRot;
      if (direction.includes('bottom')) newHeight = startHeight + dyRot;
      if (direction.includes('top')) newHeight = startHeight - dyRot;
      
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

      newWidth = Math.max(200, newWidth);
      newHeight = Math.max(112.5, newHeight);

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


  return (
    <NodeViewWrapper
      as="div"
      className="rich-text-media-node group clear-both relative my-4"
      style={{ width }}
      data-float={float}
      draggable="true"
      data-drag-handle
    >
      <div 
        ref={containerRef}
        className={cn(
          "relative w-full",
          selected && 'border-2 border-primary border-solid'
        )}
        style={{
            height: height || 'auto',
            transform: `rotate(${rotation}deg)`
        }}
      >
        <div className="w-full h-full bg-muted rounded-md overflow-hidden relative">
          {images.length > 0 ? (
            <Carousel itemsToShow={1} showArrows={images.length > 1} autoplay={!selected}>
              {images.map((src: string, i: number) => (
                <CarouselItem key={i}>
                  <div className="relative w-full h-full">
                    <img src={src} alt={`Carousel image ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                </CarouselItem>
              ))}
            </Carousel>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <GalleryHorizontal className="w-12 h-12" />
              <p className="mt-2 text-sm">Empty Carousel</p>
            </div>
          )}
          {editor.isEditable && (
            <div className="absolute inset-0 z-10 cursor-move" />
          )}
        </div>
        
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
              className="absolute bottom-0 right-0 translate-x-[110%] translate-y-[110%] p-1.5 bg-card rounded-full border border-primary pointer-events-auto z-20 cursor-alias transition-transform group-hover:scale-110"
              onMouseDown={createRotationHandler}
              title="Rotate Freely"
            >
              <RotateCw className="w-4 h-4 text-primary"/>
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


const ImageCarouselNode = Node.create({
  name: 'imageCarousel',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      images: {
        default: [],
        parseHTML: element => JSON.parse(element.getAttribute('data-images') || '[]'),
        renderHTML: attributes => ({ 'data-images': JSON.stringify(attributes.images) }),
      },
      width: {
        default: '100%',
        renderHTML: attributes => (attributes.width ? { style: `width: ${attributes.width}` } : {}),
        parseHTML: element => element.style.width || null,
      },
      height: {
        default: null,
        renderHTML: attributes => (attributes.height ? { style: `height: ${attributes.height}` } : {}),
        parseHTML: element => element.style.height || null,
      },
      'data-float': {
        default: 'center',
        renderHTML: attributes => (attributes['data-float'] ? { 'data-float': attributes['data-float'] } : {}),
        parseHTML: element => element.getAttribute('data-float'),
      },
      rotate: {
        default: 0,
        renderHTML: attributes => (attributes.rotate ? { style: `transform: rotate(${attributes.rotate}deg)` } : {}),
        parseHTML: element => {
          const transform = element.style.transform;
          if (transform && transform.includes('rotate')) {
            const match = transform.match(/rotate\(([^deg)]+)deg\)/);
            return match ? parseFloat(match[1]) : 0;
          }
          return 0;
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-image-carousel]' }];
  },

  renderHTML({ HTMLAttributes }) {
    // Combine multiple style properties into a single style string
    const styles: string[] = [];
    if (HTMLAttributes.width) styles.push(`width: ${HTMLAttributes.width}`);
    if (HTMLAttributes.height) styles.push(`height: ${HTMLAttributes.height}`);
    if (HTMLAttributes.rotate) styles.push(`transform: rotate(${HTMLAttributes.rotate}deg)`);

    const finalAttrs = { ...HTMLAttributes };
    if (styles.length) {
      finalAttrs.style = styles.join('; ');
    }
    delete finalAttrs.width;
    delete finalAttrs.height;
    delete finalAttrs.rotate;
    
    return ['div', { ...finalAttrs, 'data-image-carousel': '' }];
  },
  
  addCommands() {
    return {
      setImageCarousel: (options) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageCarouselComponent);
  },
});


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

const CustomModelViewer = Node.create({
  name: 'modelViewer',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      width: {
        default: '640px',
        renderHTML: attributes => ({ style: `width: ${attributes.width};` }),
        parseHTML: element => element.style.width || null,
      },
      height: {
        default: '480px',
        renderHTML: attributes => ({ style: `height: ${attributes.height};` }),
        parseHTML: element => element.style.height || null,
      },
      'data-float': {
        default: 'center',
        renderHTML: attributes => ({ 'data-float': attributes['data-float'] }),
        parseHTML: element => element.getAttribute('data-float'),
      },
      rotate: {
        default: 0,
        renderHTML: attributes => ({ style: `transform: rotate(${attributes.rotate}deg)` }),
        parseHTML: element => {
          const transform = element.style.transform;
          if (transform && transform.includes('rotate')) {
            const match = transform.match(/rotate\(([^deg)]+)deg\)/);
            return match ? parseFloat(match[1]) : 0;
          }
          return 0;
        },
      },
    };
  },
  
  parseHTML() {
    return [{
      tag: 'model-viewer[src]',
    }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['model-viewer', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },
  
  addCommands() {
    return {
      setModelViewer: (options: { src: string }) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(MediaResizeComponent);
  },
});

const CustomIframe = Node.create({
  name: 'iframe',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      frameborder: { default: 0 },
      allowfullscreen: { default: true },
      width: {
        default: '640px',
        renderHTML: attributes => ({ style: `width: ${attributes.width};` }),
        parseHTML: element => element.style.width || null,
      },
      height: {
        default: '480px',
        renderHTML: attributes => ({ style: `height: ${attributes.height};` }),
        parseHTML: element => element.style.height || null,
      },
      'data-float': {
        default: 'center',
        renderHTML: attributes => ({ 'data-float': attributes['data-float'] }),
        parseHTML: element => element.getAttribute('data-float'),
      },
      rotate: {
        default: 0,
        renderHTML: attributes => ({ style: `transform: rotate(${attributes.rotate}deg)` }),
        parseHTML: element => {
          const transform = element.style.transform;
          if (transform && transform.includes('rotate')) {
            const match = transform.match(/rotate\(([^deg)]+)deg\)/);
            return match ? parseFloat(match[1]) : 0;
          }
          return 0;
        },
      },
      class: { default: 'rich-text-media-node' },
    };
  },

  parseHTML() {
    return [{
      tag: 'iframe[src]:not([data-youtube-video])',
    }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['iframe', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },
  
  addCommands() {
    return {
      setIframe: (options: { src: string, width?: string, height?: string }) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(MediaResizeComponent);
  },
});


const Toolbar = ({ editor }: { editor: Editor | null }) => {
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [debouncedUrl, setDebouncedUrl] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
        setDebouncedUrl(url);
    }, 500); // 500ms debounce
    return () => clearTimeout(handler);
  }, [url]);

  if (!editor) {
    return null;
  }

  const getYoutubeEmbedUrl = (ytUrl: string) => {
    const standardRegex = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/;
    const shortRegex = /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/;
    const embedRegex = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/;

    let match = ytUrl.match(standardRegex);
    if (match) return `https://www.youtube-nocookie.com/embed/${match[1]}`;
    match = ytUrl.match(shortRegex);
    if (match) return `https://www.youtube-nocookie.com/embed/${match[1]}`;
    match = ytUrl.match(embedRegex);
    if (match) return `https://www.youtube-nocookie.com/embed/${match[1]}`;
    return null;
  };
  
  const getSketchfabEmbedUrl = (sfUrl: string) => {
      const sketchfabPageRegex = /sketchfab\.com\/3d-models\/(?:[a-z0-9\-_]+-)?([a-fA-F0-9]{32})/;
      const sketchfabEmbedRegex = /sketchfab\.com\/models\/[a-fA-F0-9]{32}\/embed/;
  
      const pageMatch = sfUrl.match(sketchfabPageRegex);
      if (pageMatch) {
        const modelId = pageMatch[1];
        return `https://sketchfab.com/models/${modelId}/embed?autospin=1&autostart=1&ui_theme=dark`;
      }
      
      if (sketchfabEmbedRegex.test(sfUrl)) {
          return sfUrl;
      }
      
      return null;
  };
  
  const handleMediaModalOpen = (type: 'image' | 'video' | 'model') => {
    setUrl('');
    setDebouncedUrl('');
    if (type === 'image') setIsImageModalOpen(true);
    if (type === 'video') setIsVideoModalOpen(true);
    if (type === 'model') setIsModelModalOpen(true);
  };


  const isLinkActive = editor.isActive('link') || (editor.isActive('image') && !!editor.getAttributes('image').href);

  const openLinkModal = () => {
    const isImageActive = editor.isActive('image');
    const previousUrl = isImageActive
      ? editor.getAttributes('image').href
      : editor.getAttributes('link').href;
    setUrl(previousUrl || '');
    setDebouncedUrl(previousUrl || '');
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
    setDebouncedUrl('');
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
    setDebouncedUrl('');
  };

  const addImage = () => {
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
    setIsImageModalOpen(false);
    setUrl('');
    setDebouncedUrl('');
  };

  const addYoutubeVideo = () => {
    if (url) {
      editor.chain().focus().setYoutubeVideo({ src: url }).run();
    }
    setIsVideoModalOpen(false);
    setUrl('');
    setDebouncedUrl('');
  };
  
  const addModelViewer = () => {
    if (!url || !editor) return;
    
    const sketchfabUrl = getSketchfabEmbedUrl(url);

    if (sketchfabUrl) {
      editor.chain().focus().setIframe({ src: sketchfabUrl }).run();
    } else if (url.match(/\.(glb|gltf)$/i)) {
      editor.chain().focus().setModelViewer({ src: url }).run();
    } else {
        // Fallback for other URLs, maybe try iframe? Or show error.
        // For now, let's just insert as a generic iframe.
        editor.chain().focus().setIframe({ src: url }).run();
    }

    setIsModelModalOpen(false);
    setUrl('');
    setDebouncedUrl('');
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
          value={editor.getAttributes('textStyle').textGradient || editor.getAttributes('textStyle').color || '#ffffff'}
          onChange={(value) => {
            const isGradient = value.includes('gradient');
            const { fontFamily, fontSize } = editor.getAttributes('textStyle');

            const newAttrs: { 
              fontFamily?: string;
              fontSize?: string;
              color?: string | null;
              textGradient?: string | null;
            } = {
              fontFamily: fontFamily,
              fontSize: fontSize,
            };

            if (isGradient) {
              newAttrs.color = null;
              newAttrs.textGradient = value;
            } else {
              newAttrs.textGradient = null;
              newAttrs.color = value;
            }
            
            editor.chain().focus().setMark('textStyle', newAttrs).run();
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
                <DropdownMenuItem onClick={() => handleMediaModalOpen('model')}>
                    <Box className="h-4 w-4 mr-2" /> Embed 3D Model
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.isActive('imageCarousel') ? {} : editor.chain().focus().setImageCarousel({ images: [] }).run()}>
                    <GalleryHorizontal className="h-4 w-4 mr-2" /> Embed Image Carousel
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
            {debouncedUrl && <img src={debouncedUrl} alt="Preview" className="rounded-md object-contain max-h-48 w-full border mt-2" />}
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
             {debouncedUrl && getYoutubeEmbedUrl(debouncedUrl) && (
                <iframe
                    className="w-full aspect-video mt-2 rounded-md border"
                    src={getYoutubeEmbedUrl(debouncedUrl)!}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="YouTube video preview"
                ></iframe>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="button" onClick={addYoutubeVideo}>Add Video</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isModelModalOpen} onOpenChange={setIsModelModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Embed 3D Model</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="modelUrl">Model URL (.glb, .gltf, or Sketchfab link)</Label>
            <Input id="modelUrl" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="e.g., https://sketchfab.com/3d-models/..." />
            {debouncedUrl && (() => {
                const sketchfabUrl = getSketchfabEmbedUrl(debouncedUrl);
                if (sketchfabUrl) {
                    return (
                        <iframe
                            className="w-full aspect-video mt-2 rounded-md border"
                            src={sketchfabUrl}
                            allowFullScreen
                            title="Sketchfab preview"
                        ></iframe>
                    );
                }
                if (debouncedUrl.match(/\.(glb|gltf)$/i)) {
                    return (
                        <div className="mt-2 text-center text-sm text-muted-foreground p-4 border rounded-md">
                            <Box className="mx-auto h-8 w-8 mb-2" />
                            3D Model Preview (GLB/GLTF)
                        </div>
                    );
                }
                return null;
            })()}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="button" onClick={addModelViewer}>Add Model</Button>
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
  const [isCarouselModalOpen, setIsCarouselModalOpen] = useState(false);

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
      CustomModelViewer,
      CustomIframe,
      ImageCarouselNode,
      TextAlign.configure({ types: ['paragraph', 'image', 'youtube', 'modelViewer', 'iframe', 'imageCarousel'] }),
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

  const openCarouselEditModal = () => {
    setIsCarouselModalOpen(true);
  };
  
  const handleSaveCarousel = (images: string[]) => {
      if (editor) {
        if(editor.isActive('imageCarousel')) {
          editor.chain().focus().updateAttributes('imageCarousel', { images }).run();
        } else {
          editor.chain().focus().setImageCarousel({ images }).run();
        }
      }
  };


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
              if (['image', 'youtube', 'modelViewer', 'iframe', 'imageCarousel'].includes(node.type.name)) {
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
                value={editor.getAttributes('textStyle').textGradient || editor.getAttributes('textStyle').color || '#ffffff'}
                onChange={(value) => {
                    const isGradient = value.includes('gradient');
                    const { fontFamily, fontSize } = editor.getAttributes('textStyle');
        
                    const newAttrs: { 
                      fontFamily?: string;
                      fontSize?: string;
                      color?: string | null;
                      textGradient?: string | null;
                    } = {
                      fontFamily: fontFamily,
                      fontSize: fontSize,
                    };
        
                    if (isGradient) {
                      newAttrs.color = null;
                      newAttrs.textGradient = value;
                    } else {
                      newAttrs.textGradient = null;
                      newAttrs.color = value;
                    }
                    
                    editor.chain().focus().setMark('textStyle', newAttrs).run();
                }}
            />
        </BubbleMenu>
      )}

      {editor && (
        <BubbleMenu
          editor={editor}
          shouldShow={({ editor }) => editor.isActive('imageCarousel')}
          tippyOptions={{ duration: 100 }}
          className="bg-card p-1 rounded-lg shadow-lg border border-border"
        >
          <Button variant="ghost" size="sm" onClick={openCarouselEditModal}>
            <ImageIcon className="h-4 w-4 mr-2" /> Edit Carousel
          </Button>
        </BubbleMenu>
      )}
      
      <div ref={toolbarRef} className="sticky top-0 bg-card/95 backdrop-blur-sm z-10">
        <Toolbar editor={editor} />
      </div>

      <div className="min-h-[250px] overflow-y-auto overflow-x-hidden px-3 py-2">
        <EditorContent editor={editor} />
      </div>

       <ImageCarouselModal
        isOpen={isCarouselModalOpen}
        onOpenChange={setIsCarouselModalOpen}
        initialImages={editor?.isActive('imageCarousel') ? editor.getAttributes('imageCarousel').images : []}
        onSave={handleSaveCarousel}
      />
    </div>
  );
};
