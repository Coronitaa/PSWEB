
"use server";

import { revalidatePath } from 'next/cache';
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
    createSectionTagDefinition,
    updateSectionTagDefinition,
    deleteSectionTagDefinition,
    searchProfiles,
    addAuthorToResource,
    removeAuthorFromResource,
    updateAuthorRoleInDb,
    transferResourceOwnershipInDb,
    updateAuthorColorInDb,
} from '@/lib/data';
import type { ProjectFormData, CategoryFormData, GenericListItem, Category, ItemType, UserAppRole, CategoryTagGroupConfig, ProjectCategoryTagConfigurations, ResourceFormData, Resource, SectionTagFormData, Tag, Author, ResourceAuthor } from '@/lib/types';
import { ITEM_TYPES_CONST, USER_APP_ROLES_CONST } from '@/lib/types';
import { getDb } from '@/lib/db';
import { generateSlugLocal } from '@/lib/data'; 
import { getItemTypePlural } from '@/lib/utils';

interface ActionResult<T = null> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: 'PERMISSION_DENIED' | 'DB_ERROR' | 'UNKNOWN_ERROR' | 'AUTH_REQUIRED' | 'NOT_FOUND';
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

async function verifyPermission(
  allowedRoles: UserAppRole[],
  clientProvidedUserId?: string 
): Promise<{ user: { id: string; role: UserAppRole }; profile: { role: UserAppRole } } | { error: string; errorCode: ActionResult['errorCode'] }> {
  
  let userIdToUse: string;
  let roleToUse: UserAppRole;

  if (clientProvidedUserId) {
    if (clientProvidedUserId === 'mock-admin-id') roleToUse = 'admin';
    else if (clientProvidedUserId === 'mock-mod-id') roleToUse = 'mod';
    else roleToUse = 'usuario';
    
    if (!['mock-admin-id', 'mock-mod-id', 'mock-user-id'].includes(clientProvidedUserId)) {
        roleToUse = 'usuario';
    }
    userIdToUse = clientProvidedUserId;
  } else {
    const roleFromEnv = process.env.MOCK_USER_ROLE as UserAppRole | undefined;
    roleToUse = (roleFromEnv && USER_APP_ROLES_CONST.includes(roleFromEnv)) ? roleFromEnv : 'admin';
    
    if (roleToUse === 'admin') userIdToUse = 'mock-admin-id';
    else if (roleToUse === 'mod') userIdToUse = 'mock-mod-id';
    else userIdToUse = 'mock-user-id';
  }

  if (allowedRoles.includes(roleToUse)) {
    return { user: { id: userIdToUse, role: roleToUse }, profile: { role: roleToUse } };
  } else {
    return { error: `Mock Auth (Admin): Permission denied. Role '${roleToUse}' not in allowed: ${allowedRoles.join(' or ')}.`, errorCode: 'PERMISSION_DENIED' };
  }
}

async function verifyResourceCreatorPermission(
  resourceId: string,
  clientProvidedUserId?: string
): Promise<{ user: { id: string; role: UserAppRole }; isCreator: boolean; } | { error: string; errorCode: ActionResult['errorCode'] }> {
    const permCheck = await verifyPermission(['admin', 'mod', 'usuario'], clientProvidedUserId);
    if ('error' in permCheck) return permCheck;

    const { user } = permCheck;
    if (user.role === 'admin' || user.role === 'mod') {
        return { user, isCreator: true }; // Admins/Mods can act as creators
    }

    const db = await getDb();
    const creator = await db.get('SELECT author_id FROM resource_authors WHERE resource_id = ? AND is_creator = 1', resourceId);

    if (creator && creator.author_id === user.id) {
        return { user, isCreator: true };
    }

    return { error: "Permission denied: You are not the creator of this resource.", errorCode: 'PERMISSION_DENIED' };
}


export async function saveProjectAction(
  projectIdFromForm: string | undefined, 
  data: ProjectFormData,
  isNew: boolean,
  clientMockUserId?: string
): Promise<ActionResult<{ project: GenericListItem }>> {
  const authCheck = await verifyPermission(['admin', 'mod'], clientMockUserId);
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
        const basePath = getItemTypePlural(project.itemType);
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

export async function deleteProjectAction(projectId: string, clientMockUserId?: string): Promise<ActionResult> {
    const authCheck = await verifyPermission(['admin'], clientMockUserId);
    if ('error' in authCheck) {
      return { success: false, error: authCheck.error, errorCode: authCheck.errorCode };
    }

    try {
        const success = await deleteProjectFromDb(projectId); 
        if (success) {
            revalidatePath('/admin/projects');
            ITEM_TYPES_CONST.forEach(type => {
                const basePath = getItemTypePlural(type);
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

export async function createSectionTagAction(itemType: ItemType, name: string, description?: string, clientMockUserId?: string): Promise<ActionResult<Tag>> {
  const authCheck = await verifyPermission(['admin', 'mod'], clientMockUserId);
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

export async function updateSectionTagAction(tagId: string, newName: string, newDescription?: string, clientMockUserId?: string): Promise<ActionResult<Tag>> {
  const authCheck = await verifyPermission(['admin', 'mod'], clientMockUserId);
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

export async function deleteSectionTagAction(tagId: string, clientMockUserId?: string): Promise<ActionResult> {
  const authCheck = await verifyPermission(['admin', 'mod'], clientMockUserId);
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

export async function saveCategoryAction(
  categoryId: string | undefined,
  data: CategoryFormData,
  isNew: boolean,
  parentItemTypeFromProps: ItemType,
  clientMockUserId?: string
): Promise<ActionResult<{ category: Category }>> {
  const authCheck = await verifyPermission(['admin', 'mod'], clientMockUserId);
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
        const parentBasePath = getItemTypePlural(parentItemTypeFromProps);
        revalidatePath('/admin/projects/' + parentItemTypeFromProps + '/' + parentItemRow.slug + '/edit');
        revalidatePath('/' + parentBasePath + '/' + parentItemRow.slug);
        revalidatePath('/' + parentBasePath + '/' + parentItemRow.slug + '/' + savedOrUpdatedCategory.slug);
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

export async function deleteCategoryAction(categoryId: string, parentItemId: string, clientMockUserId?: string): Promise<ActionResult> {
  const authCheck = await verifyPermission(['admin', 'mod'], clientMockUserId);
  if ('error' in authCheck) {
    return { success: false, error: authCheck.error, errorCode: authCheck.errorCode };
  }

  try {
    const success = await deleteCategoryFromDb(categoryId);
    if (success) {
        const db = await getDb();
        const parentItemRow = await db.get("SELECT slug, item_type FROM items WHERE id = ?", parentItemId) as { slug: string; item_type: ItemType } | undefined;
        if (parentItemRow && parentItemRow.slug) {
            const parentBasePath = getItemTypePlural(parentItemRow.item_type);
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

export async function updateCategoryOrderInMemoryAction(itemId: string, orderedCategoryIds: string[], clientMockUserId?: string): Promise<ActionResult> {
    const authCheck = await verifyPermission(['admin', 'mod'], clientMockUserId);
    if ('error' in authCheck) {
      return { success: false, error: authCheck.error, errorCode: authCheck.errorCode };
    }
    try {
        const success = await updateCategoryOrderInDb(itemId, orderedCategoryIds);
        if (success) {
            const db = await getDb();
            const parentItemRow = await db.get("SELECT slug, item_type FROM items WHERE id = ?", itemId) as { slug: string; item_type: ItemType } | undefined;
             if (parentItemRow && parentItemRow.slug) {
                const parentBasePath = getItemTypePlural(parentItemRow.item_type);
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

export async function fetchProjectCategoryTagConfigurationsAction(projectId: string, clientMockUserId?: string): Promise<ActionResult<ProjectCategoryTagConfigurations>> {
  const authCheck = await verifyPermission(['admin', 'mod'], clientMockUserId);
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

export async function saveResourceAction(
  resourceIdFromForm: string | undefined, 
  data: ResourceFormData,
  isNewResource: boolean,
  parentItemId: string, 
  categoryId: string,   
  clientMockUserId?: string
): Promise<ActionResult<{ resource: Resource }>> {
  const authResult = await verifyPermission(['usuario', 'mod', 'admin'], clientMockUserId); 
  if ('error' in authResult) {
    return { success: false, error: authResult.error, errorCode: authResult.errorCode };
  }
  const { user: authUser } = authResult;
  const userRole = authUser.role;
  const db = await getDb();

  let resourceId = resourceIdFromForm;
  let resourceSlug = data.slug?.trim() || '';
  
  const overallOperationTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  let finalResourceVersion = data.version; 

  try {
    await db.exec('BEGIN TRANSACTION');

    if (isNewResource) {
      if (!resourceSlug) {
        resourceSlug = await generateSlugLocal(data.name, 'resources', { parent_item_id: parentItemId, category_id: categoryId });
      }
      resourceId = 'res_' + resourceSlug.replace(/-/g, '_') + '_' + Date.now().toString(36); 
      
      await db.run(
        'INSERT INTO resources (id, name, slug, parent_item_id, category_id, version, description, detailed_description, image_url, image_gallery, gallery_aspect_ratio, gallery_autoplay_interval, show_main_image_in_gallery, links, requirements, status, selected_dynamic_tags_json, created_at, updated_at, author_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        resourceId, data.name, resourceSlug, parentItemId, categoryId, finalResourceVersion, data.description,
        data.detailedDescription || null, data.imageUrl || 'https://placehold.co/800x450.png', JSON.stringify(data.imageGallery || []),
        data.galleryAspectRatio || '16/9', data.galleryAutoplayInterval ?? 5000,
        data.showMainImageInGallery ?? true,
        data.links ? JSON.stringify(data.links) : null, data.requirements || null, 
        (userRole === 'admin' || userRole === 'mod') ? data.status : 'published', 
        data.selectedDynamicTags ? JSON.stringify(data.selectedDynamicTags) : null,
        overallOperationTimestamp, 
        overallOperationTimestamp,
        authUser.id // Insert current user as legacy author_id
      );
      
      // Assign the user as the creator
      await db.run('INSERT INTO resource_authors (resource_id, author_id, is_creator, role_description) VALUES (?, ?, ?, ?)', resourceId, authUser.id, true, 'Creator');

    } else if (!resourceId) {
      throw new Error("Resource ID is missing for an update operation.");
    }

    // Smart file update logic
    const submittedFileIds = new Set(data.files.map(f => f.id).filter(id => id));
    const existingDbFilesResult = resourceId 
      ? await db.all("SELECT rf.*, ce.notes as changelog_notes FROM resource_files rf LEFT JOIN changelog_entries ce ON rf.id = ce.resource_file_id WHERE rf.resource_id = ?", resourceId) 
      : [];
    const existingDbFilesMap = new Map(existingDbFilesResult.map(f => [f.id, f]));

    // Delete files that are no longer in the form submission
    for (const existingFile of existingDbFilesResult) {
      if (!submittedFileIds.has(existingFile.id)) {
        await db.run("DELETE FROM changelog_entries WHERE resource_file_id = ?", existingFile.id);
        await db.run("DELETE FROM resource_files WHERE id = ?", existingFile.id);
      }
    }

    for (const fileData of data.files) {
      const isNewFileInSubmission = !fileData.id || !existingDbFilesMap.has(fileData.id);
      const fileId = fileData.id || 'rfile_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
      const fileTagsJson = JSON.stringify(fileData.selectedFileTags || {});

      if (isNewFileInSubmission) {
        // This is a new file, insert it
        if ((!fileData.channelId || fileData.channelId === 'release') && fileData.versionName) {
          finalResourceVersion = fileData.versionName; 
        }
        const fileCreationTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
        await db.run(
          "INSERT INTO resource_files (id, resource_id, name, url, version_name, size, channel_id, selected_file_tags_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          fileId, resourceId, fileData.name, fileData.url, fileData.versionName, fileData.size || null, fileData.channelId || null, fileTagsJson, 
          fileCreationTimestamp  
        );
        // And its changelog if it exists
        if (fileData.changelogNotes && fileData.changelogNotes.trim() !== '') {
            const changelogId = 'clog_' + fileId.substring(6) + '_' + Date.now().toString(36);
            await db.run(
              "INSERT INTO changelog_entries (id, resource_id, resource_file_id, version_name, date, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
              changelogId, resourceId, fileId, fileData.versionName, new Date().toISOString().split('T')[0], fileData.changelogNotes.trim()
            );
        }

      } else {
        // This is an existing file, check for changes before updating
        const dbFile = existingDbFilesMap.get(fileData.id!);
        if (!dbFile) continue;

        const sortedStringify = (obj: any) => {
            if (!obj) return '{}';
            const sorted = Object.keys(obj).sort().reduce((acc: Record<string, any>, key) => {
                if (Array.isArray(obj[key])) {
                  acc[key] = [...obj[key]].sort();
                } else {
                  acc[key] = obj[key];
                }
                return acc;
            }, {});
            return JSON.stringify(sorted);
        };

        const dbFileTags = dbFile.selected_file_tags_json ? JSON.parse(dbFile.selected_file_tags_json) : {};
        const formFileTags = fileData.selectedFileTags || {};
        const tagsAreEqual = sortedStringify(formFileTags) === sortedStringify(dbFileTags);

        const hasChanged = 
            fileData.name !== dbFile.name ||
            fileData.url !== dbFile.url ||
            fileData.versionName !== dbFile.version_name ||
            (fileData.size || null) !== dbFile.size ||
            (fileData.channelId || null) !== dbFile.channel_id ||
            !tagsAreEqual ||
            (fileData.changelogNotes || '').trim() !== (dbFile.changelog_notes || '').trim();

        if (hasChanged) {
          await db.run(
            "UPDATE resource_files SET name = ?, url = ?, version_name = ?, size = ?, channel_id = ?, selected_file_tags_json = ? WHERE id = ? AND resource_id = ?",
            fileData.name, fileData.url, fileData.versionName, fileData.size || null, fileData.channelId || null, fileTagsJson, fileData.id, resourceId
          );

          // Update changelog since data has changed
          const newNotes = (fileData.changelogNotes || '').trim();
          const changelogDate = new Date().toISOString().split('T')[0];
          if (newNotes) {
            const existingChangelog = await db.get("SELECT id FROM changelog_entries WHERE resource_file_id = ?", fileId);
            if (existingChangelog) {
              await db.run("UPDATE changelog_entries SET version_name = ?, notes = ?, date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", fileData.versionName, newNotes, changelogDate, existingChangelog.id);
            } else {
              const changelogId = 'clog_' + fileId.substring(6) + '_' + Date.now().toString(36);
              await db.run("INSERT INTO changelog_entries (id, resource_id, resource_file_id, version_name, date, notes) VALUES (?, ?, ?, ?, ?, ?)", changelogId, resourceId!, fileId, fileData.versionName, changelogDate, newNotes);
            }
          } else {
            await db.run("DELETE FROM changelog_entries WHERE resource_file_id = ?", fileId);
          }
        }
      }
    }

    if (!isNewResource && resourceId) { 
      const currentResource = await db.get("SELECT * FROM resources WHERE id = ?", resourceId);
      if (!currentResource) throw new Error("Resource not found for update.");

      const creator = await db.get("SELECT author_id FROM resource_authors WHERE resource_id = ? AND is_creator = 1", resourceId);

      if (userRole !== 'admin' && userRole !== 'mod' && creator.author_id !== authUser.id) {
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
        'UPDATE resources SET name = ?, slug = ?, version = ?, description = ?, detailed_description = ?, image_url = ?, image_gallery = ?, gallery_aspect_ratio = ?, gallery_autoplay_interval = ?, show_main_image_in_gallery = ?, links = ?, requirements = ?, status = ?, selected_dynamic_tags_json = ?, updated_at = ? WHERE id = ?',
        data.name ?? currentResource.name, resourceSlug, finalResourceVersion,
        data.description ?? currentResource.description, data.detailedDescription ?? currentResource.detailed_description,
        data.imageUrl ?? currentResource.image_url, JSON.stringify(data.imageGallery || JSON.parse(currentResource.image_gallery || '[]')),
        data.galleryAspectRatio ?? currentResource.gallery_aspect_ratio,
        data.galleryAutoplayInterval ?? currentResource.gallery_autoplay_interval,
        data.showMainImageInGallery ?? currentResource.show_main_image_in_gallery,
        data.links ? JSON.stringify(data.links) : currentResource.links, data.requirements ?? currentResource.requirements,
        finalStatus, data.selectedDynamicTags ? JSON.stringify(data.selectedDynamicTags) : currentResource.selected_dynamic_tags_json,
        overallOperationTimestamp, 
        resourceId
      );
    }
    
    await db.exec('COMMIT');

    const finalSlugToFetch = isNewResource ? resourceSlug : (resourceSlug || (await db.get('SELECT slug FROM resources WHERE id = ?', resourceId!))?.slug);
    if (!finalSlugToFetch) throw new Error("Could not determine slug to fetch resource after saving.");

    const savedResource = await getResourceForEdit(finalSlugToFetch, false); 
    if (!savedResource) throw new Error("Failed to retrieve resource after saving.");
    
    const parentItem = await getItemBySlugGeneric(savedResource.parentItemSlug, savedResource.parentItemType, false, true);
    if (parentItem) {
      const parentBasePath = getItemTypePlural(parentItem.itemType);
      const resourcePath = `/${parentBasePath}/${parentItem.slug}/${savedResource.categorySlug}/${savedResource.slug}`;
      revalidatePath(resourcePath);
    }
    
    return { success: true, data: { resource: savedResource } };

  } catch (e: any) {
    await db.exec('ROLLBACK');
    console.error("[saveResourceAction ACTION] Error:", e);
    return { success: false, error: e.message || "An unknown error occurred during resource save.", errorCode: 'UNKNOWN_ERROR' };
  }
}


export async function deleteResourceAction(resourceId: string, clientMockUserId?: string): Promise<ActionResult> {
  const authResult = await verifyResourceCreatorPermission(resourceId, clientMockUserId);
  if ('error' in authResult) {
    return { success: false, error: authResult.error, errorCode: authResult.errorCode };
  }

  try {
    const db = await getDb();
    const resourceToDelete = await db.get("SELECT r.parent_item_id, r.category_id, i.slug as item_slug, i.item_type, c.slug as category_slug FROM resources r JOIN items i ON r.parent_item_id = i.id JOIN categories c ON r.category_id = c.id WHERE r.id = ?", resourceId);
    
    if (!resourceToDelete) {
        return { success: false, error: "Resource not found.", errorCode: 'DB_ERROR' };
    }

    await db.exec('BEGIN TRANSACTION');
    await db.run("DELETE FROM resource_authors WHERE resource_id = ?", resourceId);
    await db.run("DELETE FROM changelog_entries WHERE resource_id = ?", resourceId);
    await db.run("DELETE FROM resource_files WHERE resource_id = ?", resourceId);
    await db.run('DELETE FROM user_review_sentiments WHERE review_id IN (SELECT id FROM reviews WHERE resource_id = ?)', resourceId);
    await db.run('DELETE FROM reviews WHERE resource_id = ?', resourceId);
    const result = await db.run('DELETE FROM resources WHERE id = ?', resourceId);
    await db.exec('COMMIT');

    if ((result.changes ?? 0) > 0) {
      const parentBasePath = getItemTypePlural(resourceToDelete.item_type);
      revalidatePath(`/${parentBasePath}/${resourceToDelete.item_slug}/${resourceToDelete.category_slug}`);
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


// --- Author Management Actions ---

export async function searchUsersAction(query: string, clientMockUserId?: string): Promise<ActionResult<Author[]>> {
  // Public action, no specific role required, but needs auth.
  const authCheck = await verifyPermission(['admin', 'mod', 'usuario'], clientMockUserId);
  if ('error' in authCheck) {
    return { success: false, error: authCheck.error, errorCode: authCheck.errorCode };
  }
  
  try {
    const users = await searchProfiles(query);
    return { success: true, data: users };
  } catch (e: any) {
    console.error("[searchUsersAction ACTION] Error:", e);
    return { success: false, error: e.message, errorCode: 'DB_ERROR' };
  }
}

export async function addAuthorAction(resourceId: string, userIdToAdd: string, roleDescription: string = 'Collaborator', clientMockUserId?: string): Promise<ActionResult<{ authors: ResourceAuthor[] }>> {
  const permCheck = await verifyResourceCreatorPermission(resourceId, clientMockUserId);
  if ('error' in permCheck) return permCheck;

  try {
    const updatedAuthors = await addAuthorToResource(resourceId, userIdToAdd, roleDescription);
    revalidatePath(`/admin/projects/.*/.*/categories/.*/resources/${resourceId}/edit`);
    return { success: true, data: { authors: updatedAuthors } };
  } catch (e: any) {
    return { success: false, error: e.message, errorCode: 'DB_ERROR' };
  }
}

export async function removeAuthorAction(resourceId: string, userIdToRemove: string, clientMockUserId?: string): Promise<ActionResult<{ authors: ResourceAuthor[] }>> {
  const permCheck = await verifyResourceCreatorPermission(resourceId, clientMockUserId);
  if ('error' in permCheck) return permCheck;

  try {
    const updatedAuthors = await removeAuthorFromResource(resourceId, userIdToRemove);
    revalidatePath(`/admin/projects/.*/.*/categories/.*/resources/${resourceId}/edit`);
    return { success: true, data: { authors: updatedAuthors } };
  } catch (e: any) {
    return { success: false, error: e.message, errorCode: 'DB_ERROR' };
  }
}

export async function updateAuthorRoleAction(resourceId: string, userIdToUpdate: string, newRoleDescription: string, clientMockUserId?: string): Promise<ActionResult<{ authors: ResourceAuthor[] }>> {
  const permCheck = await verifyResourceCreatorPermission(resourceId, clientMockUserId);
  if ('error' in permCheck) return permCheck;

  try {
    const updatedAuthors = await updateAuthorRoleInDb(resourceId, userIdToUpdate, newRoleDescription);
    revalidatePath(`/admin/projects/.*/.*/categories/.*/resources/${resourceId}/edit`);
    return { success: true, data: { authors: updatedAuthors } };
  } catch (e: any) {
    return { success: false, error: e.message, errorCode: 'DB_ERROR' };
  }
}

export async function transferOwnershipAction(resourceId: string, newCreatorId: string, clientMockUserId?: string): Promise<ActionResult<{ authors: ResourceAuthor[] }>> {
  const permCheck = await verifyResourceCreatorPermission(resourceId, clientMockUserId);
  if ('error' in permCheck) return permCheck;
  
  try {
    const updatedAuthors = await transferResourceOwnershipInDb(resourceId, newCreatorId);
    revalidatePath(`/admin/projects/.*/.*/categories/.*/resources/${resourceId}/edit`);
    return { success: true, data: { authors: updatedAuthors } };
  } catch (e: any) {
    return { success: false, error: e.message, errorCode: 'DB_ERROR' };
  }
}

export async function updateAuthorColorAction(resourceId: string, authorId: string, color: string | null, clientMockUserId?: string): Promise<ActionResult<{ authors: ResourceAuthor[] }>> {
  const permCheck = await verifyResourceCreatorPermission(resourceId, clientMockUserId);
  if ('error' in permCheck) return permCheck;

  try {
    const updatedAuthors = await updateAuthorColorInDb(resourceId, authorId, color);
    revalidatePath(`/admin/projects/.*/.*/categories/.*/resources/${resourceId}/edit`);
    return { success: true, data: { authors: updatedAuthors } };
  } catch (e: any) {
    return { success: false, error: e.message, errorCode: 'DB_ERROR' };
  }
}

    