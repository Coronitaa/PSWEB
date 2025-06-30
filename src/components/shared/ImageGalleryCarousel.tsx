
"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, useMotionValue, PanInfo, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X as XIconLucide } from "lucide-react";

const ONE_SECOND = 1000;
const DRAG_BUFFER = 50;

const SPRING_OPTIONS = {
  type: "spring",
  mass: 3,
  stiffness: 400,
  damping: 50,
};

// Helper function to identify media type from URL
const parseMediaUrl = (url: string): { type: 'image' | 'video', src: string, videoId: string | null } | null => {
    if (!url || typeof url !== 'string') return null;

    // YouTube URL patterns
    const youtubeRegexes = [
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
    ];

    for (const regex of youtubeRegexes) {
        const match = url.match(regex);
        if (match && match[1]) {
            return { type: 'video', src: `https://www.youtube-nocookie.com/embed/${match[1]}`, videoId: match[1] };
        }
    }

    const imageRegex = /(\.(jpeg|jpg|gif|png|webp|svg)$)|(^data:image)/i;
    if (imageRegex.test(url)) {
        return { type: 'image', src: url, videoId: null };
    }
    
    if (url.startsWith('http')) {
        return { type: 'image', src: url, videoId: null };
    }

    return null;
};


interface ImageGalleryCarouselProps {
  images: string[];
  className?: string;
  autoplayInterval?: number;
  aspectRatio?: string;
}

export const ImageGalleryCarousel: React.FC<ImageGalleryCarouselProps> = ({ 
  images, 
  className,
  autoplayInterval = 5000,
  aspectRatio = '16/9'
}) => {
  const [imgIndex, setImgIndex] = useState(0);
  const dragX = useMotionValue(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const numImages = images.length;
  const isAutoplayDisabled = autoplayInterval === 999999999;

  useEffect(() => {
    if (imgIndex >= numImages) {
      setImgIndex(0);
    }
  }, [numImages, imgIndex]);

  const startAutoPlay = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!isAutoplayDisabled && numImages > 1 && !lightboxOpen) {
      intervalRef.current = setInterval(() => {
        const x = dragX.get();
        if (x === 0) {
          setImgIndex((prevIndex) => (prevIndex + 1) % numImages);
        }
      }, autoplayInterval);
    }
  };

  useEffect(() => {
    startAutoPlay();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [dragX, numImages, lightboxOpen, autoplayInterval, isAutoplayDisabled]); 

  const onDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const x = info.offset.x;
    if (numImages <= 1) return;

    if (x <= -DRAG_BUFFER) {
      setImgIndex((prevIndex) => (prevIndex + 1) % numImages);
    } else if (x >= DRAG_BUFFER) {
      setImgIndex((prevIndex) => (prevIndex - 1 + numImages) % numImages);
    }
    startAutoPlay();
  };

  const openLightbox = (index: number) => {
    setSelectedImageIndex(index);
    setLightboxOpen(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    startAutoPlay();
  };

  const goToNextImage = () => {
    setSelectedImageIndex((prevIndex) => (prevIndex + 1) % numImages);
  };

  const goToPrevImage = () => {
    setSelectedImageIndex((prevIndex) => (prevIndex - 1 + numImages) % numImages);
  };
  
  if (numImages === 0) {
    return (
      <div className={cn("relative aspect-video w-full bg-muted rounded-lg flex items-center justify-center", className)}>
        <p className="text-muted-foreground text-xs">No images to preview.</p>
      </div>
    );
  }

  return (
    <>
      <div className={cn(
        "relative overflow-hidden bg-card/50 w-full rounded-lg shadow-inner group",
        {
          'aspect-[16/9]': aspectRatio === '16/9',
          'aspect-[4/3]': aspectRatio === '4/3',
          'aspect-square': aspectRatio === '1/1',
        },
        className
      )}>
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          style={{ x: dragX }}
          animate={{ translateX: `-${imgIndex * 100}%` }}
          transition={SPRING_OPTIONS}
          onDragEnd={onDragEnd}
          className="flex items-center h-full cursor-grab active:cursor-grabbing"
        >
          {images.map((imgSrc, idx) => {
            const media = parseMediaUrl(imgSrc);

            return (
              <motion.div
                key={`${idx}-${imgSrc}`}
                onClick={() => openLightbox(idx)}
                animate={{ scale: imgIndex === idx ? 1 : 0.95 }}
                transition={SPRING_OPTIONS}
                className="relative aspect-video w-full shrink-0 object-cover h-full cursor-pointer bg-black"
              >
                {!media ? (
                  <div className="w-full h-full flex items-center justify-center text-destructive-foreground bg-destructive/50 text-xs p-2">Invalid URL</div>
                ) : media.type === 'video' && media.videoId ? (
                  <iframe
                    src={`${media.src}?autoplay=1&mute=1&controls=0&loop=1&playlist=${media.videoId}&rel=0&iv_load_policy=3`}
                    className="w-full h-full block object-cover pointer-events-none"
                    frameBorder="0"
                    allow="autoplay; encrypted-media;"
                    title={`Gallery video ${idx + 1}`}
                  />
                ) : (
                  <Image 
                    src={media.src} 
                    alt={`Gallery image ${idx + 1}`} 
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                    fill
                    style={{objectFit: "cover"}}
                    className="rounded-md"
                    priority={idx === 0}
                    data-ai-hint="gallery showcase image"
                  />
                )}
              </motion.div>
            )
          })}
        </motion.div>
        
        {numImages > 1 && <Dots imgIndex={imgIndex} setImgIndex={setImgIndex} numImages={numImages} />}
        <GradientEdges />
      </div>

      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            id="lightbox-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 sm:p-10"
            onClick={closeLightbox} 
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
              className="absolute top-4 right-4 z-[102] p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors focus:outline-none"
              aria-label="Close lightbox"
            >
              <XIconLucide size={28} />
            </button>

            {numImages > 1 && (
                <>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); goToPrevImage(); }}
                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-[101] p-2 sm:p-3 rounded-full bg-black/30 text-white hover:bg-black/50 transition-all focus:outline-none opacity-70 hover:opacity-100"
                    aria-label="Previous image"
                >
                    <ChevronLeft size={32} />
                </button>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); goToNextImage(); }}
                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-[101] p-2 sm:p-3 rounded-full bg-black/30 text-white hover:bg-black/50 transition-all focus:outline-none opacity-70 hover:opacity-100"
                    aria-label="Next image"
                >
                    <ChevronRight size={32} />
                </button>
                </>
            )}
            
            <motion.div
              key={selectedImageIndex}
              initial={{ opacity: 0.8, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()} 
            >
              {(() => {
                    const media = parseMediaUrl(images[selectedImageIndex]);
                    if (!media) return <div className="text-white">Invalid Media URL</div>;

                    if (media.type === 'video') {
                        return (
                           <div className="relative w-full h-full max-w-4xl aspect-video bg-black rounded-lg">
                                <iframe
                                    src={`${media.src}?autoplay=1&rel=0`}
                                    className="w-full h-full"
                                    frameBorder="0"
                                    allow="autoplay; encrypted-media; picture-in-picture"
                                    allowFullScreen
                                    title={`Enlarged video ${selectedImageIndex + 1}`}
                                />
                           </div>
                        );
                    } else {
                        return (
                            <Image
                                src={media.src}
                                alt={`Enlarged image ${selectedImageIndex + 1}`}
                                fill
                                style={{ objectFit: "contain" }}
                                className="rounded-lg shadow-2xl"
                                priority 
                                onDragStart={(e) => e.preventDefault()}
                            />
                        );
                    }
                })()}
            </motion.div>
            {numImages > 1 && (
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/50 text-white text-sm z-[101]">
                {selectedImageIndex + 1} / {numImages}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

interface DotsProps {
  imgIndex: number;
  setImgIndex: React.Dispatch<React.SetStateAction<number>>;
  numImages: number;
}

const Dots: React.FC<DotsProps> = ({ imgIndex, setImgIndex, numImages }) => {
  return (
    <div className="absolute bottom-4 left-0 right-0 z-10 flex w-full justify-center gap-2">
      {Array.from({ length: numImages }).map((_, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => setImgIndex(idx)}
          className={cn(
            "h-2.5 w-2.5 rounded-full transition-colors",
            idx === imgIndex ? "bg-primary" : "bg-muted-foreground/50 hover:bg-muted-foreground/70"
          )}
          aria-label={`Go to image ${idx + 1}`}
        />
      ))}
    </div>
  );
};

const GradientEdges: React.FC = () => {
  return (
    <>
      <div className="pointer-events-none absolute bottom-0 left-0 top-0 w-[10vw] max-w-[80px] bg-gradient-to-r from-card/60 via-card/20 to-transparent z-0" />
      <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-[10vw] max-w-[80px] bg-gradient-to-l from-card/60 via-card/20 to-transparent z-0" />
    </>
  );
};

export default ImageGalleryCarousel;
