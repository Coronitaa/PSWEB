

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { GenericListItem, ItemType, Tag, TagInGroupConfig } from './types';
import { formatDistanceToNow, differenceInSeconds, format, isValid, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function mapConfigToTagInterface(config: TagInGroupConfig, group: { id: string; groupDisplayName: string }): Tag {
    const groupName = group.groupDisplayName || '';
    const tagName = config.name || '';
    return {
        id: config.id,
        name: config.name,
        slug: groupName.toLowerCase().replace(/\s+/g, '-') + '-' + tagName.toLowerCase().replace(/\s+/g, '-') + '-' + config.id.substring(0,4),
        description: undefined,
        color: config.color,
        text_color: config.text_color,
        border_color: config.border_color,
        hover_bg_color: config.hover_bg_color,
        hover_text_color: config.hover_text_color,
        hover_border_color: config.hover_border_color,
        icon_svg: config.icon_svg,
        type: 'misc', // Default type, can be overridden if group info is available
        groupId: group.id,
        groupName: group.groupDisplayName,
    };
}

export function getItemTypePlural(itemType: ItemType): string {
    if (itemType === 'art-music') return 'art-music';
    if (itemType === 'game') return 'games';
    if (itemType === 'web') return 'web';
    if (itemType === 'app') return 'apps';
    return `${itemType}s`; // Fallback, though should not be hit with defined types
}

export function formatNumberWithSuffix(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return '0';
  if (num === 0) return '0'; // Handle 0 explicitly

  const suffixes = ["", "k", "M", "B", "T", "P", "E"];
  let i = 0;
  let scaledNum = num;

  while (Math.abs(scaledNum) >= 1000 && i < suffixes.length - 1) {
    scaledNum /= 1000;
    i++;
  }

  let numStr: string;

  if (i === 0) { 
    if (Math.abs(scaledNum) > 0 && Math.abs(scaledNum) < 1) {
      numStr = parseFloat(scaledNum.toFixed(2)).toString(); 
    } else {
      const rounded = Math.round(scaledNum * 100) / 100; 
      if (Number.isInteger(rounded) || (!Number.isInteger(rounded) && rounded.toFixed(1).endsWith('.0'))) {
        numStr = Math.trunc(rounded).toString();
      } else if (!Number.isInteger(rounded)) {
        numStr = rounded.toFixed(1); 
      } else {
        numStr = rounded.toString();
      }
    }
  } else { 
    const roundedScaledNum = Math.round(scaledNum * 10) / 10;
    if (Number.isInteger(roundedScaledNum) || roundedScaledNum.toFixed(1).endsWith('.0')) {
      numStr = Math.trunc(roundedScaledNum).toString();
    } else {
      numStr = roundedScaledNum.toFixed(1);
    }
  }

  return numStr + suffixes[i];
}

export const formatTimeAgo = (dateString: string | undefined | null): string => {
  if (!dateString) return 'N/A';

  let processedDateString = dateString;

  // If dateString is "YYYY-MM-DD HH:MM:SS" (typical SQLite CURRENT_TIMESTAMP for UTC)
  // or "YYYY-MM-DD HH:MM:SS.sss"
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,3})?$/.test(dateString)) {
    processedDateString = dateString.replace(' ', 'T') + 'Z';
  }
  // If it's already ISO with T but no Z (less likely from SQLite CURRENT_TIMESTAMP but possible)
  else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?$/.test(dateString) && !dateString.endsWith('Z')) {
     processedDateString = dateString + 'Z';
  }


  try {
    const parsedDate = parseISO(processedDateString); // Use parseISO for better ISO 8601 handling

    if (!isValid(parsedDate)) {
      console.error(`[formatTimeAgo ERROR] Invalid date after processing: "${processedDateString}" from input: "${dateString}"`);
      return "Invalid date";
    }
    
    // Detailed logging
    // console.log(`[formatTimeAgo DEBUG] Input: "${dateString}" -> Processed: "${processedDateString}" -> Parsed (UTC): "${parsedDate.toISOString()}"`);

    if (typeof window !== 'undefined') { // Client-side logic
      const now = new Date();
      const diffSeconds = differenceInSeconds(now, parsedDate); // Positive if parsedDate is in the PAST

      // console.log(`[formatTimeAgo DEBUG] Client Now (UTC): "${now.toISOString()}", diffSeconds (now - parsedDate): ${diffSeconds}`);

      if (diffSeconds < -60) { // More than 1 minute in the future (significant clock skew or error)
        console.warn(`[formatTimeAgo WARN] Date "${processedDateString}" is ${-diffSeconds}s in the future. Check clock sync. Displaying absolute date.`);
        return format(parsedDate, 'MMM d, yyyy HH:mm'); // Fallback for significant future dates
      } else if (Math.abs(diffSeconds) < 60) { // Within +/- 1 minute of now (covers very recent past and minor future skew)
        // console.log("[formatTimeAgo INFO] Date is within +/- 60s, showing 'just now'.");
        return "just now";
      } else { // More than 1 minute in the past
        // console.log("[formatTimeAgo INFO] Date is in the past (>= 60s), using formatDistanceToNow.");
        return formatDistanceToNow(parsedDate, { addSuffix: true });
      }
    } else { // Server-side logic (SSR or build time)
      // console.log("[formatTimeAgo INFO] SSR: Displaying absolute date.");
      return format(parsedDate, 'MMM d, yyyy HH:mm');
    }
  } catch (error: any) {
    console.error(`[formatTimeAgo CATCH_ERROR] Formatting date string "${processedDateString}" (original: "${dateString}"):`, error.message, error.stack);
    return 'Date error';
  }
};

export const calculateGenericItemSearchScore = (item: GenericListItem, query: string): number => {
  if (!query) return 0;
  const lowerQuery = query.toLowerCase();
  let score = 0;

  if (item.name.toLowerCase().includes(lowerQuery)) {
    score += 10;
    if (item.name.toLowerCase().startsWith(lowerQuery)) score += 5;
    if (item.name.toLowerCase() === lowerQuery) score += 10;
  }

  if (item.description && item.description.toLowerCase().includes(lowerQuery)) {
    score += 3;
  }

  if (item.tags) {
    item.tags.forEach(tag => {
      if (tag.name.toLowerCase().includes(lowerQuery)) {
        score += 1; 
      }
    });
  }
  return score;
};


export const parseMediaUrl = (url: string): { type: 'image' | 'video', src: string, videoId: string | null } | null => {
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
