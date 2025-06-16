
'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import type { ReviewFormData, UserAppRole, ReviewInteractionCounts, Review } from '@/lib/types';
import { USER_APP_ROLES_CONST } from '@/lib/types';

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


async function verifyUserAndGetId(): Promise<{ userId: string; role: UserAppRole } | { error: string, errorCode: ActionResult['errorCode'] }> {
  let determinedRole: UserAppRole = 'usuario';
  let mockUserId: string | undefined;

  // 1. Attempt to get user details from 'mockUser' cookie
  try {
    const cookieStore = cookies();
    const storedUserJson = cookieStore.get('mockUser')?.value;

    if (storedUserJson) {
      const storedUser = JSON.parse(storedUserJson) as { id?: string; role?: UserAppRole };
      if (storedUser.id) { // Crucially check if ID exists in the parsed cookie
        mockUserId = storedUser.id;
        if (storedUser.role && USER_APP_ROLES_CONST.includes(storedUser.role)) {
          determinedRole = storedUser.role;
        } else {
          determinedRole = 'usuario'; // Default role if not specified or invalid in cookie
        }
        // If we found a valid ID from the cookie, we're good. Return immediately.
        return { userId: mockUserId, role: determinedRole };
      }
    }
  } catch (e) {
    // console.warn("[verifyUserAndGetId REVIEW_ACTION] Error parsing 'mockUser' cookie:", e);
    // Continue to ENV fallback if cookie parsing failed or ID was missing
  }

  // 2. Fallback to MOCK_ROLE environment variable if cookie didn't yield a user ID
  const roleFromEnv = process.env.MOCK_ROLE as UserAppRole | undefined;
  if (roleFromEnv && USER_APP_ROLES_CONST.includes(roleFromEnv)) {
    determinedRole = roleFromEnv;
    if (determinedRole === 'admin') mockUserId = 'mock-admin-id';
    else if (determinedRole === 'mod') mockUserId = 'mock-mod-id';
    else if (determinedRole === 'usuario') mockUserId = 'mock-user-id';
    // Add more mock user IDs if needed for other roles via ENV

    if (mockUserId) { // If ENV var yielded a user ID
      return { userId: mockUserId, role: determinedRole };
    }
  }
  
  // 3. If neither cookie nor ENV var provided a user ID
  return { error: "User not authenticated. Mock user ID is missing.", errorCode: 'AUTH_REQUIRED' };
}


export async function addReviewAction(
  resourceId: string,
  data: ReviewFormData
): Promise<ActionResult<{ reviewId: string }>> {
  const authCheck = await verifyUserAndGetId();
  if ('error'in authCheck) {
    return { success: false, error: authCheck.error, errorCode: authCheck.errorCode };
  }
  const { userId } = authCheck;

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
    
    const resourceInfo = await db.get('SELECT slug FROM resources WHERE id = ?', resourceId);
    if (resourceInfo?.slug) {
        revalidatePath(`/resources/${resourceInfo.slug}`);
    } else {
        revalidatePath('/resources', 'layout'); 
    }
    return { success: true, data: { reviewId } };
  } catch (error: any) {
    console.error("[addReviewAction DB_ERROR]", error);
    return { success: false, error: "Failed to add review due to a database error.", errorCode: 'DB_ERROR' };
  }
}

export async function updateReviewAction(
  reviewId: string,
  data: ReviewFormData
): Promise<ActionResult<{ reviewId: string }>> {
  const authCheck = await verifyUserAndGetId();
  if ('error' in authCheck) {
    return { success: false, error: authCheck.error, errorCode: authCheck.errorCode };
  }
  const { userId } = authCheck;

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
    
    const resourceInfo = await db.get('SELECT slug FROM resources WHERE id = ?', resourceId);
    if (resourceInfo?.slug) {
        revalidatePath(`/resources/${resourceInfo.slug}`);
    } else {
        revalidatePath('/resources', 'layout'); 
    }
    return { success: true, data: { reviewId } };
  } catch (error: any) {
    console.error("[updateReviewAction DB_ERROR]", error);
    return { success: false, error: "Failed to update review due to a database error.", errorCode: 'DB_ERROR' };
  }
}

export async function deleteReviewAction(reviewId: string): Promise<ActionResult> {
  const authCheck = await verifyUserAndGetId();
  if ('error' in authCheck) {
    return { success: false, error: authCheck.error, errorCode: authCheck.errorCode };
  }
  const { userId } = authCheck;

  const db = await getDb();
  try {
    const reviewToDelete = await db.get('SELECT id, resource_id, author_id FROM reviews WHERE id = ?', reviewId);
    if (!reviewToDelete) {
      return { success: false, error: "Review not found.", errorCode: 'NOT_FOUND' };
    }
    if (reviewToDelete.author_id !== userId) {
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
    
    const resourceInfo = await db.get('SELECT slug FROM resources WHERE id = ?', resourceId);
    if (resourceInfo?.slug) {
        revalidatePath(`/resources/${resourceInfo.slug}`);
    } else {
        revalidatePath('/resources', 'layout'); 
    }
    return { success: true };
  } catch (error: any) {
    await db.exec('ROLLBACK');
    console.error("[deleteReviewAction DB_ERROR]", error);
    return { success: false, error: "Failed to delete review due to a database error.", errorCode: 'DB_ERROR' };
  }
}


export async function updateReviewInteractionAction(
  reviewId: string,
  interactionType: 'helpful' | 'unhelpful' | 'funny'
): Promise<ActionResult<UpdateReviewInteractionResult>> {
  const authCheck = await verifyUserAndGetId();
  if ('error'in authCheck) {
    return { success: false, error: authCheck.error, errorCode: authCheck.errorCode, data: undefined };
  }
  const { userId } = authCheck;
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

    const resourceInfo = await db.get('SELECT slug FROM resources r JOIN reviews rev ON r.id = rev.resource_id WHERE rev.id = ?', reviewId);
    if (resourceInfo?.slug) {
      revalidatePath(`/resources/${resourceInfo.slug}`);
    } else {
      revalidatePath('/resources', 'layout');
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
  reviewId: string
): Promise<ActionResult<{ sentiment: 'helpful' | 'unhelpful' | null; isFunny: boolean }>> {
  const authCheck = await verifyUserAndGetId();
  if ('error'in authCheck) {
    return { success: false, error: authCheck.error, errorCode: authCheck.errorCode };
  }
  const { userId } = authCheck;
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

