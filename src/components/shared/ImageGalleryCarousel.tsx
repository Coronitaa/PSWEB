
"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, useMotionValue, PanInfo, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X as XIconLucide } from "lucide-react";

const ONE_SECOND = 1000;
const AUTO_DELAY = ONE_SECOND * 5;
const DRAG_BUFFER = 50;

const SPRING_OPTIONS = {
  type: "spring",
  mass: 3,
  stiffness: 400,
  damping: 50,
};

interface ImageGalleryCarouselProps {
  images: string[];
  className?: string;
}

export const ImageGalleryCarousel: React.FC<ImageGalleryCarouselProps> = ({ images, className }) => {
  const [imgIndex, setImgIndex] = useState(0);
  const dragX = useMotionValue(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const numImages = images.length;

  useEffect(() => {
    // Reset index if it's out of bounds after images array changes
    if (imgIndex >= numImages) {
      setImgIndex(0);
    }
  }, [numImages, imgIndex]);

  const startAutoPlay = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (numImages > 1 && !lightboxOpen) {
      intervalRef.current = setInterval(() => {
        const x = dragX.get();
        if (x === 0) {
          setImgIndex((prevIndex) => (prevIndex + 1) % numImages);
        }
      }, AUTO_DELAY);
    }
  };

  useEffect(() => {
    startAutoPlay();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragX, numImages, lightboxOpen]); // Added numImages to deps for correctness

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
      <div className={cn("relative overflow-hidden bg-card/50 w-full aspect-[16/9] rounded-lg shadow-inner group", className)}>
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          style={{ x: dragX }}
          animate={{ translateX: `-${imgIndex * 100}%` }}
          transition={SPRING_OPTIONS}
          onDragEnd={onDragEnd}
          className="flex items-center h-full cursor-grab active:cursor-grabbing"
        >
          {images.map((imgSrc, idx) => (
            <motion.div
              key={`${idx}-${imgSrc}`}
              onClick={() => openLightbox(idx)}
              animate={{ scale: imgIndex === idx ? 1 : 0.95 }} // This scale is for the main carousel items
              transition={SPRING_OPTIONS}
              className="relative aspect-video w-full shrink-0 object-cover h-full cursor-pointer"
            >
              <Image 
                src={imgSrc} 
                alt={`Gallery image ${idx + 1}`} 
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                fill
                style={{objectFit: "cover"}}
                className="rounded-md"
                priority={idx === 0}
                data-ai-hint="gallery showcase image"
              />
            </motion.div>
          ))}
        </motion.div>
        
        <div className="absolute bottom-0 left-0 right-0 h-10 z-10">
            {numImages > 1 && <Dots imgIndex={imgIndex} setImgIndex={setImgIndex} numImages={numImages} />}
            <GradientEdges />
        </div>
      </div>

      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            id="lightbox-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-10" // Increased padding
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
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-[101] p-3 rounded-full bg-black/30 text-white hover:bg-black/50 transition-all focus:outline-none opacity-70 hover:opacity-100"
                    aria-label="Previous image"
                >
                    <ChevronLeft size={32} />
                </button>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); goToNextImage(); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-[101] p-3 rounded-full bg-black/30 text-white hover:bg-black/50 transition-all focus:outline-none opacity-70 hover:opacity-100"
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
              <Image
                src={images[selectedImageIndex]}
                alt={`Enlarged image ${selectedImageIndex + 1}`}
                fill
                style={{ objectFit: "contain" }}
                className="rounded-lg shadow-2xl"
                priority 
                onDragStart={(e) => e.preventDefault()}
              />
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
