
"use client"; 
// This file houses client-side wrappers for server actions
// to inject mock user authentication details if needed.

// Helper to get mock user ID from localStorage
function getMockUserIdFromStorage(): string | undefined {
  if (typeof window === 'undefined') return undefined; // Guard against SSR if ever imported there
  const storedUser = localStorage.getItem('mockUser');
  if (storedUser) {
    try {
      const user: { id?: string } = JSON.parse(storedUser);
      return user.id;
    } catch (e) {
      console.error("Failed to parse mockUser from localStorage in clientWrapper", e);
      return undefined;
    }
  }
  return undefined;
}

// --- Review Action Wrappers ---
import { 
    addReviewAction as serverAddReviewAction,
    updateReviewAction as serverUpdateReviewAction,
    deleteReviewAction as serverDeleteReviewAction,
    updateReviewInteractionAction as serverUpdateReviewInteractionAction,
    getUserSentimentForReviewAction as serverGetUserSentimentForReviewAction
} from './reviewActions';
import type { ReviewFormData, ActionResult, ReviewInteractionCounts, Resource, ProfileUpdateFormData, Author as ProfileAuthor } from '@/lib/types'; // Added Resource, ProfileUpdateFormData, ProfileAuthor

export async function addReview(resourceId: string, data: ReviewFormData): Promise<ActionResult<{ reviewId: string }>> {
  const clientMockUserId = getMockUserIdFromStorage();
  return serverAddReviewAction(resourceId, data, clientMockUserId);
}

export async function updateReview(reviewId: string, data: ReviewFormData): Promise<ActionResult<{ reviewId: string }>> {
  const clientMockUserId = getMockUserIdFromStorage();
  return serverUpdateReviewAction(reviewId, data, clientMockUserId);
}

export async function deleteReview(reviewId: string): Promise<ActionResult> {
  const clientMockUserId = getMockUserIdFromStorage();
  return serverDeleteReviewAction(reviewId, clientMockUserId);
}

export async function updateReviewInteraction(
  reviewId: string,
  interactionType: 'helpful' | 'unhelpful' | 'funny'
): Promise<ActionResult<UpdateReviewInteractionResult>> { // UpdateReviewInteractionResult was missing, added
  const clientMockUserId = getMockUserIdFromStorage();
  return serverUpdateReviewInteractionAction(reviewId, interactionType, clientMockUserId);
}
interface UpdateReviewInteractionResult { // Definition for the above
  updatedCounts: ReviewInteractionCounts;
  currentUserSentiment: 'helpful' | 'unhelpful' | null;
  currentUserIsFunny: boolean;
}

export async function getUserSentimentForReview(
  reviewId: string
): Promise<ActionResult<{ sentiment: 'helpful' | 'unhelpful' | null; isFunny: boolean }>> {
  const clientMockUserId = getMockUserIdFromStorage();
  return serverGetUserSentimentForReviewAction(reviewId, clientMockUserId);
}


// --- Admin Action Wrappers ---
import { 
    saveProjectAction as serverSaveProjectAction,
    deleteProjectAction as serverDeleteProjectAction,
    createSectionTagAction as serverCreateSectionTagAction,
    updateSectionTagAction as serverUpdateSectionTagAction,
    deleteSectionTagAction as serverDeleteSectionTagAction,
    saveCategoryAction as serverSaveCategoryAction,
    deleteCategoryAction as serverDeleteCategoryAction,
    updateCategoryOrderInMemoryAction as serverUpdateCategoryOrderInMemoryAction,
    fetchProjectCategoryTagConfigurationsAction as serverFetchProjectCategoryTagConfigurationsAction,
    saveResourceAction as serverSaveResourceAction,
    // deleteResourceAction is already imported via reviewActions for some reason, let's ensure it's the admin one
    // deleteResourceAction as serverAdminDeleteResourceAction 
} from '@/app/admin/actions'; // Path to admin actions
import { deleteResourceAction as serverAdminDeleteResourceAction } from '@/app/admin/actions'; // Explicit import for admin version

import type { 
    ProjectFormData, GenericListItem, ItemType, Tag, CategoryFormData, Category, 
    ProjectCategoryTagConfigurations, ResourceFormData
} from '@/lib/types';

export async function saveProject(
  projectIdFromForm: string | undefined, 
  data: ProjectFormData,
  isNew: boolean
): Promise<ActionResult<{ project: GenericListItem }>> {
  const clientMockUserId = getMockUserIdFromStorage();
  return serverSaveProjectAction(projectIdFromForm, data, isNew, clientMockUserId);
}

export async function deleteProject(projectId: string): Promise<ActionResult> {
  const clientMockUserId = getMockUserIdFromStorage();
  return serverDeleteProjectAction(projectId, clientMockUserId);
}

export async function createSectionTag(itemType: ItemType, name: string, description?: string): Promise<ActionResult<Tag>> {
    const clientMockUserId = getMockUserIdFromStorage();
    return serverCreateSectionTagAction(itemType, name, description, clientMockUserId);
}

export async function updateSectionTag(tagId: string, newName: string, newDescription?: string): Promise<ActionResult<Tag>> {
    const clientMockUserId = getMockUserIdFromStorage();
    return serverUpdateSectionTagAction(tagId, newName, newDescription, clientMockUserId);
}

export async function deleteSectionTag(tagId: string): Promise<ActionResult> {
    const clientMockUserId = getMockUserIdFromStorage();
    return serverDeleteSectionTagAction(tagId, clientMockUserId);
}

export async function saveCategory(
  categoryId: string | undefined,
  data: CategoryFormData,
  isNew: boolean,
  parentItemTypeFromProps: ItemType
): Promise<ActionResult<{ category: Category }>> {
  const clientMockUserId = getMockUserIdFromStorage();
  return serverSaveCategoryAction(categoryId, data, isNew, parentItemTypeFromProps, clientMockUserId);
}

export async function deleteCategory(categoryId: string, parentItemId: string): Promise<ActionResult> {
  const clientMockUserId = getMockUserIdFromStorage();
  return serverDeleteCategoryAction(categoryId, parentItemId, clientMockUserId);
}

export async function updateCategoryOrderInMemory(itemId: string, orderedCategoryIds: string[]): Promise<ActionResult> {
    const clientMockUserId = getMockUserIdFromStorage();
    return serverUpdateCategoryOrderInMemoryAction(itemId, orderedCategoryIds, clientMockUserId);
}

export async function fetchProjectCategoryTagConfigurations(projectId: string): Promise<ActionResult<ProjectCategoryTagConfigurations>> {
    const clientMockUserId = getMockUserIdFromStorage();
    return serverFetchProjectCategoryTagConfigurationsAction(projectId, clientMockUserId);
}

export async function saveResource(
  resourceIdFromForm: string | undefined, 
  data: ResourceFormData,
  isNewResource: boolean,
  parentItemId: string, 
  categoryId: string,   
  authorIdProp: string | undefined
): Promise<ActionResult<{ resource: Resource }>> {
  const clientMockUserId = getMockUserIdFromStorage();
  return serverSaveResourceAction(resourceIdFromForm, data, isNewResource, parentItemId, categoryId, authorIdProp, clientMockUserId);
}

export async function deleteResource(resourceId: string): Promise<ActionResult> {
  const clientMockUserId = getMockUserIdFromStorage();
  return serverAdminDeleteResourceAction(resourceId, clientMockUserId);
}


// --- Profile Action Wrappers ---
import { updateProfileAction as serverUpdateProfileAction } from './profileActions';

export async function updateProfile(data: ProfileUpdateFormData): Promise<ActionResult<{ profile: ProfileAuthor }>> {
  const clientMockUserId = getMockUserIdFromStorage();
  return serverUpdateProfileAction(data, clientMockUserId);
}

// Note: You'll need to go through your components and update direct calls
// to server actions to use these wrapped versions instead.
// For example, in ReviewCard.tsx, instead of importing `deleteReviewAction` from `../actions/reviewActions`,
// you would import `deleteReview` from `../actions/clientWrappers`.
// This is a larger refactoring task for all action call sites.
