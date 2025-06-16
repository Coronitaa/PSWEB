
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
  errorCode?: 'PERMISSION_DENIED' | 'COOKIE_INVALID_JSON' | 'COOKIE_MISSING_ID' | 'AUTH_FALLBACK_FAILED' | 'DB_ERROR' | 'UNKNOWN_ERROR';
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
    const combined = descPart + TAG_CONFIG_SEPARATOR + configJson;
    return combined;
  } catch (e) {
    console.error("[combineDescriptionAndConfig ACTION] Failed to stringify tag config JSON:", e);
    return descPart === "" ? null : descPart; 
  }
};


async function verifyPermission(allowedRoles: UserAppRole[]): Promise<{ user: { id: string; role: UserAppRole }; profile: { role: UserAppRole } } | { error: string; errorCode: ActionResult['errorCode'] }> {
  const cookieStore = cookies();
  const mockUserCookie = cookieStore.get('mockUser');
  let determinedRole: UserAppRole | undefined;
  let mockUserId: string | undefined;

  if (mockUserCookie && typeof mockUserCookie.value === 'string' && mockUserCookie.value.trim() !== '') {
    try {
      const storedUser = JSON.parse(mockUserCookie.value) as { id?: string; role?: UserAppRole; name?: string; usertag?: string };
      
      if (storedUser && typeof storedUser.id === 'string' && storedUser.id.trim() !== '') {
        mockUserId = storedUser.id.trim();
        determinedRole = (storedUser.role && USER_APP_ROLES_CONST.includes(storedUser.role)) ? storedUser.role : 'usuario';
        
        if (allowedRoles.includes(determinedRole)) {
          return { user: { id: mockUserId, role: determinedRole }, profile: { role: determinedRole } };
        } else {
          return { error: `MOCK AUTH (Cookie): Permission denied. Role '${determinedRole}' not in allowed: ${allowedRoles.join(' or ')}.`, errorCode: 'PERMISSION_DENIED' };
        }
      } else {
        // Cookie was present and parsed, but ID was missing or invalid
        return { error: "Mock user cookie is missing a valid 'id' property for admin action.", errorCode: 'COOKIE_MISSING_ID' };
      }
    } catch (e) {
      // Cookie was present but JSON parsing failed
      return { error: "Failed to parse mock user cookie for admin action: Invalid JSON.", errorCode: 'COOKIE_INVALID_JSON' };
    }
  }

  // Fallback to MOCK_ROLE environment variable if cookie path failed
  const roleFromEnv = process.env.MOCK_ROLE as UserAppRole | undefined;
  if (roleFromEnv && USER_APP_ROLES_CONST.includes(roleFromEnv)) {
    determinedRole = roleFromEnv;
    if (determinedRole === 'admin') mockUserId = 'mock-admin-id';
    else if (determinedRole === 'mod') mockUserId = 'mock-mod-id';
    else mockUserId = 'mock-user-id'; // Standard user from ENV

    if (mockUserId && determinedRole) { // Ensure both are set
      if (allowedRoles.includes(determinedRole)) {
        return { user: { id: mockUserId, role: determinedRole }, profile: { role: determinedRole } };
      } else {
        return { error: `MOCK AUTH (ENV): Permission denied. Role '${determinedRole}' not in allowed: ${allowedRoles.join(' or ')}.`, errorCode: 'PERMISSION_DENIED' };
      }
    }
  }
  
  return { error: `MOCK AUTH: Permission denied. No valid user session found meeting criteria: ${allowedRoles.join(' or ')}.`, errorCode: 'AUTH_FALLBACK_FAILED' };
}


export async function saveProjectAction(
  projectIdFromForm: string | undefined, 
  data: ProjectFormData,
  isNew: boolean
): Promise<ActionResult<{ project: GenericListItem }>> {
  const authCheck = await verifyPermission(['admin', 'mod']);
  if ('error' in authCheck) {
    return { success: false, error: authCheck.error, errorCode: authCheck.errorCode };
  }

  try {
    let project: GenericListItem | undefined;

    if (isNew) {
      project = await addProjectToDb(data); 
    } else if (projectIdFromForm) {
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
      return { success: false, error: "Project operation failed to return a project.", errorCode: 'DB_ERROR' };
    }
  } catch (e: any) {
    console.error("[saveProjectAction ACTION] Error:", e);
    return { success: false, error: e.message || "An unknown error occurred during project save.", errorCode: 'UNKNOWN_ERROR' };
  }
}

export async function deleteProjectAction(projectId: string): Promise<ActionResult> {
    const authCheck = await verifyPermission(['admin']);
    if ('error' in authCheck) {
      return { success: false, error: authCheck.error, errorCode: authCheck.errorCode };
    }

    try {
        const success = await deleteProjectFromDb(projectId); 
        if (success) {
            revalidatePath('/admin/projects');
            ITEM_TYPES_CONST.forEach(type => {
                const basePath = type === 'art-music' ? 'art-music' : type + 's';
                revalidatePath('/' + basePath);
            });
            return { success: true };
        } else {
            return { success: false, error: "Failed to delete project from DB (no rows affected or other issue).", errorCode: 'DB_ERROR' };
        }
    } catch (e: any) {
        console.error("[deleteProjectAction ACTION] Error:", e);
        return { success: false, error: e.message || "An unknown error occurred during project deletion.", errorCode: 'UNKNOWN_ERROR' };
    }
}

// --- Section Tag CRUD Actions ---
export async function createSectionTagAction(itemType: ItemType, name: string, description?: string): Promise<ActionResult<Tag>> {
  const authCheck = await verifyPermission(['admin', 'mod']);
  if ('error' in authCheck) {
    return { success: false, error: authCheck.error, errorCode: authCheck.errorCode };
  }
  try {
    const newTag = await createSectionTagDefinition(itemType, name, description);
    revalidatePath('/admin/projects/' + itemType + '/.*/edit'); 
    return { success: true, data: newTag };
  } catch (e: any) {
    console.error("[createSectionTagAction ACTION] Error:", e);
    return { success: false, error: e.message || "Failed to create section tag.", errorCode: 'UNKNOWN_ERROR' };
  }
}

export async function updateSectionTagAction(tagId: string, newName: string, newDescription?: string): Promise<ActionResult<Tag>> {
  const authCheck = await verifyPermission(['admin', 'mod']);
  if ('error' in authCheck) {
    return { success: false, error: authCheck.error, errorCode: authCheck.errorCode };
  }
  try {
    const updatedTag = await updateSectionTagDefinition(tagId, newName, newDescription);
    if (!updatedTag) {
        return { success: false, error: "Tag not found or failed to update.", errorCode: 'DB_ERROR' };
    }
    revalidatePath('/admin/projects/' + updatedTag.type + '/.*/edit', 'page');
    return { success: true, data: updatedTag };
  } catch (e: any) {
    console.error("[updateSectionTagAction ACTION] Error:", e);
    return { success: false, error: e.message || "Failed to update section tag.", errorCode: 'UNKNOWN_ERROR' };
  }
}

export async function deleteSectionTagAction(tagId: string): Promise<ActionResult> {
  const authCheck = await verifyPermission(['admin', 'mod']);
  if ('error' in authCheck) {
    return { success: false, error: authCheck.error, errorCode: authCheck.errorCode };
  }
  try {
    const db = await getDb();
    const tagData = await db.get("SELECT item_type FROM section_tags WHERE id = ?", tagId);
    
    const success = await deleteSectionTagDefinition(tagId);
    if (success) {
      if (tagData?.item_type) {
        revalidatePath('/admin/projects/' + tagData.item_type + '/.*/edit', 'page');
      } else {
        ITEM_TYPES_CONST.forEach(type => revalidatePath('/admin/projects/' + type + '/.*/edit', 'page'));
      }
      return { success: true };
    } else {
      return { success: false, error: "Failed to delete section tag.", errorCode: 'DB_ERROR' };
    }
  } catch (e: any) {
    console.error("[deleteSectionTagAction ACTION] Error:", e);
    return { success: false, error: e.message || "Failed to delete section tag.", errorCode: 'UNKNOWN_ERROR' };
  }
}


// --- Category Actions ---
export async function saveCategoryAction(
  categoryId: string | undefined,
  data: CategoryFormData,
  isNew: boolean,
  parentItemTypeFromProps: ItemType 
): Promise<ActionResult<{ category: Category }>> {
  const authCheck = await verifyPermission(['admin', 'mod']);
  if ('error' in authCheck) {
    return { success: false, error: authCheck.error, errorCode: authCheck.errorCode };
  }

  try {
    const rawDescriptionForDb = combineDescriptionAndConfig(data.description, data.tagGroupConfigs);
    const dbData = { ...data, description: rawDescriptionForDb };

    let savedOrUpdatedCategory: Category | undefined;
    if (isNew) {
      savedOrUpdatedCategory = await addCategoryToDb(data.parentItemId, dbData as CategoryFormData & { description: string | null });
    } else if (categoryId) {
       savedOrUpdatedCategory = await updateCategoryInDb(categoryId, dbData as Partial<CategoryFormData> & { description?: string | null });
    }

    if (savedOrUpdatedCategory && savedOrUpdatedCategory.parentItemId) {
      const db = await getDb();
      const parentItemRow = await db.get("SELECT slug FROM items WHERE id = ? AND item_type = ?", savedOrUpdatedCategory.parentItemId, parentItemTypeFromProps) as { slug: string; } | undefined;

      if (parentItemRow && parentItemRow.slug) {
        const parentBasePath = parentItemTypeFromProps === 'art-music' ? 'art-music' : parentItemTypeFromProps + 's';
        revalidatePath('/admin/projects/' + parentItemTypeFromProps + '/' + parentItemRow.slug + '/edit');
        revalidatePath('/' + parentBasePath + '/' + parentItemRow.slug);
        revalidatePath('/' + parentBasePath + '/' + parentItemRow.slug + '/' + savedOrUpdatedCategory.slug);
        revalidatePath('/resources', 'layout'); 
        revalidatePath('/' + parentBasePath); 
      } else {
        console.error("[saveCategoryAction SERVER] CRITICAL REVALIDATION FAILURE: Could not fetch parent item.");
      }
      return { success: true, data: { category: savedOrUpdatedCategory } };
    } else {
      return { success: false, error: savedOrUpdatedCategory ? "Category data incomplete after operation." : "Category operation failed to return category data.", errorCode: 'DB_ERROR' };
    }
  } catch (e: any) {
    console.error("[saveCategoryAction SERVER] Error:", e.message, e.stack);
    return { success: false, error: e.message || "An unknown error occurred during category save.", errorCode: 'UNKNOWN_ERROR' };
  }
}

export async function deleteCategoryAction(categoryId: string, parentItemId: string): Promise<ActionResult> {
  const authCheck = await verifyPermission(['admin', 'mod']);
  if ('error' in authCheck) {
    return { success: false, error: authCheck.error, errorCode: authCheck.errorCode };
  }

  try {
    const success = await deleteCategoryFromDb(categoryId);
    if (success) {
        const db = await getDb();
        const parentItemRow = await db.get("SELECT slug, item_type FROM items WHERE id = ?", parentItemId) as { slug: string; item_type: ItemType } | undefined;
        if (parentItemRow && parentItemRow.slug) {
            const parentBasePath = parentItemRow.item_type === 'art-music' ? 'art-music' : parentItemRow.item_type + 's';
            revalidatePath('/admin/projects/' + parentItemRow.item_type + '/' + parentItemRow.slug + '/edit');
            revalidatePath('/' + parentBasePath + '/' + parentItemRow.slug);
            revalidatePath('/' + parentBasePath); 
        } else {
            console.error("[deleteCategoryAction ACTION] Could not fetch parent item for revalidation on category delete:", parentItemId);
        }
      return { success: true };
    } else {
      return { success: false, error: "Failed to delete category from DB.", errorCode: 'DB_ERROR' };
    }
  } catch (e: any) {
    console.error("[deleteCategoryAction ACTION] Error:", e);
    return { success: false, error: e.message || "An unknown error occurred during category deletion.", errorCode: 'UNKNOWN_ERROR' };
  }
}

export async function updateCategoryOrderInMemoryAction(itemId: string, orderedCategoryIds: string[]): Promise<ActionResult> {
    const authCheck = await verifyPermission(['admin', 'mod']);
    if ('error' in authCheck) {
      return { success: false, error: authCheck.error, errorCode: authCheck.errorCode };
    }
    try {
        const success = await updateCategoryOrderInDb(itemId, orderedCategoryIds);
        if (success) {
            const db = await getDb();
            const parentItemRow = await db.get("SELECT slug, item_type FROM items WHERE id = ?", itemId) as { slug: string; item_type: ItemType } | undefined;
             if (parentItemRow && parentItemRow.slug) {
                const parentBasePath = parentItemRow.item_type === 'art-music' ? 'art-music' : parentItemRow.item_type + 's';
                revalidatePath('/admin/projects/' + parentItemRow.item_type + '/' + parentItemRow.slug + '/edit');
                revalidatePath('/' + parentBasePath + '/' + parentItemRow.slug);
                revalidatePath('/' + parentBasePath); 
            } else {
                console.error("[updateCategoryOrderInMemoryAction ACTION] Could not fetch parent item for revalidation on category order update:", itemId);
            }
            return { success: true };
        } else {
            return { success: false, error: "Failed to update category order in DB.", errorCode: 'DB_ERROR' };
        }
    } catch (e: any) {
        console.error("[updateCategoryOrderInMemoryAction ACTION] Error:", e);
        return { success: false, error: e.message || "An unknown error occurred while updating category order.", errorCode: 'UNKNOWN_ERROR' };
    }
}

export async function fetchProjectCategoryTagConfigurationsAction(projectId: string): Promise<ActionResult<ProjectCategoryTagConfigurations>> {
  const authCheck = await verifyPermission(['admin', 'mod']);
  if ('error' in authCheck) {
    return { success: false, error: authCheck.error, errorCode: authCheck.errorCode };
  }
  try {
    const configs = await getProjectCategoryTagConfigurationsFromDb(projectId);
    return { success: true, data: configs };
  } catch (e: any) {
    console.error("[fetchProjectCategoryTagConfigurationsAction ACTION] Error:", e);
    return { success: false, error: e.message || "Failed to fetch project category tag configurations.", errorCode: 'UNKNOWN_ERROR' };
  }
}

// --- Resource Actions ---
export async function saveResourceAction(
  resourceIdFromForm: string | undefined, 
  data: ResourceFormData,
  isNewResource: boolean,
  parentItemId: string, 
  categoryId: string,   
  authorIdProp: string | undefined 
): Promise<ActionResult<{ resource: Resource }>> {
  const authResult = await verifyPermission(['usuario', 'mod', 'admin']); 
  if ('error' in authResult) {
    return { success: false, error: authResult.error, errorCode: authResult.errorCode };
  }
  const { user: authUser } = authResult; // authUser.id is the authenticated user's ID
  const userRole = authUser.role;
  const db = await getDb();

  let resourceId = resourceIdFromForm;
  let resourceSlug = data.slug?.trim() || '';
  
  const overallOperationTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  let finalResourceVersion = data.version; 

  try {
    await db.exec('BEGIN TRANSACTION');

    // --- Handle Main Resource Record First for New Resources to get ID ---
    if (isNewResource) {
      if (!resourceSlug) {
        resourceSlug = await generateSlugLocal(data.name, 'resources', { parent_item_id: parentItemId, category_id: categoryId });
      }
      resourceId = 'res_' + resourceSlug.replace(/-/g, '_') + '_' + Date.now().toString(36); 
      
      // For a new resource, finalResourceVersion determined by new files (if any) will be used here if logic is adjusted,
      // or just the initial form version if files are added after this initial insert.
      // Current logic: uses form's version initially, then files might update it.
      
      await db.run(
        'INSERT INTO resources (id, name, slug, parent_item_id, category_id, author_id, version, description, detailed_description, image_url, image_gallery, links, requirements, status, selected_dynamic_tags_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        resourceId, data.name, resourceSlug, parentItemId, categoryId, authUser.id, finalResourceVersion, data.description,
        data.detailedDescription || null, data.imageUrl || null, JSON.stringify(data.imageGallery || []),
        data.links ? JSON.stringify(data.links) : null, data.requirements || null, 
        (userRole === 'admin' || userRole === 'mod') ? data.status : 'published', // Default to published for users
        data.selectedDynamicTags ? JSON.stringify(data.selectedDynamicTags) : null,
        overallOperationTimestamp, 
        overallOperationTimestamp 
      );
    } else if (!resourceId) {
      throw new Error("Resource ID is missing for an update operation.");
    }


    // --- Handle Resource Files ---
    const submittedFileIds = new Set(data.files.map(f => f.id).filter(id => id));
    const existingDbFilesResult = resourceId ? await db.all("SELECT id, name, url, version_name, size, channel_id, selected_file_tags_json, created_at, updated_at FROM resource_files WHERE resource_id = ?", resourceId) : [];
    const existingDbFilesMap = new Map(existingDbFilesResult.map(f => [f.id, f]));
    
    if (!isNewResource && resourceId) {
        for (const existingFile of existingDbFilesResult) {
          if (!submittedFileIds.has(existingFile.id)) {
            await db.run("DELETE FROM changelog_entries WHERE resource_file_id = ?", existingFile.id);
            await db.run("DELETE FROM resource_files WHERE id = ?", existingFile.id);
          }
        }
    }

    for (const fileData of data.files) {
      const fileId = fileData.id || 'rfile_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
      const fileTagsJson = JSON.stringify(fileData.selectedFileTags || {});
      const fileCreationTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const isNewFileForThisSubmission = !fileData.id || !existingDbFilesMap.has(fileData.id);

      if (isNewFileForThisSubmission && (!fileData.channelId || fileData.channelId === 'release') && fileData.versionName) {
        finalResourceVersion = fileData.versionName; 
      }

      if (fileData.id && existingDbFilesMap.has(fileData.id)) { 
        const currentDbFile = existingDbFilesMap.get(fileData.id);
        if (!currentDbFile) {
            console.warn(`[saveResourceAction] Submitted file with ID ${fileData.id} not found in DB for resource ${resourceId}. Skipping update for this file.`);
            continue;
        }
        await db.run(
          "UPDATE resource_files SET name = ?, url = ?, version_name = ?, size = ?, channel_id = ?, selected_file_tags_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND resource_id = ?",
          fileData.name, fileData.url, fileData.versionName, fileData.size || null, fileData.channelId || null, fileTagsJson, fileData.id, resourceId
        );
      } else { 
        if (!resourceId) throw new Error("Cannot add file, resourceId is undefined.");
        await db.run(
          "INSERT INTO resource_files (id, resource_id, name, url, version_name, size, channel_id, selected_file_tags_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          fileId, resourceId, fileData.name, fileData.url, fileData.versionName, fileData.size || null, fileData.channelId || null, fileTagsJson, 
          fileCreationTimestamp, fileCreationTimestamp  
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
          if (!resourceId) throw new Error("Cannot add changelog, resourceId is undefined.");
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

    // --- Update Main Resource Record if it's an existing resource ---
    if (!isNewResource && resourceId) { 
      const currentResource = await db.get("SELECT * FROM resources WHERE id = ?", resourceId);
      if (!currentResource) throw new Error("Resource not found for update.");

      // Authorization check for editing existing resource
      if (userRole !== 'admin' && userRole !== 'mod' && currentResource.author_id !== authUser.id) {
        await db.exec('ROLLBACK');
        return { success: false, error: "Permission denied: You are not the author or an administrator.", errorCode: 'PERMISSION_DENIED' };
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
    }
    
    await db.exec('COMMIT');

    const finalSlugToFetch = isNewResource ? resourceSlug : (resourceSlug || initialData!.slug);
    const savedResource = await getResourceForEdit(finalSlugToFetch, false); 
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
    return { success: false, error: e.message || "An unknown error occurred during resource save.", errorCode: 'UNKNOWN_ERROR' };
  }
}


export async function deleteResourceAction(resourceId: string): Promise<ActionResult> {
  const authCheck = await verifyPermission(['admin', 'mod']); 
  if ('error' in authCheck) {
    return { success: false, error: authCheck.error, errorCode: authCheck.errorCode };
  }
  try {
    const db = await getDb();
    const resourceToDelete = await db.get("SELECT r.parent_item_id, r.category_id, i.slug as item_slug, i.item_type, c.slug as category_slug FROM resources r JOIN items i ON r.parent_item_id = i.id JOIN categories c ON r.category_id = c.id WHERE r.id = ?", resourceId);
    
    if (!resourceToDelete) {
        return { success: false, error: "Resource not found.", errorCode: 'DB_ERROR' };
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
      return { success: false, error: "Failed to delete resource from DB.", errorCode: 'DB_ERROR' };
    }
  } catch (e: any) {
    const db = await getDb();
    await db.exec('ROLLBACK');
    console.error("[deleteResourceAction ACTION] Error:", e);
    return { success: false, error: e.message || "An unknown error occurred during resource deletion.", errorCode: 'UNKNOWN_ERROR' };
  }
}
    

    


    



