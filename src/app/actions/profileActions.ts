
'use server';

import { revalidatePath } from 'next/cache';
import { updateUserProfile } from '@/lib/data';
import type { ProfileUpdateFormData, Author } from '@/lib/types';

interface ActionResult<T = null> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: 'PERMISSION_DENIED' | 'DB_ERROR' | 'UNKNOWN_ERROR' | 'AUTH_REQUIRED' | 'NOT_FOUND';
}

// This action is designed to be called by a user to update their OWN profile.
export async function updateProfileAction(
  data: ProfileUpdateFormData,
  clientMockUserId?: string
): Promise<ActionResult<{ profile: Author }>> {
  if (!clientMockUserId) {
    return { success: false, error: "Authentication required.", errorCode: 'AUTH_REQUIRED' };
  }

  try {
    const updatedProfile = await updateUserProfile(clientMockUserId, data);
    if (!updatedProfile) {
      return { success: false, error: "Failed to update profile or retrieve updated data.", errorCode: 'DB_ERROR' };
    }
    
    // Revalidate the user's profile page
    if (updatedProfile.usertag) {
        const usertag = updatedProfile.usertag.startsWith('@') ? updatedProfile.usertag.substring(1) : updatedProfile.usertag;
        revalidatePath(`/users/${usertag}`);
        revalidatePath(`/users/${usertag}/resources`);
    }

    return { success: true, data: { profile: updatedProfile } };
  } catch (e: any) {
    console.error("[updateProfileAction ACTION] Error:", e);
    return { success: false, error: e.message || "An unknown error occurred during profile update.", errorCode: 'UNKNOWN_ERROR' };
  }
}
