
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { GenericListItem, ItemType } from './types';
import { formatDistanceToNow, differenceInSeconds, format, isValid, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
