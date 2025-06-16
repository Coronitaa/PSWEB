
"use client";

import type { TagInGroupConfig, Tag } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TagBadgeProps {
  tag: TagInGroupConfig | Tag;
  className?: string;
}

export function TagBadge({ tag, className }: TagBadgeProps) {
  const baseBgColor = tag.color;
  const baseTextColor = tag.text_color;
  const baseBorderColor = tag.border_color;

  const hoverBgColor = tag.hover_bg_color;
  const hoverTextColor = tag.hover_text_color;
  const hoverBorderColor = tag.hover_border_color;

  // Determine base variant based on whether custom styles are present
  const hasCustomBaseStyles = baseBgColor || baseTextColor || baseBorderColor;
  const baseVariant = hasCustomBaseStyles ? 'outline' : 'secondary';

  const styles: React.CSSProperties = {
    // Base Styles with fallbacks
    '--base-bg-color': baseBgColor || (baseVariant === 'secondary' ? 'hsl(var(--secondary))' : 'transparent'),
    '--base-text-color': baseTextColor || (baseVariant === 'secondary' ? 'hsl(var(--secondary-foreground))' : 'hsl(var(--foreground))'),
    '--base-border-color': baseBorderColor || baseBgColor || (baseVariant === 'secondary' ? 'hsl(var(--secondary))' : 'hsl(var(--border))'),

    // Hover Styles with fallbacks (hover -> base -> default)
    '--hover-bg-color': hoverBgColor || baseBgColor || (baseVariant === 'secondary' ? 'hsl(var(--secondary)/0.8)' : 'hsl(var(--accent)/0.1)'),
    '--hover-text-color': hoverTextColor || baseTextColor || (baseVariant === 'secondary' ? 'hsl(var(--secondary-foreground))' : 'hsl(var(--primary))'),
    '--hover-border-color': hoverBorderColor || baseBorderColor || hoverBgColor || baseBgColor || (baseVariant === 'secondary' ? 'hsl(var(--secondary)/0.8)' : 'hsl(var(--primary))'),
    
    // Icon colors
    '--icon-base-color': baseTextColor || (baseVariant === 'secondary' ? 'hsl(var(--secondary-foreground))' : 'hsl(var(--foreground))'),
    '--icon-hover-color': hoverTextColor || baseTextColor || (baseVariant === 'secondary' ? 'hsl(var(--secondary-foreground))' : 'hsl(var(--primary))'),
  };

  return (
    <Badge
      variant={baseVariant}
      className={cn(
        'text-xs transition-colors duration-150 ease-in-out flex items-center gap-1.5 group/badge border', // Ensure border class is always present
        // Apply base styles using CSS variables
        "bg-[var(--base-bg-color)] text-[var(--base-text-color)] border-[var(--base-border-color)]",
        // Apply hover styles using CSS variables
        "hover:bg-[var(--hover-bg-color)] hover:text-[var(--hover-text-color)] hover:border-[var(--hover-border-color)]",
        className
      )}
      style={styles}
    >
      {tag.icon_svg && (
         <span
          className={cn("inline-block h-3 w-3 shrink-0 text-[var(--icon-base-color)] group-hover/badge:text-[var(--icon-hover-color)] transition-colors duration-150 ease-in-out")}
          style={{
            '--current-icon-color': 'var(--icon-base-color)', // for SVG to inherit if needed
            '--hover-icon-color': 'var(--icon-hover-color)',   // for SVG to inherit on hover if needed
          } as any}
          dangerouslySetInnerHTML={{
            __html: tag.icon_svg
            // If SVGs use currentColor, they will inherit from the parent's text color, which is handled by CSS vars.
            // For more complex SVGs, direct manipulation or specific classes might be needed if they don't use currentColor.
          }}
        />
      )}
      {tag.name}
    </Badge>
  );
}
