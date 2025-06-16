
"use client";
import React, { useRef } from "react";
import { cn } from "@/lib/utils";

interface GlareHoverProps {
  children?: React.ReactNode;
  glareColor?: string;
  glareOpacity?: number;
  glareAngle?: number;
  glareSize?: number;
  transitionDuration?: number;
  playOnce?: boolean;
  className?: string; // Applied to the wrapper div
  style?: React.CSSProperties; // Applied to the wrapper div
  borderRadius?: string; 
}

const GlareHover: React.FC<GlareHoverProps> = ({
  children,
  glareColor = "#ffffff", // Reverted to white default
  glareOpacity = 0.1, 
  glareAngle = -45,
  glareSize = 300, 
  transitionDuration = 500, 
  playOnce = false,
  className = "",
  style = {},
  borderRadius = "var(--radius)", 
}) => {
  const hex = glareColor.replace("#", "");
  let rgba = glareColor;
  if (/^[\dA-Fa-f]{6}$/.test(hex)) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    rgba = `rgba(${r}, ${g}, ${b}, ${glareOpacity})`;
  } else if (/^[\dA-Fa-f]{3}$/.test(hex)) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    rgba = `rgba(${r}, ${g}, ${b}, ${glareOpacity})`;
  }

  const overlayRef = useRef<HTMLDivElement | null>(null);

  const animateIn = () => {
    const el = overlayRef.current;
    if (!el) return;

    el.style.transition = "none";
    el.style.backgroundPosition = "-110% -110%, 0 0"; 
    el.offsetHeight; 
    el.style.transition = `${transitionDuration}ms ease-out`; 
    el.style.backgroundPosition = "110% 110%, 0 0"; 
  };

  const animateOut = () => {
    const el = overlayRef.current;
    if (!el) return;

    if (playOnce && el.style.backgroundPosition === "110% 110%, 0 0") {
      return;
    }
    el.style.transition = `${transitionDuration}ms ease-in`; 
    el.style.backgroundPosition = "-110% -110%, 0 0";
  };
  
  const handleMouseEnter = () => {
    if (playOnce && overlayRef.current?.dataset.playedOnce === 'true') return;
    animateIn();
    if (playOnce && overlayRef.current) {
      overlayRef.current.dataset.playedOnce = 'true';
    }
  };


  const overlayStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    borderRadius: borderRadius, 
    background: `linear-gradient(${glareAngle}deg,
        hsla(0,0%,0%,0) 40%, 
        ${rgba} 50%,
        hsla(0,0%,0%,0) 60%)`,
    backgroundSize: `${glareSize}% ${glareSize}%, 100% 100%`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "-110% -110%, 0 0",
    pointerEvents: "none",
    zIndex: 1, 
  };

  return (
    <div
      className={cn("relative h-full w-full group/glare", className)} 
      style={style} 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={animateOut}
    >
      {children}
      <div ref={overlayRef} style={overlayStyle} />
    </div>
  );
};

export default GlareHover;
