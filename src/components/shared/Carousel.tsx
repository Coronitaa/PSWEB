
"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion'; // Asegúrate de que framer-motion esté importado

interface CarouselProps {
  children: React.ReactNode; 
  className?: string;
  autoplay?: boolean;
  autoplayInterval?: number;
  showArrows?: boolean;
  itemsToShow?: number; 
  allowOverflow?: boolean;
}

export function Carousel({ 
  children, 
  className, 
  autoplay = false, 
  autoplayInterval = 5000,
  showArrows = true,
  itemsToShow = 3, 
  allowOverflow = false,
}: CarouselProps) {
  const items = React.Children.toArray(children);
  const [currentIndex, setCurrentIndex] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const numItems = items.length;

  const maxIndex = numItems > itemsToShow ? numItems - itemsToShow : 0;

  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (autoplay && numItems > 1 && numItems > itemsToShow && !allowOverflow) { 
      resetTimeout();
      timeoutRef.current = setTimeout(
        () => setCurrentIndex((prevIndex) => (prevIndex + 1) % (maxIndex + 1)), 
        autoplayInterval
      );
      return () => resetTimeout();
    } else {
      resetTimeout(); 
    }
  }, [currentIndex, autoplay, autoplayInterval, numItems, itemsToShow, resetTimeout, maxIndex, allowOverflow]);

  const goToPrevious = () => {
    if (numItems <= itemsToShow) return;
    setCurrentIndex((prevIndex) => (prevIndex - 1 + (maxIndex + 1)) % (maxIndex + 1));
  };

  const goToNext = () => {
    if (numItems <= itemsToShow) return;
    setCurrentIndex((prevIndex) => (prevIndex + 1) % (maxIndex + 1));
  };
  
  if (numItems === 0) {
    return <div className={cn("text-muted-foreground text-center py-4", className)}>No items to display.</div>;
  }

  const effectiveShowArrows = showArrows && numItems > itemsToShow;
  const showFades = numItems > itemsToShow;

  return (
    <div className={cn("relative group h-full", allowOverflow ? "overflow-visible" : "overflow-hidden", className)}>
      <motion.div 
        className="flex transition-transform duration-700 ease-in-out h-full" // Asegura que el motion.div tenga h-full
        style={{ 
            width: `${(numItems / itemsToShow) * 100}%`, 
            transform: `translateX(-${(currentIndex * (100 / numItems))}%)` 
        }}
      >
        {items.map((item, index) => {
          const isOffScreenForOverflow = allowOverflow && (index < currentIndex || index >= currentIndex + itemsToShow);
          return (
           <div 
              key={index} 
              className={cn(
                "flex-shrink-0 h-full", // Asegura que el div contenedor del item tenga h-full
                "transition-opacity duration-300 ease-in-out" 
              )}
              style={{ 
                width: `${(100 / itemsToShow) / (numItems / itemsToShow)}%`,
                opacity: isOffScreenForOverflow ? 0 : 1,
                pointerEvents: isOffScreenForOverflow ? 'none' : 'auto',
              }} 
            > 
             {item}
           </div>
          );
        })}
      </motion.div>
      {effectiveShowArrows && (
        <>
          <Button
            variant="outline"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-background/70 hover:bg-background/90"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-6 w-6" />
            <span className="sr-only">Previous</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-background/70 hover:bg-background/90"
            onClick={goToNext}
          >
            <ChevronRight className="h-6 w-6" />
            <span className="sr-only">Next</span>
          </Button>
        </>
      )}
      {showFades && !allowOverflow && (
        <>
          <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none opacity-80 group-hover:opacity-60 transition-opacity"></div>
          <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none opacity-80 group-hover:opacity-60 transition-opacity"></div>
        </>
      )}
    </div>
  );
}

interface CarouselItemProps {
  children: React.ReactNode;
  className?: string;
}

export function CarouselItem({ children, className }: CarouselItemProps) {
  return (
    <div className={cn("p-1 h-full relative", className)}> {/* Añadido relative para next/image con fill */}
      {children}
    </div>
  );
}
