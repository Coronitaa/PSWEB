
import Link from 'next/link';
import React from 'react'; // Ensure React is imported for React.cloneElement
import { Gamepad2, Code, TabletSmartphone, Music } from 'lucide-react';
import GlareHover from '@/components/effects/GlareHover'; 
import { cn } from '@/lib/utils';

export default function NewHomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] py-10 sm:py-16"> {/* Adjusted padding and min-height */}
      <div className="text-center mb-12 sm:mb-16">
        <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl lg:text-6xl drop-shadow-lg">
          Welcome to <span className="animate-pulse">PinkStar</span>!
        </h1>
        <p className="mt-4 text-lg leading-7 text-foreground/80 max-w-xl mx-auto sm:text-xl sm:leading-8">
          Your central hub for discovering amazing games, web creations, innovative apps, and inspiring art & music.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 w-full max-w-xs sm:max-w-2xl lg:max-w-4xl">
        <SectionLink href="/games" icon={<Gamepad2 />} title="Games" description="Explore a universe of games and mods." />
        <SectionLink href="/web" icon={<Code />} title="Web" description="Discover creative web projects and tools." />
        <SectionLink href="/apps" icon={<TabletSmartphone />} title="Apps" description="Find innovative applications for all platforms." />
        <SectionLink href="/art-music" icon={<Music />} title="Art & Music" description="Immerse yourself in stunning visuals and sounds." />
      </div>
    </div>
  );
}

interface SectionLinkProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function SectionLink({ href, icon, title, description }: SectionLinkProps) {
  return (
    <Link href={href} className="block group h-full">
      <GlareHover 
        borderRadius="var(--radius)" 
        className={cn(
          "rounded-lg h-full group/glare", 
          "transition-all duration-300 ease-in-out",
          "hover:transform hover:-translate-y-1" // Transform on GlareHover
        )}
      >
        <div className={cn(
            "p-6 bg-card/80 backdrop-blur-sm shadow-xl border-border/30 flex flex-col items-center text-center h-full rounded-lg",
            "group-hover/glare:border-primary/50 group-hover/glare:shadow-primary/40" // Border and shadow on internal div
        )}>
          <div className="text-primary mb-3 group-hover/glare:text-accent transition-colors">{React.cloneElement(icon as React.ReactElement, { className: "w-10 h-10 sm:w-12 sm:h-12" })}</div>
          <h3 className="text-xl font-semibold mb-1.5 text-foreground group-hover/glare:text-primary transition-colors sm:text-2xl">{title}</h3>
          <p className="text-xs text-muted-foreground sm:text-sm">{description}</p>
        </div>
      </GlareHover>
    </Link>
  );
}
