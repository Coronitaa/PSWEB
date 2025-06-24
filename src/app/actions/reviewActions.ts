
'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db';
import type { ReviewFormData, UserAppRole, ReviewInteractionCounts, Review } from '@/lib/types';
import { USER_APP_ROLES_CONST } from '@/lib/types';
import { getItemTypePlural } from '@/lib/utils';

interface ActionResult<T = null> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: 'AUTH_REQUIRED' | 'NOT_AUTHOR' | 'ALREADY_REVIEWED' | 'DB_ERROR' | 'VALIDATION_ERROR' | 'UNKNOWN_ERROR' | 'NOT_FOUND' | 'FORBIDDEN';
}

interface UpdateReviewInteractionResult {
  updatedCounts: ReviewInteractionCounts;
  currentUserSentiment: 'helpful' | 'unhelpful' | null;
  currentUserIsFunny: boolean;
}

async function verifyUserAndGetId(
  clientProvidedUserId?: string
): Promise<{ userId: string; role: UserAppRole } | { error: string, errorCode: ActionResult['errorCode'] }> {
  
  if (clientProvidedUserId) {
    let role: UserAppRole = 'usuario';
    if (clientProvidedUserId === 'mock-admin-id') role = 'admin';
    else if (clientProvidedUserId === 'mock-mod-id') role = 'mod';
    
    // Validate if the provided ID corresponds to a known mock user ID structure
    if (!['mock-admin-id', 'mock-mod-id', 'mock-user-id'].includes(clientProvidedUserId)) {
        // console.warn(`[reviewActions] verifyUserAndGetId received an unrecognized clientProvidedUserId: ${clientProvidedUserId}. Defaulting to 'usuario'.`);
        // To be safe, if ID isn't recognized, default to least privileged or treat as unauthenticated.
        // For this mock system, let's default to 'mock-user-id' and 'usuario' role if ID is unknown.
        return { userId: 'mock-user-id', role: 'usuario' };
    }
    return { userId: clientProvidedUserId, role };
  }

  // Fallback to MOCK_ROLE from environment if no client ID is provided
  // console.warn(`[reviewActions] verifyUserAndGetId: No clientProvidedUserId. Falling back to MOCK_USER_ROLE environment variable.`);
  const roleFromEnv = process.env.MOCK_USER_ROLE as UserAppRole | undefined; // Ensure this env var name is consistent
  const determinedRole = (roleFromEnv && USER_APP_ROLES_CONST.includes(roleFromEnv)) ? roleFromEnv : 'usuario'; // Default to 'usuario'
  
  let mockUserId = 'mock-user-id'; 
  if (determinedRole === 'admin') mockUserId = 'mock-admin-id';
  else if (determinedRole === 'mod') mockUserId = 'mock-mod-id';
  
  return { userId: mockUserId, role: determinedRole };
}

async function revalidateResourcePaths(resourceId: string) {
    const db = await getDb();
    const resourceInfo = await db.get(`
        SELECT r.slug, i.slug as item_slug, i.item_type as parent_item_type, c.slug as category_slug
        FROM resources r
        JOIN items i ON r.parent_item_id = i.id
        JOIN categories c ON r.category_id = c.id
        WHERE r.id = ?
    `, resourceId);

    if (resourceInfo) {
        const itemTypePlural = getItemTypePlural(resourceInfo.parent_item_type);
        const resourcePath = `/${itemTypePlural}/${resourceInfo.item_slug}/${resourceInfo.category_slug}/${resourceInfo.slug}`;
        revalidatePath(resourcePath);
    }
}


export async function addReviewAction(
  resourceId: string,
  data: ReviewFormData,
  clientMockUserId?: string 
): Promise<ActionResult<{ reviewId: string }>> {
  const authDetails = await verifyUserAndGetId(clientMockUserId);
  if ('error' in authDetails) { // Should not happen with current simplified logic, but good practice
    return { success: false, error: authDetails.error, errorCode: authDetails.errorCode };
  }
  const { userId } = authDetails;

  const db = await getDb();

  try {
    const resource = await db.get('SELECT author_id FROM resources WHERE id = ?', resourceId);
    if (!resource) {
      return { success: false, error: "Resource not found.", errorCode: 'DB_ERROR' };
    }
    
    if (resource.author_id === userId) {
      return { success: false, error: "You cannot review your own resource.", errorCode: 'NOT_AUTHOR' };
    }

    const existingReview = await db.get('SELECT id FROM reviews WHERE resource_id = ? AND author_id = ?', resourceId, userId);
    if (existingReview) {
      return { success: false, error: "You have already reviewed this resource. You can edit your existing review.", errorCode: 'ALREADY_REVIEWED' };
    }

    const reviewId = 'rev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    const initialInteractionCounts = JSON.stringify({ helpful: 0, unhelpful: 0, funny: 0 });

    await db.run(
      'INSERT INTO reviews (id, resource_id, author_id, resource_version, is_recommended, comment, interaction_counts, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      reviewId, resourceId, userId, data.resourceVersion, data.isRecommended, data.comment, initialInteractionCounts
    );

    const reviewsForResource = await db.all('SELECT is_recommended FROM reviews WHERE resource_id = ?', resourceId);
    const reviewCount = reviewsForResource.length;
    let positiveReviews = 0;
    reviewsForResource.forEach(rev => { if (rev.is_recommended) positiveReviews++; });
    
    let derivedAvgRating = null;
    let positiveReviewPercentage = null;
    if (reviewCount > 0) {
      positiveReviewPercentage = (positiveReviews / reviewCount) * 100;
      derivedAvgRating = (positiveReviewPercentage / 100) * 5;
    }

    await db.run(
      'UPDATE resources SET rating = ?, review_count = ?, positive_review_percentage = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      derivedAvgRating, reviewCount, positiveReviewPercentage, resourceId
    );
    
    await revalidateResourcePaths(resourceId);
    return { success: true, data: { reviewId } };
  } catch (error: any) {
    console.error("[addReviewAction DB_ERROR]", error);
    return { success: false, error: "Failed to add review due to a database error.", errorCode: 'DB_ERROR' };
  }
}

export async function updateReviewAction(
  reviewId: string,
  data: ReviewFormData,
  clientMockUserId?: string
): Promise<ActionResult<{ reviewId: string }>> {
  const authDetails = await verifyUserAndGetId(clientMockUserId);
  if ('error' in authDetails) {
    return { success: false, error: authDetails.error, errorCode: authDetails.errorCode };
  }
  const { userId } = authDetails;

  const db = await getDb();
  try {
    const reviewToUpdate = await db.get('SELECT id, resource_id, author_id FROM reviews WHERE id = ?', reviewId);
    if (!reviewToUpdate) {
      return { success: false, error: "Review not found.", errorCode: 'NOT_FOUND' };
    }
    if (reviewToUpdate.author_id !== userId) {
      return { success: false, error: "You are not authorized to edit this review.", errorCode: 'FORBIDDEN' };
    }

    await db.run(
      'UPDATE reviews SET resource_version = ?, is_recommended = ?, comment = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      data.resourceVersion, data.isRecommended, data.comment, reviewId
    );

    const resourceId = reviewToUpdate.resource_id;
    const reviewsForResource = await db.all('SELECT is_recommended FROM reviews WHERE resource_id = ?', resourceId);
    const reviewCount = reviewsForResource.length;
    let positiveReviews = 0;
    reviewsForResource.forEach(rev => { if (rev.is_recommended) positiveReviews++; });
    
    let derivedAvgRating = null;
    let positiveReviewPercentage = null;
    if (reviewCount > 0) {
      positiveReviewPercentage = (positiveReviews / reviewCount) * 100;
      derivedAvgRating = (positiveReviewPercentage / 100) * 5;
    }

    await db.run(
      'UPDATE resources SET rating = ?, review_count = ?, positive_review_percentage = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      derivedAvgRating, reviewCount, positiveReviewPercentage, resourceId
    );
    
    await revalidateResourcePaths(resourceId);
    return { success: true, data: { reviewId } };
  } catch (error: any) {
    console.error("[updateReviewAction DB_ERROR]", error);
    return { success: false, error: "Failed to update review due to a database error.", errorCode: 'DB_ERROR' };
  }
}

export async function deleteReviewAction(reviewId: string, clientMockUserId?: string): Promise<ActionResult> {
  const authDetails = await verifyUserAndGetId(clientMockUserId);
  if ('error' in authDetails) {
    return { success: false, error: authDetails.error, errorCode: authDetails.errorCode };
  }
  const { userId, role } = authDetails; // Get role here

  const db = await getDb();
  try {
    const reviewToDelete = await db.get('SELECT id, resource_id, author_id FROM reviews WHERE id = ?', reviewId);
    if (!reviewToDelete) {
      return { success: false, error: "Review not found.", errorCode: 'NOT_FOUND' };
    }

    const isAuthor = reviewToDelete.author_id === userId;
    const isAdminOrMod = role === 'admin' || role === 'mod';

    if (!isAuthor && !isAdminOrMod) { // Check if user is author OR admin/mod
      return { success: false, error: "You are not authorized to delete this review.", errorCode: 'FORBIDDEN' };
    }

    await db.exec('BEGIN TRANSACTION');
    await db.run('DELETE FROM user_review_sentiments WHERE review_id = ?', reviewId);
    await db.run('DELETE FROM reviews WHERE id = ?', reviewId);
    await db.exec('COMMIT');
    
    const resourceId = reviewToDelete.resource_id;
    const reviewsForResource = await db.all('SELECT is_recommended FROM reviews WHERE resource_id = ?', resourceId);
    const reviewCount = reviewsForResource.length;
    let positiveReviews = 0;
    reviewsForResource.forEach(rev => { if (rev.is_recommended) positiveReviews++; });
    
    let derivedAvgRating = null;
    let positiveReviewPercentage = null;
    if (reviewCount > 0) {
      positiveReviewPercentage = (positiveReviews / reviewCount) * 100;
      derivedAvgRating = (positiveReviewPercentage / 100) * 5;
    } else { 
        derivedAvgRating = null;
        positiveReviewPercentage = null;
    }

    await db.run(
      'UPDATE resources SET rating = ?, review_count = ?, positive_review_percentage = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      derivedAvgRating, reviewCount, positiveReviewPercentage, resourceId
    );
    
    await revalidateResourcePaths(resourceId);
    return { success: true };
  } catch (error: any) {
    await db.exec('ROLLBACK');
    console.error("[deleteReviewAction DB_ERROR]", error);
    return { success: false, error: "Failed to delete review due to a database error.", errorCode: 'DB_ERROR' };
  }
}


export async function updateReviewInteractionAction(
  reviewId: string,
  interactionType: 'helpful' | 'unhelpful' | 'funny',
  clientMockUserId?: string
): Promise<ActionResult<UpdateReviewInteractionResult>> {
  const authDetails = await verifyUserAndGetId(clientMockUserId);
   if ('error' in authDetails) {
    return { success: false, error: authDetails.error, errorCode: authDetails.errorCode };
  }
  const { userId } = authDetails;
  
  const db = await getDb();

  try {
    await db.exec('BEGIN TRANSACTION');

    let existingSentiment = await db.get(
      'SELECT sentiment, is_funny FROM user_review_sentiments WHERE user_id = ? AND review_id = ?',
      userId, reviewId
    );

    let newSentimentForUser: 'helpful' | 'unhelpful' | null = existingSentiment?.sentiment || null;
    let newIsFunnyForUser: boolean = existingSentiment?.is_funny || false;

    if (interactionType === 'helpful') {
      newSentimentForUser = newSentimentForUser === 'helpful' ? null : 'helpful';
    } else if (interactionType === 'unhelpful') {
      newSentimentForUser = newSentimentForUser === 'unhelpful' ? null : 'unhelpful';
    } else if (interactionType === 'funny') {
      newIsFunnyForUser = !newIsFunnyForUser;
    }

    if (newSentimentForUser !== null || newIsFunnyForUser) {
      await db.run(
        'INSERT OR REPLACE INTO user_review_sentiments (user_id, review_id, sentiment, is_funny, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
        userId, reviewId, newSentimentForUser, newIsFunnyForUser
      );
    } else {
      await db.run('DELETE FROM user_review_sentiments WHERE user_id = ? AND review_id = ?', userId, reviewId);
    }

    const helpfulCountResult = await db.get("SELECT COUNT(*) as count FROM user_review_sentiments WHERE review_id = ? AND sentiment = 'helpful'", reviewId);
    const unhelpfulCountResult = await db.get("SELECT COUNT(*) as count FROM user_review_sentiments WHERE review_id = ? AND sentiment = 'unhelpful'", reviewId);
    const funnyCountResult = await db.get("SELECT COUNT(*) as count FROM user_review_sentiments WHERE review_id = ? AND is_funny = TRUE", reviewId);

    const updatedCounts: ReviewInteractionCounts = {
      helpful: helpfulCountResult?.count || 0,
      unhelpful: unhelpfulCountResult?.count || 0,
      funny: funnyCountResult?.count || 0,
    };

    await db.run(
      'UPDATE reviews SET interaction_counts = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      JSON.stringify(updatedCounts),
      reviewId
    );

    await db.exec('COMMIT');

    const review = await db.get('SELECT resource_id FROM reviews WHERE id = ?', reviewId);
    if (review?.resource_id) {
        await revalidateResourcePaths(review.resource_id);
    }

    return { 
      success: true, 
      data: { 
        updatedCounts, 
        currentUserSentiment: newSentimentForUser, 
        currentUserIsFunny: newIsFunnyForUser 
      } 
    };

  } catch (error: any) {
    await db.exec('ROLLBACK');
    console.error(`[updateReviewInteractionAction DB_ERROR] Review ID: ${reviewId}, Type: ${interactionType}, User: ${userId}`, error);
    return { success: false, error: "Failed to update review interaction due to a database error.", errorCode: 'DB_ERROR', data: undefined };
  }
}

export async function getUserSentimentForReviewAction(
  reviewId: string,
  clientMockUserId?: string
): Promise<ActionResult<{ sentiment: 'helpful' | 'unhelpful' | null; isFunny: boolean }>> {
  if (!clientMockUserId) {
      // If no client-provided ID, assume anonymous user for this specific read-only action
      return { success: true, data: { sentiment: null, isFunny: false } };
  }
  const authDetails = await verifyUserAndGetId(clientMockUserId);
   if ('error' in authDetails) { 
    // This path should ideally not be hit if clientMockUserId is provided,
    // but if verifyUserAndGetId fails for some reason with a provided ID.
    return { success: false, error: authDetails.error, errorCode: authDetails.errorCode };
  }
  const { userId } = authDetails;
  
  const db = await getDb();

  try {
    const sentimentRecord = await db.get(
      'SELECT sentiment, is_funny FROM user_review_sentiments WHERE user_id = ? AND review_id = ?',
      userId, reviewId
    );

    if (sentimentRecord) {
      return {
        success: true,
        data: {
          sentiment: sentimentRecord.sentiment as 'helpful' | 'unhelpful' | null,
          isFunny: Boolean(sentimentRecord.is_funny),
        }
      };
    } else {
      return { success: true, data: { sentiment: null, isFunny: false } };
    }
  } catch (error: any) {
    console.error(`[getUserSentimentForReviewAction DB_ERROR] Review ID: ${reviewId}, User: ${userId}`, error);
    return { success: false, error: "Failed to fetch user sentiment due to a database error.", errorCode: 'DB_ERROR' };
  }
}
