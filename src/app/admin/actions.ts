
"use server";

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import {
    addProjectToDb,
    updateProjectInDb,
    deleteProjectFromDb,
    addCategoryToDb,
    updateCategoryInDb,
    deleteCategoryFromDb,
    updateCategoryOrderInDb,
    getItemBySlugGeneric,
    getProjectCategoryTagConfigurations as getProjectCategoryTagConfigurationsFromDb,
    getResourceForEdit,
    // Section Tag specific imports
    createSectionTagDefinition,
    updateSectionTagDefinition,
    deleteSectionTagDefinition,
} from '@/lib/data';
import type { ProjectFormData, CategoryFormData, GenericListItem, Category, ItemType, UserAppRole, CategoryTagGroupConfig, ProjectCategoryTagConfigurations, ResourceFormData, Resource, ResourceFileFormData, SectionTagFormData, Tag } from '@/lib/types';
import { ITEM_TYPES_CONST, PROJECT_STATUSES_CONST, USER_APP_ROLES_CONST } from '@/lib/types';
import { getDb } from '@/lib/db';
import { generateSlugLocal } from '@/lib/data'; 

interface ActionResult<T = null> {
  success: boolean;
  data?: T;
  error?: string;
}

const TAG_CONFIG_SEPARATOR = ":::CONFIG_JSON:::";


const combineDescriptionAndConfig = (textDescription: string | null | undefined, config: CategoryTagGroupConfig[] | null | undefined): string | null => {
  const descPart = textDescription || "";
  if (!config || config.length === 0) {
    return descPart === "" ? null : descPart;
  }
  try {
    const configJson = JSON.stringify(config);
    if (descPart === "" && configJson === "[]") {
        return null;
    }
    // console.log("[combineDescriptionAndConfig ACTION] Combined desc:", descPart + TAG_CONFIG_SEPARATOR + configJson);
    const combined = descPart + TAG_CONFIG_SEPARATOR + configJson;
    return combined;
  } catch (e) {
    console.error("[combineDescriptionAndConfig ACTION] Failed to stringify tag config JSON:", e);
    return descPart === "" ? null : descPart; // Return only text part on error
  }
};


async function verifyPermission(allowedRoles: UserAppRole[]): Promise<{ user: { id: string; role: UserAppRole }; profile: { role: UserAppRole } } | { error: string }> {
  let determinedRole: UserAppRole = 'usuario';
  let mockUserId: string | undefined;

  const cookieStore = cookies();
  const mockUserCookie = cookieStore.get('mockUser');

  if (mockUserCookie && typeof mockUserCookie.value === 'string' && mockUserCookie.value.trim() !== '') {
    try {
      const storedUser = JSON.parse(mockUserCookie.value) as { id?: string; role?: UserAppRole; name?: string; usertag?: string };
      
      if (storedUser && typeof storedUser.id === 'string' && storedUser.id.trim() !== '') {
        mockUserId = storedUser.id.trim();
        determinedRole = (storedUser.role && USER_APP_ROLES_CONST.includes(storedUser.role)) ? storedUser.role : 'usuario';
        
        if (allowedRoles.includes(determinedRole)) {
          return {
            user: { id: mockUserId, role: determinedRole },
            profile: { role: determinedRole }
          };
        } else {
          const errorMsg = `MOCK AUTH (Cookie): Permission denied. Role '${determinedRole}' not in allowed: ${allowedRoles.join(' or ')}.`;
          // console.warn(errorMsg);
          return { error: errorMsg };
        }
      } else {
        // console.warn("[ServerAction Admin Cookie Auth] Cookie 'mockUser' parsed, but 'id' is missing or invalid.", storedUser);
      }
    } catch (e) {
      // console.warn("[ServerAction Admin Cookie Auth] Error parsing 'mockUser' cookie. Value:", mockUserCookie.value, "Error:", e);
    }
  } else {
    // console.log("[ServerAction Admin Cookie Auth] 'mockUser' cookie not found or has no value.");
  }

  // Fallback to MOCK_ROLE environment variable
  const roleFromEnv = process.env.MOCK_ROLE as UserAppRole | undefined;
  if (roleFromEnv && USER_APP_ROLES_CONST.includes(roleFromEnv)) {
    determinedRole = roleFromEnv;
    if (determinedRole === 'admin') mockUserId = 'mock-admin-id';
    else if (determinedRole === 'mod') mockUserId = 'mock-mod-id';
    else mockUserId = 'mock-user-id';

    if (mockUserId) {
      if (allowedRoles.includes(determinedRole)) {
        return {
          user: { id: mockUserId, role: determinedRole },
          profile: { role: determinedRole }
        };
      } else {
        const errorMsg = `MOCK AUTH (ENV): Permission denied. Role '${determinedRole}' not in allowed: ${allowedRoles.join(' or ')}.`;
        // console.warn(errorMsg);
        return { error: errorMsg };
      }
    }
  }
  
  const errorMsg = `MOCK AUTH: Permission denied. No valid user session found meeting criteria: ${allowedRoles.join(' or ')}.`;
  // console.error(errorMsg);
  return { error: errorMsg };
}


export async function saveProjectAction(
  projectIdFromForm: string | undefined, // This is the ID of the project if it's an update
  data: ProjectFormData,
  isNew: boolean
): Promise<ActionResult<{ project: GenericListItem }>> {
  const authCheck = await verifyPermission(['admin', 'mod']);
  if ('error' in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    let project: GenericListItem | undefined;

    if (isNew) {
      // addProjectToDb now handles projectData.tagIds internally
      project = await addProjectToDb(data); 
    } else if (projectIdFromForm) {
      // updateProjectInDb now handles projectData.tagIds internally
      project = await updateProjectInDb(projectIdFromForm, data); 
    }

    if (project) {
      revalidatePath('/admin/projects');
      revalidatePath('/admin/projects/' + project.itemType + '/' + project.slug + '/edit');
      if (project.itemType) {
        const basePath = project.itemType === 'art-music' ? 'art-music' : project.itemType + 's';
        revalidatePath('/' + basePath); 
        revalidatePath('/' + basePath + '/' + project.slug); 
      }
      return { success: true, data: { project } };
    } else {
      return { success: false, error: "Project operation failed to return a project." };
    }
  } catch (e: any) {
    console.error("[saveProjectAction ACTION] Error:", e);
    return { success: false, error: e.message || "An unknown error occurred during project save." };
  }
}

export async function deleteProjectAction(projectId: string): Promise<ActionResult> {
    const authCheck = await verifyPermission(['admin']);
    if ('error' in authCheck) {
      return { success: false, error: authCheck.error };
    }

    try {
        const success = await deleteProjectFromDb(projectId); // This now also handles deleting from project_section_tags
        if (success) {
            revalidatePath('/admin/projects');
            // Revalidate all main section listing pages as a project of any type could be deleted
            ITEM_TYPES_CONST.forEach(type => {
                const basePath = type === 'art-music' ? 'art-music' : type + 's';
                revalidatePath('/' + basePath);
            });
            return { success: true };
        } else {
            return { success: false, error: "Failed to delete project from DB (no rows affected or other issue)." };
        }
    } catch (e: any) {
        console.error("[deleteProjectAction ACTION] Error:", e);
        return { success: false, error: e.message || "An unknown error occurred during project deletion." };
    }
}

// --- Section Tag CRUD Actions ---
export async function createSectionTagAction(itemType: ItemType, name: string, description?: string): Promise<ActionResult<Tag>> {
  const authCheck = await verifyPermission(['admin', 'mod']);
  if ('error' in authCheck) {
    return { success: false, error: authCheck.error };
  }
  try {
    const newTag = await createSectionTagDefinition(itemType, name, description);
    revalidatePath('/admin/projects/' + itemType + '/.*/edit'); // Revalidate all edit pages for this item type
    return { success: true, data: newTag };
  } catch (e: any) {
    console.error("[createSectionTagAction ACTION] Error:", e);
    return { success: false, error: e.message || "Failed to create section tag." };
  }
}

export async function updateSectionTagAction(tagId: string, newName: string, newDescription?: string): Promise<ActionResult<Tag>> {
  const authCheck = await verifyPermission(['admin', 'mod']);
  if ('error' in authCheck) {
    return { success: false, error: authCheck.error };
  }
  try {
    const updatedTag = await updateSectionTagDefinition(tagId, newName, newDescription);
    if (!updatedTag) {
        return { success: false, error: "Tag not found or failed to update." };
    }
    // Need to revalidate all project edit pages that might use this tag's itemType
    // This is a bit broad, but necessary if slugs change or names are displayed.
    revalidatePath('/admin/projects/' + updatedTag.type + '/.*/edit', 'page');
    return { success: true, data: updatedTag };
  } catch (e: any) {
    console.error("[updateSectionTagAction ACTION] Error:", e);
    return { success: false, error: e.message || "Failed to update section tag." };
  }
}

export async function deleteSectionTagAction(tagId: string): Promise<ActionResult> {
  const authCheck = await verifyPermission(['admin', 'mod']);
  if ('error' in authCheck) {
    return { success: false, error: authCheck.error };
  }
  try {
    // We need the itemType of the tag to revalidate paths correctly.
    const db = await getDb();
    const tagData = await db.get("SELECT item_type FROM section_tags WHERE id = ?", tagId);
    
    const success = await deleteSectionTagDefinition(tagId);
    if (success) {
      if (tagData?.item_type) {
        revalidatePath('/admin/projects/' + tagData.item_type + '/.*/edit', 'page');
      } else {
        // Broad revalidation if item_type couldn't be determined before deletion
        ITEM_TYPES_CONST.forEach(type => revalidatePath('/admin/projects/' + type + '/.*/edit', 'page'));
      }
      return { success: true };
    } else {
      return { success: false, error: "Failed to delete section tag." };
    }
  } catch (e: any) {
    console.error("[deleteSectionTagAction ACTION] Error:", e);
    return { success: false, error: e.message || "Failed to delete section tag." };
  }
}


// --- Category Actions ---
export async function saveCategoryAction(
  categoryId: string | undefined,
  data: CategoryFormData,
  isNew: boolean,
  parentItemTypeFromProps: ItemType // Added to help with revalidation path construction
): Promise<ActionResult<{ category: Category }>> {
  const authCheck = await verifyPermission(['admin', 'mod']);
  if ('error' in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    // Combine text description and JSON config for DB storage
    const rawDescriptionForDb = combineDescriptionAndConfig(data.description, data.tagGroupConfigs);

    const dbData = {
        ...data,
        description: rawDescriptionForDb, // This is the combined string
    };

    let savedOrUpdatedCategory: Category | undefined;
    if (isNew) {
      savedOrUpdatedCategory = await addCategoryToDb(data.parentItemId, dbData as CategoryFormData & { description: string | null });
    } else if (categoryId) {
       // Ensure that for updates, if only text or only config changes, it's handled.
       // The `combineDescriptionAndConfig` will produce the correct combined string.
       savedOrUpdatedCategory = await updateCategoryInDb(categoryId, dbData as Partial<CategoryFormData> & { description?: string | null });
    }

    if (savedOrUpdatedCategory && savedOrUpdatedCategory.parentItemId) {
      // Revalidation logic
      const db = await getDb();
      const parentItemRow = await db.get("SELECT slug FROM items WHERE id = ? AND item_type = ?", savedOrUpdatedCategory.parentItemId, parentItemTypeFromProps) as { slug: string; } | undefined;

      if (parentItemRow && parentItemRow.slug) {
        const parentBasePath = parentItemTypeFromProps === 'art-music' ? 'art-music' : parentItemTypeFromProps + 's';
        
        revalidatePath('/admin/projects/' + parentItemTypeFromProps + '/' + parentItemRow.slug + '/edit');
        revalidatePath('/' + parentBasePath + '/' + parentItemRow.slug);
        revalidatePath('/' + parentBasePath + '/' + parentItemRow.slug + '/' + savedOrUpdatedCategory.slug);
        revalidatePath('/resources', 'layout'); // Broad revalidation for resources due to potential tag changes
        revalidatePath('/' + parentBasePath); // Revalidate item listing page

      } else {
        console.error("[saveCategoryAction SERVER] CRITICAL REVALIDATION FAILURE: Could not fetch parent item (ID: " + savedOrUpdatedCategory.parentItemId + ", Type: " + parentItemTypeFromProps + ") for revalidation on category save.");
      }
      return { success: true, data: { category: savedOrUpdatedCategory } };
    } else {
      return { success: false, error: savedOrUpdatedCategory ? "Category data incomplete after operation." : "Category operation failed to return category data." };
    }
  } catch (e: any) {
    console.error("[saveCategoryAction SERVER] Error:", e.message, e.stack);
    return { success: false, error: e.message || "An unknown error occurred during category save." };
  }
}

export async function deleteCategoryAction(categoryId: string, parentItemId: string): Promise<ActionResult> {
  const authCheck = await verifyPermission(['admin', 'mod']);
  if ('error' in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    const success = await deleteCategoryFromDb(categoryId);
    if (success) {
        // Revalidate paths
        const db = await getDb();
        const parentItemRow = await db.get("SELECT slug, item_type FROM items WHERE id = ?", parentItemId) as { slug: string; item_type: ItemType } | undefined;
        if (parentItemRow && parentItemRow.slug) {
            const parentBasePath = parentItemRow.item_type === 'art-music' ? 'art-music' : parentItemRow.item_type + 's';
            revalidatePath('/admin/projects/' + parentItemRow.item_type + '/' + parentItemRow.slug + '/edit');
            revalidatePath('/' + parentBasePath + '/' + parentItemRow.slug);
            revalidatePath('/' + parentBasePath); // Revalidate item listing page
        } else {
            console.error("[deleteCategoryAction ACTION] Could not fetch parent item for revalidation on category delete:", parentItemId);
        }
      return { success: true };
    } else {
      return { success: false, error: "Failed to delete category from DB (no rows affected or other issue)." };
    }
  } catch (e: any)
{
    console.error("[deleteCategoryAction ACTION] Error:", e);
    return { success: false, error: e.message || "An unknown error occurred during category deletion." };
  }
}

export async function updateCategoryOrderInMemoryAction(itemId: string, orderedCategoryIds: string[]): Promise<ActionResult> {
    const authCheck = await verifyPermission(['admin', 'mod']);
    if ('error' in authCheck) {
      return { success: false, error: authCheck.error };
    }
    try {
        const success = await updateCategoryOrderInDb(itemId, orderedCategoryIds);
        if (success) {
            // Revalidate paths
            const db = await getDb();
            const parentItemRow = await db.get("SELECT slug, item_type FROM items WHERE id = ?", itemId) as { slug: string; item_type: ItemType } | undefined;
             if (parentItemRow && parentItemRow.slug) {
                const parentBasePath = parentItemRow.item_type === 'art-music' ? 'art-music' : parentItemRow.item_type + 's';
                revalidatePath('/admin/projects/' + parentItemRow.item_type + '/' + parentItemRow.slug + '/edit');
                revalidatePath('/' + parentBasePath + '/' + parentItemRow.slug);
                revalidatePath('/' + parentBasePath); // Revalidate item listing page
            } else {
                console.error("[updateCategoryOrderInMemoryAction ACTION] Could not fetch parent item for revalidation on category order update:", itemId);
            }
            return { success: true };
        } else {
            return { success: false, error: "Failed to update category order in DB." };
        }
    } catch (e: any) {
        console.error("[updateCategoryOrderInMemoryAction ACTION] Error:", e);
        return { success: false, error: e.message || "An unknown error occurred while updating category order." };
    }
}

export async function fetchProjectCategoryTagConfigurationsAction(projectId: string): Promise<ActionResult<ProjectCategoryTagConfigurations>> {
  const authCheck = await verifyPermission(['admin', 'mod']);
  if ('error' in authCheck) {
    return { success: false, error: authCheck.error };
  }
  try {
    const configs = await getProjectCategoryTagConfigurationsFromDb(projectId);
    return { success: true, data: configs };
  } catch (e: any) {
    console.error("[fetchProjectCategoryTagConfigurationsAction ACTION] Error:", e);
    return { success: false, error: e.message || "Failed to fetch project category tag configurations." };
  }
}

// --- Resource Actions ---
export async function saveResourceAction(
  resourceIdFromForm: string | undefined, 
  data: ResourceFormData,
  isNewResource: boolean,
  parentItemId: string, // ID of the parent item (game, web, etc.)
  categoryId: string,   // ID of the category this resource belongs to
  authorIdProp: string | undefined // This might be from initialData.authorId if editing, or current user if new
): Promise<ActionResult<{ resource: Resource }>> {
  const authCheck = await verifyPermission(['usuario', 'mod', 'admin']); // Allow 'usuario' to create/edit their own
  if ('error' in authCheck) {
    return { success: false, error: authCheck.error };
  }
  const userRole = authCheck.profile.role;
  const determinedAuthorId = authCheck.user.id; // ID of the currently authenticated user from verifyPermission
  const db = await getDb();

  let resourceId = resourceIdFromForm;
  let resourceSlug = data.slug?.trim() || '';
  
  // This will be the timestamp for the overall save operation.
  const overallOperationTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  let finalResourceVersion = data.version; // Initialize with version from form

  try {
    await db.exec('BEGIN TRANSACTION');

    // --- Handle Resource Files ---
    const submittedFileIds = new Set(data.files.map(f => f.id).filter(id => id));
    const existingDbFilesResult = resourceIdFromForm ? await db.all("SELECT id, name, url, version_name, size, channel_id, selected_file_tags_json, created_at, updated_at FROM resource_files WHERE resource_id = ?", resourceIdFromForm) : [];
    const existingDbFilesMap = new Map(existingDbFilesResult.map(f => [f.id, f]));
    
    // Delete files not present in the submission (only if editing existing resource)
    if (!isNewResource && resourceId) {
        for (const existingFile of existingDbFilesResult) {
          if (!submittedFileIds.has(existingFile.id)) {
            await db.run("DELETE FROM changelog_entries WHERE resource_file_id = ?", existingFile.id);
            await db.run("DELETE FROM resource_files WHERE id = ?", existingFile.id);
          }
        }
    }

    // Add or Update files, and determine if resource version needs update
    for (const fileData of data.files) {
      const fileId = fileData.id || 'rfile_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
      const fileTagsJson = JSON.stringify(fileData.selectedFileTags || {});
      const fileCreationTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

      const isNewFileForThisSubmission = !fileData.id || !existingDbFilesMap.has(fileData.id);

      if (isNewFileForThisSubmission && (!fileData.channelId || fileData.channelId === 'release') && fileData.versionName) {
        finalResourceVersion = fileData.versionName; // Update resource version candidate
      }

      if (fileData.id && existingDbFilesMap.has(fileData.id)) { // Update existing file
        const currentDbFile = existingDbFilesMap.get(fileData.id);
        if (!currentDbFile) {
            console.warn(`[saveResourceAction] Submitted file with ID ${fileData.id} not found in DB for resource ${resourceId}. Skipping update for this file.`);
            continue;
        }
        await db.run(
          "UPDATE resource_files SET name = ?, url = ?, version_name = ?, size = ?, channel_id = ?, selected_file_tags_json = ? WHERE id = ? AND resource_id = ?",
          fileData.name, fileData.url, fileData.versionName, fileData.size || null, fileData.channelId || null, fileTagsJson, fileData.id, resourceId // Use resourceId here for clarity
        );
      } else { // Add new file (make sure resourceId is defined before this branch)
        if (!resourceId && isNewResource) { // If new resource, resourceId is generated first
            // This case is handled before the loop for new resources.
        } else if (!resourceId && !isNewResource) {
            throw new Error("Trying to add new file to an existing resource but resourceId is undefined.");
        }

        await db.run(
          "INSERT INTO resource_files (id, resource_id, name, url, version_name, size, channel_id, selected_file_tags_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          fileId, resourceId, fileData.name, fileData.url, fileData.versionName, fileData.size || null, fileData.channelId || null, fileTagsJson, 
          fileCreationTimestamp, 
          fileCreationTimestamp  
        );
      }
      
      const changelogDate = new Date().toISOString().split('T')[0]; 
      if (fileData.changelogNotes && fileData.changelogNotes.trim() !== '') {
        const existingChangelog = await db.get("SELECT id FROM changelog_entries WHERE resource_file_id = ?", fileId);
        if (existingChangelog) {
          await db.run(
            "UPDATE changelog_entries SET version_name = ?, notes = ?, date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            fileData.versionName, fileData.changelogNotes, changelogDate, existingChangelog.id
          );
        } else {
          const changelogId = 'clog_' + fileId.substring(6) + '_' + Date.now().toString(36);
          await db.run(
            "INSERT INTO changelog_entries (id, resource_id, resource_file_id, version_name, date, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
            changelogId, resourceId, fileId, fileData.versionName, changelogDate, fileData.changelogNotes
          );
        }
      } else {
        await db.run("DELETE FROM changelog_entries WHERE resource_file_id = ?", fileId);
      }
    }

    // --- Handle Main Resource Record ---
    if (isNewResource) {
      if (!resourceSlug) {
        resourceSlug = await generateSlugLocal(data.name, 'resources', { parent_item_id: parentItemId, category_id: categoryId });
      }
      resourceId = 'res_' + resourceSlug.replace(/-/g, '_') + '_' + Date.now().toString(36); 
      
      // If resourceId was generated here, need to re-iterate files if any were to be associated with *this new* resource ID
      // This is complex. Simpler: resourceId MUST be stable before file loop.
      // Let's ensure resourceId is generated *before* the file loop for new resources.
      // Moved file loop to after resourceId is known.
      // For a new resource, finalResourceVersion determined by new files will be used here.

      await db.run(
        'INSERT INTO resources (id, name, slug, parent_item_id, category_id, author_id, version, description, detailed_description, image_url, image_gallery, links, requirements, status, selected_dynamic_tags_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        resourceId, data.name, resourceSlug, parentItemId, categoryId, determinedAuthorId, finalResourceVersion, data.description,
        data.detailedDescription || null, data.imageUrl || null, JSON.stringify(data.imageGallery || []),
        data.links ? JSON.stringify(data.links) : null, data.requirements || null, 
        (userRole === 'admin' || userRole === 'mod') ? data.status : 'published', 
        data.selectedDynamicTags ? JSON.stringify(data.selectedDynamicTags) : null,
        overallOperationTimestamp, 
        overallOperationTimestamp 
      );
    } else if (resourceId) { 
      const currentResource = await db.get("SELECT * FROM resources WHERE id = ?", resourceId);
      if (!currentResource) throw new Error("Resource not found for update.");

      if (userRole !== 'admin' && userRole !== 'mod' && currentResource.author_id !== determinedAuthorId) {
        await db.exec('ROLLBACK');
        return { success: false, error: "Permission denied: You are not the author or an administrator." };
      }

      if (data.slug && data.slug.trim() !== '' && data.slug.trim() !== currentResource.slug) {
        resourceSlug = await generateSlugLocal(data.slug.trim(), 'resources', { parent_item_id: parentItemId, category_id: categoryId });
      } else if (data.name && data.name !== currentResource.name && (!data.slug || data.slug.trim() === '')) {
        resourceSlug = await generateSlugLocal(data.name, 'resources', { parent_item_id: parentItemId, category_id: categoryId });
      } else {
        resourceSlug = currentResource.slug;
      }
      
      let finalStatus = currentResource.status;
      if (userRole === 'admin' || userRole === 'mod') {
        finalStatus = data.status;
      }
      // For an existing resource, finalResourceVersion (potentially updated by new files) will be used here.
      await db.run(
        'UPDATE resources SET name = ?, slug = ?, version = ?, description = ?, detailed_description = ?, image_url = ?, image_gallery = ?, links = ?, requirements = ?, status = ?, selected_dynamic_tags_json = ?, updated_at = ? WHERE id = ?',
        data.name ?? currentResource.name, resourceSlug, finalResourceVersion,
        data.description ?? currentResource.description, data.detailedDescription ?? currentResource.detailed_description,
        data.imageUrl ?? currentResource.image_url, JSON.stringify(data.imageGallery || JSON.parse(currentResource.image_gallery || '[]')),
        data.links ? JSON.stringify(data.links) : currentResource.links, data.requirements ?? currentResource.requirements,
        finalStatus, data.selectedDynamicTags ? JSON.stringify(data.selectedDynamicTags) : currentResource.selected_dynamic_tags_json,
        overallOperationTimestamp, 
        resourceId
      );
    } else {
      throw new Error("Resource ID is missing for an update operation.");
    }
    
    await db.exec('COMMIT');

    const savedResource = await getResourceForEdit(resourceSlug, false); 
    if (!savedResource) throw new Error("Failed to retrieve resource after saving.");
    
    const parentItem = await getItemBySlugGeneric(savedResource.parentItemSlug, savedResource.parentItemType, false, true);
    if (parentItem) {
      const parentBasePath = parentItem.itemType === 'art-music' ? 'art-music' : parentItem.itemType + 's';
      revalidatePath('/admin/projects/' + parentItem.itemType + '/' + parentItem.slug + '/edit');
      revalidatePath('/' + parentBasePath + '/' + parentItem.slug);
      revalidatePath('/' + parentBasePath + '/' + parentItem.slug + '/' + savedResource.categorySlug);
      revalidatePath('/resources/' + savedResource.slug);
      revalidatePath('/resources', 'layout');
    }
    
    return { success: true, data: { resource: savedResource } };

  } catch (e: any) {
    await db.exec('ROLLBACK');
    console.error("[saveResourceAction ACTION] Error:", e);
    return { success: false, error: e.message || "An unknown error occurred during resource save." };
  }
}


export async function deleteResourceAction(resourceId: string): Promise<ActionResult> {
  const authCheck = await verifyPermission(['admin', 'mod']); 
  if ('error' in authCheck) {
    return { success: false, error: authCheck.error };
  }
  try {
    const db = await getDb();
    const resourceToDelete = await db.get("SELECT r.parent_item_id, r.category_id, i.slug as item_slug, i.item_type, c.slug as category_slug FROM resources r JOIN items i ON r.parent_item_id = i.id JOIN categories c ON r.category_id = c.id WHERE r.id = ?", resourceId);
    
    if (!resourceToDelete) {
        return { success: false, error: "Resource not found." };
    }

    await db.exec('BEGIN TRANSACTION');
    await db.run("DELETE FROM changelog_entries WHERE resource_id = ?", resourceId);
    await db.run("DELETE FROM resource_files WHERE resource_id = ?", resourceId);
    const result = await db.run('DELETE FROM resources WHERE id = ?', resourceId);
    await db.exec('COMMIT');

    if ((result.changes ?? 0) > 0) {
      const parentBasePath = resourceToDelete.item_type === 'art-music' ? 'art-music' : resourceToDelete.item_type + 's';
      revalidatePath('/admin/projects/' + resourceToDelete.item_type + '/' + resourceToDelete.item_slug + '/edit');
      revalidatePath('/' + parentBasePath + '/' + resourceToDelete.item_slug);
      revalidatePath('/' + parentBasePath + '/' + resourceToDelete.item_slug + '/' + resourceToDelete.category_slug);
      revalidatePath('/resources', 'layout');
      return { success: true };
    } else {
      return { success: false, error: "Failed to delete resource from DB." };
    }
  } catch (e: any) {
    const db = await getDb();
    await db.exec('ROLLBACK');
    console.error("[deleteResourceAction ACTION] Error:", e);
    return { success: false, error: e.message || "An unknown error occurred during resource deletion." };
  }
}
    

    


    


