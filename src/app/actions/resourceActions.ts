

'use server';

import { revalidatePath } from 'next/cache';
import { getResources, getBestMatchForCategoryAction as getBestMatchForCategoryFromLib, getResourceBySlug as getResourceBySlugFromLib, incrementResourceDownloadCount, incrementResourceFileDownloadCount, getAuthorPublishedResources } from '@/lib/data';
import type { GetResourcesParams, PaginatedResourcesResponse, Resource, ItemType } from '@/lib/types';
import { getDb } from '@/lib/db'; // Import getDb to fetch resource details for revalidation
import { getItemTypePlural } from '@/lib/utils';


export async function fetchPaginatedResourcesAction(
  params: GetResourcesParams
): Promise<PaginatedResourcesResponse> {
  // Ensure page and limit are numbers and have defaults
  const page = typeof params.page === 'number' ? params.page : 1;
  const limit = typeof params.limit === 'number' ? params.limit : 20; // Default limit to 20
  
  // The searchQuery from params should not be trimmed here, respect client's input
  const result = await getResources({ ...params, page, limit });
  return result;
}

export async function fetchBestMatchForCategoryAction(
  parentItemSlug: string, // Renamed for clarity and consistency
  parentItemType: ItemType, // Added parentItemType
  categorySlug: string,
  searchQuery: string, 
  limit: number = 3
): Promise<Resource[]> {
  // Call the correctly imported and aliased function from lib/data
  return getBestMatchForCategoryFromLib(parentItemSlug, parentItemType, categorySlug, searchQuery, limit);
}

export async function fetchResourceBySlugAction(slug: string): Promise<Resource | undefined> {
  return getResourceBySlugFromLib(slug);
}

export async function incrementResourceDownloadCountAction(resourceId: string, fileId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const resourceSuccess = await incrementResourceDownloadCount(resourceId);
    let fileSuccess = true;
    if (fileId) {
      fileSuccess = await incrementResourceFileDownloadCount(fileId);
    }

    if (resourceSuccess && fileSuccess) {
      // Fetch the resource's slug and parent details using its ID for revalidation
      const db = await getDb();
      const resourceInfo = await db.get(
        "SELECT r.slug, r.parent_item_id, r.category_id, i.slug as item_slug, i.item_type as parent_item_type, c.slug as category_slug " +
        "FROM resources r " +
        "JOIN items i ON r.parent_item_id = i.id " +
        "JOIN categories c ON r.category_id = c.id " +
        "WHERE r.id = ?",
        resourceId
      );

      if (resourceInfo) {
         const itemTypePlural = getItemTypePlural(resourceInfo.parent_item_type);
         const resourcePath = `/${itemTypePlural}/${resourceInfo.item_slug}/${resourceInfo.category_slug}/${resourceInfo.slug}`;
         revalidatePath(resourcePath);

         const categoryPath = `/${itemTypePlural}/${resourceInfo.item_slug}/${resourceInfo.category_slug}`;
         revalidatePath(categoryPath);

         const parentItemPath = `/${itemTypePlural}/${resourceInfo.item_slug}`;
         revalidatePath(parentItemPath);
      } else {
        // Fallback revalidation if resource details couldn't be fetched by ID
        console.warn(`[incrementResourceDownloadCountAction] Could not find resource with ID ${resourceId} for specific revalidation.`);
      }
      return { success: true };
    } else {
      let errorMsg = 'Failed to update download counts in DB.';
      if (!resourceSuccess) errorMsg += ' (Resource count failed)';
      if (fileId && !fileSuccess) errorMsg += ' (File count failed)';
      return { success: false, error: errorMsg };
    }
  } catch (e: any) {
    console.error("[incrementResourceDownloadCountAction ACTION] Error:", e);
    return { success: false, error: e.message || "An unknown error occurred during download count increment." };
  }
}

export async function fetchPaginatedAuthorResourcesAction(
  params: {
    userId: string;
    itemType?: ItemType;
    parentItemId?: string;
    categoryId?: string;
    searchQuery?: string;
    page?: number;
    limit?: number;
    sortBy?: 'relevance' | 'updated_at' | 'created_at' | 'downloads' | 'rating' | 'name';
  }
): Promise<PaginatedResourcesResponse> {
  const result = await getAuthorPublishedResources(params.userId, {
    itemType: params.itemType,
    parentItemId: params.parentItemId,
    categoryId: params.categoryId,
    searchQuery: params.searchQuery,
    page: params.page,
    limit: params.limit,
    sortBy: params.sortBy,
    order: params.sortBy === 'name' ? 'ASC' : 'DESC', // Sort by name ascending, others descending
  });
  return result;
}
