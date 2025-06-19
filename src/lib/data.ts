
'use server';

import { getDb } from './db';
import type { Game, Category, Resource, Author, Tag, ResourceFile, GetResourcesParams, PaginatedResourcesResponse, ResourceLinks, ChangelogEntry, WebItem, AppItem, ArtMusicItem, ItemStats, ItemType, ItemWithDetails, GenericListItem, ProjectStatus, UserAppRole, CategoryTagGroupConfig, ProjectCategoryTagConfigurations, ProjectTagGroupSource, DynamicAvailableFilterTags, DynamicTagGroup, TagInGroupConfig, Review, ReviewInteractionCounts, UserStats, UserBadge, RankedResource, ProjectFormData, CategoryFormData, ResourceFormData, MainFileDetails, DynamicTagSelection, RawCategoryProjectDetails, FileChannelId, ResourceFileFormData, SectionTagFormData } from './types';
import { ITEM_TYPES_CONST, PROJECT_STATUSES_CONST, PROJECT_STATUS_NAMES, USER_APP_ROLES_CONST, FILE_CHANNELS } from './types';
import { calculateGenericItemSearchScore } from './utils';


// --- Helper Functions ---
const TAG_CONFIG_SEPARATOR = ":::CONFIG_JSON:::";

const mapConfigToTagInterface = (config: TagInGroupConfig, slugPrefix: string = 'tag'): Tag => ({
  id: config.id,
  name: config.name,
  slug: slugPrefix + '-' + config.name.toLowerCase().replace(/\s+/g, '-') + '-' + config.id.substring(0,4),
  description: undefined,
  color: config.color,
  text_color: config.text_color,
  border_color: config.border_color,
  hover_bg_color: config.hover_bg_color,
  hover_text_color: config.hover_text_color,
  hover_border_color: config.hover_border_color,
  icon_svg: config.icon_svg,
  type: 'misc', // Default type, can be overridden if group info is available
});

export const mapFileChannelToTagInterface = async (channelId: FileChannelId | string | undefined | null): Promise<Tag | null> => {
  if (!channelId) return null;
  const channelInfo = FILE_CHANNELS.find(fc => fc.id === channelId);
  if (!channelInfo) return null;

  return {
    id: channelInfo.id,
    name: channelInfo.name,
    slug: `channel-${channelInfo.id}`,
    description: channelInfo.description,
    color: channelInfo.color,
    text_color: channelInfo.textColor,
    border_color: channelInfo.borderColor,
    hover_bg_color: channelInfo.color, // Or a slightly different hover variant
    hover_text_color: channelInfo.textColor,
    hover_border_color: channelInfo.borderColor,
    icon_svg: undefined, // Channels don't have icons by default
    type: 'channel',
  };
};


const parseDescriptionAndConfigFromRow = (row: any): Category => {
  const rawDescription = row.description;
  let textDescription: string | null = null;
  let tagGroupConfigs: CategoryTagGroupConfig[] = [];

  if (rawDescription) {
    const parts = rawDescription.split(TAG_CONFIG_SEPARATOR);
    textDescription = parts[0] || null;
    if (parts.length > 1 && parts[1]) {
      try {
        const parsedConfigs = JSON.parse(parts[1]);
        if (Array.isArray(parsedConfigs)) {
          tagGroupConfigs = parsedConfigs.map((group: any) => ({
            id: group.id || 'group_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7),
            groupDisplayName: group.groupDisplayName || 'Unnamed Group',
            sortOrder: typeof group.sortOrder === 'number' ? group.sortOrder : 0,
            tags: Array.isArray(group.tags) ? group.tags.map((tag: any) => ({
              id: tag.id || 'tag_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7),
              name: tag.name || 'Unnamed Tag',
              color: tag.color,
              text_color: tag.text_color,
              border_color: tag.border_color,
              hover_bg_color: tag.hover_bg_color,
              hover_text_color: tag.hover_text_color,
              hover_border_color: tag.hover_border_color,
              icon_svg: tag.icon_svg,
            })) : [],
            appliesToFiles: typeof group.appliesToFiles === 'boolean' ? group.appliesToFiles : false,
          }));
        } else {
          // console.warn("Parsed tagGroupConfigs is not an array:", parsedConfigs);
          tagGroupConfigs = [];
        }
      } catch (e) {
        // console.error("Failed to parse tagGroupConfigs JSON:", e, "Raw JSON:", parts[1]);
        tagGroupConfigs = [];
      }
    }
  }

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: textDescription === "" ? null : textDescription,
    parentItemId: row.parent_item_id,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tagGroupConfigs: tagGroupConfigs,
    rawDescription: rawDescription, // Keep the raw combined string for updates
  } as Category;
};


export const generateSlugLocal = async (
  name: string,
  tableName: 'items' | 'categories' | 'resources' | 'resource_files' | 'section_tags',
  uniqueWithinFields?: { parent_item_id?: string; category_id?: string; item_type?: string; resource_id?: string }
): Promise<string> => {
  const db = await getDb();
  let effectiveName = name;
  if (!effectiveName) {
    // Fallback if name is empty, though forms should prevent this
    effectiveName = tableName + '-' + Date.now().toString(36);
  }

  let baseSlug = effectiveName.toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars except -
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text

  // Ensure baseSlug is not empty after sanitization
  if (baseSlug.length === 0) {
    baseSlug = tableName + '-' + Date.now().toString(36);
  }

  let slug = baseSlug;
  let counter = 1;
  let existingSlug;

  do {
    let query = 'SELECT slug FROM ' + tableName + ' WHERE slug = ?';
    const params: any[] = [slug];

    if (uniqueWithinFields?.parent_item_id && (tableName === 'categories' || tableName === 'resources')) {
      query += ' AND parent_item_id = ?';
      params.push(uniqueWithinFields.parent_item_id);
    }
    if (uniqueWithinFields?.category_id && tableName === 'resources') {
      query += ' AND category_id = ?';
      params.push(uniqueWithinFields.category_id);
    }
    if (uniqueWithinFields?.item_type && (tableName === 'items' || tableName === 'section_tags')) {
        query += ' AND item_type = ?';
        params.push(uniqueWithinFields.item_type);
    }
    if (uniqueWithinFields?.resource_id && tableName === 'resource_files') {
        query += ' AND resource_id = ?';
        params.push(uniqueWithinFields.resource_id);
    }

    existingSlug = await db.get(query, ...params);
    if (existingSlug) {
      slug = baseSlug + '-' + counter;
      counter++;
    }
  } while (existingSlug);

  return slug;
};


// --- Section Tag CRUD (for the pool of tags) ---
export const createSectionTagDefinition = async (itemType: ItemType, name: string, description?: string): Promise<Tag> => {
  const db = await getDb();
  const slug = await generateSlugLocal(name, 'section_tags', { item_type: itemType });
  const tagId = 'stag_' + slug.replace(/-/g, '_') + '_' + itemType.substring(0,3) + '_' + Date.now().toString(36).slice(-4);

  await db.run(
    'INSERT INTO section_tags (id, item_type, name, slug, description) VALUES (?, ?, ?, ?, ?)',
    tagId, itemType, name, slug, description || null
  );
  const newTag = await db.get('SELECT * FROM section_tags WHERE id = ?', tagId);
  if (!newTag) throw new Error("Failed to retrieve created section tag.");
  return {
    id: newTag.id, name: newTag.name, slug: newTag.slug, description: newTag.description, type: 'section',
    color: newTag.color, text_color: newTag.text_color, border_color: newTag.border_color,
    hover_bg_color: newTag.hover_bg_color, hover_text_color: newTag.hover_text_color, hover_border_color: newTag.hover_border_color,
    icon_svg: newTag.icon_svg
  };
};

export const updateSectionTagDefinition = async (tagId: string, newName: string, newDescription?: string): Promise<Tag | undefined> => {
  const db = await getDb();
  const currentTag = await db.get('SELECT * FROM section_tags WHERE id = ?', tagId);
  if (!currentTag) return undefined;

  let newSlug = currentTag.slug;
  if (newName !== currentTag.name) {
    newSlug = await generateSlugLocal(newName, 'section_tags', { item_type: currentTag.item_type });
  }

  await db.run(
    'UPDATE section_tags SET name = ?, slug = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    newName, newSlug, newDescription ?? currentTag.description, tagId
  );
  const updatedTag = await db.get('SELECT * FROM section_tags WHERE id = ?', tagId);
  return updatedTag ? {
    id: updatedTag.id, name: updatedTag.name, slug: updatedTag.slug, description: updatedTag.description, type: 'section',
    color: updatedTag.color, text_color: updatedTag.text_color, border_color: updatedTag.border_color,
    hover_bg_color: updatedTag.hover_bg_color, hover_text_color: updatedTag.hover_text_color, hover_border_color: updatedTag.hover_border_color,
    icon_svg: updatedTag.icon_svg
  } : undefined;
};

export const deleteSectionTagDefinition = async (tagId: string): Promise<boolean> => {
  const db = await getDb();
  try {
    await db.exec('BEGIN TRANSACTION');
    // Desasignar de todos los proyectos
    await db.run('DELETE FROM project_section_tags WHERE section_tag_id = ?', tagId);
    // Eliminar el tag del pool
    const result = await db.run('DELETE FROM section_tags WHERE id = ?', tagId);
    await db.exec('COMMIT');
    return (result.changes ?? 0) > 0;
  } catch (error) {
    await db.exec('ROLLBACK');
    console.error("Error deleting section tag definition:", error);
    throw error; // Re-throw para que la acción pueda capturarlo
  }
};


export const getSectionTagsForItemType = async (itemType: ItemType): Promise<Tag[]> => {
  const db = await getDb();
  const rows = await db.all('SELECT * FROM section_tags WHERE item_type = ? ORDER BY name ASC', itemType);
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    color: row.color, // Keep style fields for TagBadge compatibility
    text_color: row.text_color,
    border_color: row.border_color,
    hover_bg_color: row.hover_bg_color,
    hover_text_color: row.hover_text_color,
    hover_border_color: row.hover_border_color,
    icon_svg: row.icon_svg,
    type: 'section', // Ensure type is 'section'
  }));
};

export const getSectionTagsForProject = async (projectId: string): Promise<Tag[]> => {
  const db = await getDb();
  const rows = await db.all(
    'SELECT st.* FROM section_tags st JOIN project_section_tags pst ON st.id = pst.section_tag_id WHERE pst.project_id = ? ORDER BY st.name ASC',
    projectId
  );
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    color: row.color,
    text_color: row.text_color,
    border_color: row.border_color,
    hover_bg_color: row.hover_bg_color,
    hover_text_color: row.hover_text_color,
    hover_border_color: row.hover_border_color,
    icon_svg: row.icon_svg,
    type: 'section',
  }));
};

export const addSectionTagToProject = async (projectId: string, sectionTagId: string): Promise<void> => {
  const db = await getDb();
  await db.run('INSERT OR IGNORE INTO project_section_tags (project_id, section_tag_id) VALUES (?, ?)', projectId, sectionTagId);
};

export const removeSectionTagFromProject = async (projectId: string, sectionTagId: string): Promise<void> => {
  const db = await getDb();
  await db.run('DELETE FROM project_section_tags WHERE project_id = ? AND section_tag_id = ?', projectId, sectionTagId);
};

// --- Item (Project) Functions ---
export const getItemBySlugGeneric = async (
  slugOrId: string,
  itemType: ItemType,
  byId: boolean = false,
  adminAccess: boolean = false // Determines if draft/archived items are returned
): Promise<GenericListItem | undefined> => {
  const db = await getDb();
  let queryCondition = byId ? "i.id = ?" : "i.slug = ?";
  queryCondition += " AND i.item_type = ?";

  const itemRow = await db.get(
    'SELECT i.* FROM items i WHERE ' + queryCondition,
    slugOrId,
    itemType
  );

  if (!itemRow) return undefined;

  if (!adminAccess && itemRow.status === 'archived') return undefined;
  if (!adminAccess && itemRow.status === 'draft' && !byId) { // If accessing by slug and it's a draft, don't show to public
      return undefined;
  }

  const sectionTagsForItem = await getSectionTagsForProject(itemRow.id);

  return {
    id: itemRow.id,
    name: itemRow.name,
    slug: itemRow.slug,
    description: itemRow.description,
    longDescription: itemRow.long_description || undefined,
    bannerUrl: itemRow.banner_url,
    iconUrl: itemRow.icon_url,
    createdAt: itemRow.created_at || undefined,
    updatedAt: itemRow.updated_at || undefined,
    itemType: itemRow.item_type as ItemType,
    projectUrl: itemRow.project_url || undefined,
    authorDisplayName: itemRow.author_display_name || undefined,
    status: itemRow.status as ProjectStatus,
    followers_count: itemRow.followers_count || 0,
    tags: sectionTagsForItem,
  };
};

export const getGameBySlug = async (slug: string): Promise<Game | undefined> => getItemBySlugGeneric(slug, 'game') as Promise<Game | undefined>;
export const getWebItemBySlug = async (slug: string): Promise<WebItem | undefined> => getItemBySlugGeneric(slug, 'web') as Promise<WebItem | undefined>;
export const getAppItemBySlug = async (slug: string): Promise<AppItem | undefined> => getItemBySlugGeneric(slug, 'app') as Promise<AppItem | undefined>;
export const getArtMusicItemBySlug = async (slug: string): Promise<ArtMusicItem | undefined> => getItemBySlugGeneric(slug, 'art-music') as Promise<ArtMusicItem | undefined>;


export const getCategoriesForItemGeneric = async (itemIdOrSlug: string, itemType: ItemType): Promise<Category[]> => {
  const db = await getDb();
  let itemIdToQuery = itemIdOrSlug;

  const isLikelySlug = !/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(itemIdOrSlug) &&
                       !itemIdOrSlug.startsWith('item_') &&
                       !itemIdOrSlug.startsWith('cat_') &&
                       itemIdOrSlug.includes('-');

  if (isLikelySlug) {
      const parentItem = await getItemBySlugGeneric(itemIdOrSlug, itemType, false, true); // Use adminAccess true to get parent even if draft
      if (!parentItem) {
        console.warn(`[getCategoriesForItemGeneric] Parent item with slug "${itemIdOrSlug}" and type "${itemType}" not found.`);
        return [];
      }
      itemIdToQuery = parentItem.id;
  }

  const rows = await db.all('SELECT * FROM categories WHERE parent_item_id = ? ORDER BY sort_order ASC, name ASC', itemIdToQuery);
  return rows.map(row => parseDescriptionAndConfigFromRow(row));
};


export const getItemStatsGeneric = async (itemId: string, itemType: ItemType): Promise<ItemStats> => {
  const db = await getDb();

  const resourceCountResult = await db.get(
    "SELECT COUNT(*) as count FROM resources WHERE parent_item_id = ? AND status = 'published'",
    itemId
  );
  const totalResources = resourceCountResult?.count || 0;

  const downloadsResult = await db.get(
    "SELECT SUM(r.downloads) as totalDownloads FROM resources r WHERE r.parent_item_id = ? AND r.status = 'published'",
    itemId
  );
  const totalDownloads = downloadsResult?.totalDownloads || 0;

  const itemFollowersResult = await db.get(
    "SELECT followers_count FROM items WHERE id = ?",
    itemId
  );
  const totalFollowers = itemFollowersResult?.followers_count || 0;

  // totalViews remains a placeholder for now
  const totalViews = Math.floor(Math.random() * 20000) + totalResources + (totalDownloads || 0) + (totalFollowers || 0);


  return {
    totalResources,
    totalDownloads,
    totalFollowers,
    totalViews, // Placeholder
  };
};


export const getAllItemsWithDetails = async (): Promise<ItemWithDetails[]> => {
  const db = await getDb();
  const itemRows = await db.all("SELECT * FROM items ORDER BY item_type, created_at DESC");
  return Promise.all(
    itemRows.map(async (itemRow) => {
      const categories = await getCategoriesForItemGeneric(itemRow.id, itemRow.item_type as ItemType);
      const stats = await getItemStatsGeneric(itemRow.id, itemRow.item_type as ItemType);
      const baseItem = await getItemBySlugGeneric(itemRow.id, itemRow.item_type as ItemType, true, true); // adminAccess true
      return { ...(baseItem as GenericListItem), categories, stats } as ItemWithDetails;
    })
  );
};

const getPublishedItemsWithDetailsByType = async (itemType: ItemType): Promise<ItemWithDetails[]> => {
  const db = await getDb();
  const itemRows = await db.all("SELECT * FROM items WHERE item_type = ? AND status = 'published' ORDER BY created_at DESC", itemType);
  return Promise.all(
    itemRows.map(async (itemRow) => {
      const categories = await getCategoriesForItemGeneric(itemRow.id, itemRow.item_type as ItemType);
      const stats = await getItemStatsGeneric(itemRow.id, itemRow.item_type as ItemType);
      const baseItem = await getItemBySlugGeneric(itemRow.id, itemRow.item_type as ItemType, true, false); // adminAccess false for public
      return { ...(baseItem as GenericListItem), categories, stats } as ItemWithDetails;
    })
  );
};

export const getGamesWithDetails = async (): Promise<ItemWithDetails[]> => getPublishedItemsWithDetailsByType('game');
export const getWebItemsWithDetails = async (): Promise<ItemWithDetails[]> => getPublishedItemsWithDetailsByType('web');
export const getAppItemsWithDetails = async (): Promise<ItemWithDetails[]> => getPublishedItemsWithDetailsByType('app');
export const getArtMusicItemsWithDetails = async (): Promise<ItemWithDetails[]> => getPublishedItemsWithDetailsByType('art-music');

// --- Category Functions ---
export const getCategoryDetails = async (parentItemSlug: string, parentItemType: ItemType, categorySlug: string): Promise<Category | undefined> => {
  const db = await getDb();
  const parentItem = await getItemBySlugGeneric(parentItemSlug, parentItemType, false, true); // Admin access true to get parent context even if draft
  if (!parentItem) return undefined;
  const row = await db.get('SELECT * FROM categories WHERE parent_item_id = ? AND slug = ?', parentItem.id, categorySlug);
  return row ? parseDescriptionAndConfigFromRow(row) : undefined;
};

export const getRawCategoryDetailsForForm = async (projectSlug: string, itemType: ItemType, categorySlug: string): Promise<RawCategoryProjectDetails | undefined> => {
    const db = await getDb();
    const project = await getItemBySlugGeneric(projectSlug, itemType, false, true);
    if (!project) return undefined;
    const category = await db.get("SELECT id, name, slug FROM categories WHERE parent_item_id = ? AND slug = ?", project.id, categorySlug);
    if (!category) return undefined;

    return {
        projectName: project.name,
        projectSlug: project.slug,
        itemType: project.itemType,
        categoryName: category.name,
        categorySlug: category.slug,
        parentItemId: project.id,
        categoryId: category.id,
    };
};

// --- Resource Functions ---

export const getResourceForEdit = async (resourceSlugOrId: string, byId: boolean = false): Promise<Resource | undefined> => {
    const db = await getDb();
    const queryCondition = byId ? 'r.id = ?' : 'r.slug = ?';
    const row = await db.get('SELECT r.*, pi.name as parent_item_name, pi.slug as parent_item_slug, pi.item_type as parent_item_type, c.name as category_name, c.slug as category_slug FROM resources r JOIN items pi ON r.parent_item_id = pi.id JOIN categories c ON r.category_id = c.id WHERE ' + queryCondition, resourceSlugOrId);

    if (!row) return undefined;

    const categoryForResource = await getCategoryDetails(row.parent_item_slug, row.parent_item_type as ItemType, row.category_slug);

    const filesDb = await db.all("SELECT rf.*, ce.notes as changelog_notes FROM resource_files rf LEFT JOIN changelog_entries ce ON ce.resource_file_id = rf.id WHERE rf.resource_id = ? ORDER BY rf.updated_at DESC, rf.created_at DESC", row.id);
    const files: ResourceFile[] = [];
    for (const fileRow of filesDb) {
        let parsedSelectedFileTags: DynamicTagSelection = {};
        let fileDisplayTags: Tag[] = [];
        if (fileRow.selected_file_tags_json) {
            try {
                parsedSelectedFileTags = JSON.parse(fileRow.selected_file_tags_json);
                if (categoryForResource && categoryForResource.tagGroupConfigs) {
                  categoryForResource.tagGroupConfigs.forEach(groupConfig => {
                    if (groupConfig.appliesToFiles && parsedSelectedFileTags[groupConfig.id]) {
                      parsedSelectedFileTags[groupConfig.id]?.forEach(tagId => {
                        const tagConfig = (groupConfig.tags || []).find(t => t.id === tagId);
                        if (tagConfig) {
                          fileDisplayTags.push(mapConfigToTagInterface(tagConfig, groupConfig.groupDisplayName.toLowerCase().replace(/\s+/g, '-')));
                        }
                      });
                    }
                  });
                }
            } catch (e) {
                console.error(`Error parsing selected_file_tags_json for file ${fileRow.id}:`, e);
            }
        }
        files.push({
            id: fileRow.id,
            resourceId: fileRow.resource_id,
            name: fileRow.name,
            url: fileRow.url,
            versionName: fileRow.version_name,
            size: fileRow.size,
            channelId: fileRow.channel_id,
            channel: await mapFileChannelToTagInterface(fileRow.channel_id),
            downloads: fileRow.downloads || 0,
            createdAt: fileRow.created_at,
            updatedAt: fileRow.updated_at,
            changelogNotes: fileRow.changelog_notes || undefined,
            supportedVersions: [],
            supportedLoaders: [],
            selectedFileTags: parsedSelectedFileTags,
            selectedFileTagsJson: fileRow.selected_file_tags_json,
            fileDisplayTags: fileDisplayTags,
        });
    }

    let resourceDisplayTags: Tag[] = [];
    const selectedTagGroups: DynamicTagSelection = row.selected_dynamic_tags_json ? JSON.parse(row.selected_dynamic_tags_json) : {};

    if (categoryForResource && categoryForResource.tagGroupConfigs) {
        categoryForResource.tagGroupConfigs.forEach(group => {
            const selectedTagIdsInGroup = selectedTagGroups[group.id];
            if (selectedTagIdsInGroup && Array.isArray(selectedTagIdsInGroup)) {
                selectedTagIdsInGroup.forEach(tagId => {
                    const tagConfig = (group.tags || []).find(t => t.id === tagId);
                    if (tagConfig) {
                        resourceDisplayTags.push(mapConfigToTagInterface(tagConfig, group.groupDisplayName.toLowerCase().replace(/\s+/g, '-')));
                    }
                });
            }
        });
    }


    return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        parentItemId: row.parent_item_id,
        parentItemSlug: row.parent_item_slug,
        parentItemType: row.parent_item_type as ItemType,
        parentItemName: row.parent_item_name,
        categoryId: row.category_id,
        categorySlug: row.category_slug,
        categoryName: row.category_name,
        authorId: row.author_id,
        author: { id: row.author_id, name: '', usertag: '', role: 'usuario'},
        version: row.version,
        description: row.description,
        detailedDescription: row.detailed_description,
        imageUrl: row.image_url,
        imageGallery: row.image_gallery ? JSON.parse(row.image_gallery) : [],
        links: row.links ? JSON.parse(row.links) : {},
        requirements: row.requirements,
        status: row.status as ProjectStatus,
        selectedDynamicTagsJson: row.selected_dynamic_tags_json,
        mainFileDetailsJson: row.main_file_details_json,
        downloads: row.downloads || 0,
        followers: row.followers || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        tags: resourceDisplayTags,
        files: files,
    } as Resource;
};


export const getResources = async (params: GetResourcesParams): Promise<PaginatedResourcesResponse> => {
  const db = await getDb();
  const {
    parentItemSlug,
    parentItemType,
    categorySlug,
    selectedTagIds,
    searchQuery,
    sortBy = 'relevance',
    page = 1,
    limit = 20,
    includeDrafts = false,
  } = params;

  if (!parentItemSlug || !parentItemType || !categorySlug) {
    return { resources: [], total: 0, hasMore: false };
  }

  const parentItem = await getItemBySlugGeneric(parentItemSlug, parentItemType, false, true); // Admin access for parent context
  if (!parentItem) {
    return { resources: [], total: 0, hasMore: false };
  }
  const category = await getCategoryDetails(parentItemSlug, parentItemType, categorySlug);
  if (!category) {
    return { resources: [], total: 0, hasMore: false };
  }

  let whereClauses: string[] = ['r.parent_item_id = ?', 'r.category_id = ?'];
  const queryParams: any[] = [parentItem.id, category.id];

  if (!includeDrafts) {
    whereClauses.push("r.status = 'published'");
  }

  if (searchQuery) {
    whereClauses.push('(LOWER(r.name) LIKE LOWER(?) OR LOWER(r.description) LIKE LOWER(?))');
    queryParams.push('%' + searchQuery + '%', '%' + searchQuery + '%');
  }

  if (selectedTagIds && selectedTagIds.length > 0) {
    selectedTagIds.forEach(tagId => {
      whereClauses.push(`instr(r.selected_dynamic_tags_json, '"' || ? || '"') > 0`);
      queryParams.push(tagId);
    });
  }

  const whereString = whereClauses.join(' AND ');

  let orderByClause = '';
  const orderByQueryParams: any[] = [];

  if (sortBy === 'name') orderByClause = 'ORDER BY r.name ASC';
  else if (sortBy === 'updatedAt') orderByClause = 'ORDER BY r.updated_at DESC';
  else if (sortBy === 'downloads') orderByClause = 'ORDER BY r.downloads DESC';
  else {
      if (searchQuery) {
          orderByClause = 'ORDER BY CASE WHEN LOWER(r.name) = LOWER(?) THEN 0 ELSE 1 END, CASE WHEN LOWER(r.name) LIKE LOWER(?) THEN 1 ELSE 2 END, r.updated_at DESC';
          orderByQueryParams.push(searchQuery.toLowerCase(), searchQuery.toLowerCase() + '%');
      } else {
          orderByClause = 'ORDER BY r.downloads DESC, r.updated_at DESC';
      }
  }

  const mainQueryParams = [...queryParams, ...orderByQueryParams, limit, (page - 1) * limit];
  const countQueryParams = [...queryParams];

  let countQuery = 'SELECT COUNT(DISTINCT r.id) as total FROM resources r WHERE ' + whereString;
  let query = 'SELECT r.*, p.name as author_name, p.usertag as author_usertag, p.avatar_url as author_avatar_url, pi.name as parent_item_name, pi.slug as parent_item_slug, pi.item_type as parent_item_type, c.name as category_name, c.slug as category_slug FROM resources r JOIN profiles p ON r.author_id = p.id JOIN items pi ON r.parent_item_id = pi.id JOIN categories c ON r.category_id = c.id WHERE ' + whereString + ' ' + orderByClause + ' LIMIT ? OFFSET ?';

  try {
    const resourceRows = await db.all(query, ...mainQueryParams);
    const totalRow = await db.get(countQuery, ...countQueryParams);

    const filteredTotal = totalRow?.total || 0;

    let resources = await Promise.all(resourceRows.map(async (row) => {
      const categoryForResource = category;

      let resourceDisplayTags: Tag[] = [];
      const selectedTagGroups: DynamicTagSelection = row.selected_dynamic_tags_json ? JSON.parse(row.selected_dynamic_tags_json) : {};

      if (categoryForResource && categoryForResource.tagGroupConfigs) {
        categoryForResource.tagGroupConfigs.forEach(group => {
          const selectedTagIdsInGroup = selectedTagGroups[group.id];
          if (selectedTagIdsInGroup && Array.isArray(selectedTagIdsInGroup)) {
            selectedTagIdsInGroup.forEach(tagId => {
              const tagConfig = (group.tags || []).find(t => t.id === tagId);
              if (tagConfig) {
                resourceDisplayTags.push(mapConfigToTagInterface(tagConfig, group.groupDisplayName.toLowerCase().replace(/\s+/g, '-')));
              }
            });
          }
        });
      }

      const filesDb = await db.all("SELECT rf.*, ce.notes as changelog_notes FROM resource_files rf LEFT JOIN changelog_entries ce ON ce.resource_file_id = rf.id WHERE rf.resource_id = ? ORDER BY rf.updated_at DESC, rf.created_at DESC", row.id);
      const files: ResourceFile[] = [];
        for (const fileRow of filesDb) {
            let parsedSelectedFileTags: DynamicTagSelection = {};
            let fileDisplayTags: Tag[] = [];
            if (fileRow.selected_file_tags_json) {
                try {
                    parsedSelectedFileTags = JSON.parse(fileRow.selected_file_tags_json);
                     if (categoryForResource && categoryForResource.tagGroupConfigs) {
                        categoryForResource.tagGroupConfigs.forEach(groupConfig => {
                            if (groupConfig.appliesToFiles && parsedSelectedFileTags[groupConfig.id]) {
                            parsedSelectedFileTags[groupConfig.id]?.forEach(tagId => {
                                const tagConfig = (groupConfig.tags || []).find(t => t.id === tagId);
                                if (tagConfig) {
                                fileDisplayTags.push(mapConfigToTagInterface(tagConfig, groupConfig.groupDisplayName.toLowerCase().replace(/\s+/g, '-')));
                                }
                            });
                            }
                        });
                    }
                } catch (e) {
                    console.error(`Error parsing selected_file_tags_json for file ${fileRow.id}:`, e);
                }
            }
            files.push({
                id: fileRow.id, resourceId: fileRow.resource_id, name: fileRow.name, url: fileRow.url,
                versionName: fileRow.version_name, size: fileRow.size, channelId: fileRow.channel_id,
                channel: await mapFileChannelToTagInterface(fileRow.channel_id),
                downloads: fileRow.downloads || 0, createdAt: fileRow.created_at, updatedAt: fileRow.updated_at,
                changelogNotes: fileRow.changelog_notes || undefined,
                supportedVersions: [], supportedLoaders: [],
                selectedFileTags: parsedSelectedFileTags,
                selectedFileTagsJson: fileRow.selected_file_tags_json,
                fileDisplayTags: fileDisplayTags,
            });
        }

      return {
        id: row.id, name: row.name, slug: row.slug,
        parentItemId: row.parent_item_id, parentItemName: row.parent_item_name, parentItemSlug: row.parent_item_slug, parentItemType: row.parent_item_type as ItemType,
        categoryId: row.category_id, categoryName: row.category_name, categorySlug: row.category_slug,
        authorId: row.author_id, author: { id: row.author_id, name: row.author_name, usertag: row.author_usertag, avatarUrl: row.author_avatar_url, role: 'usuario' },
        version: row.version, description: row.description, detailedDescription: row.detailed_description,
        imageUrl: row.image_url, imageGallery: row.image_gallery ? JSON.parse(row.image_gallery) : [],
        downloads: row.downloads || 0,
        followers: row.followers || 0,
        links: row.links ? JSON.parse(row.links) : {},
        requirements: row.requirements, createdAt: row.created_at, updatedAt: row.updated_at,
        rating: row.rating, reviewCount: row.review_count, positiveReviewPercentage: row.positive_review_percentage,
        status: row.status as ProjectStatus,
        tags: resourceDisplayTags,
        files,
        selectedDynamicTagsJson: row.selected_dynamic_tags_json,
        mainFileDetailsJson: row.main_file_details_json,
      } as Resource;
    }));

    return { resources, total: filteredTotal, hasMore: page * limit < filteredTotal };
  } catch (e: any) {
    console.error("[getResources DB Error]", e.message, "Query:", query, "Params:", mainQueryParams);
    return { resources: [], total: 0, hasMore: false };
  }
};

export const getBestMatchForCategoryAction = async (parentItemSlug: string, parentItemType: ItemType, categorySlug: string, searchQuery: string, limit: number = 3): Promise<Resource[]> => {
  const { resources } = await getResources({ parentItemSlug, parentItemType, categorySlug, searchQuery, sortBy: 'relevance', page: 1, limit });
  return resources;
};

export const getResourceBySlug = async (slug: string): Promise<Resource | undefined> => {
  const db = await getDb();
  const row = await db.get('SELECT r.*, p.name as author_name, p.usertag as author_usertag, p.avatar_url as author_avatar_url, pi.name as parent_item_name, pi.slug as parent_item_slug, pi.item_type as parent_item_type, c.name as category_name, c.slug as category_slug FROM resources r JOIN profiles p ON r.author_id = p.id JOIN items pi ON r.parent_item_id = pi.id JOIN categories c ON r.category_id = c.id WHERE r.slug = ? AND (r.status = "published" OR r.status = "draft")', slug);

  if (!row) return undefined;

  const categoryForResource = await getCategoryDetails(row.parent_item_slug, row.parent_item_type as ItemType, row.category_slug);

  let resourceDisplayTags: Tag[] = [];
  const selectedTagGroups: DynamicTagSelection = row.selected_dynamic_tags_json ? JSON.parse(row.selected_dynamic_tags_json) : {};

  if (categoryForResource && categoryForResource.tagGroupConfigs) {
    categoryForResource.tagGroupConfigs.forEach(group => {
      const selectedTagIdsInGroup = selectedTagGroups[group.id];
      if (selectedTagIdsInGroup && Array.isArray(selectedTagIdsInGroup)) {
         selectedTagIdsInGroup.forEach(tagId => {
            const tagConfig = (group.tags || []).find(t => t.id === tagId);
            if (tagConfig) {
              resourceDisplayTags.push(mapConfigToTagInterface(tagConfig, group.groupDisplayName.toLowerCase().replace(/\s+/g, '-')));
            }
        });
      }
    });
  }

  const filesDb = await db.all("SELECT rf.*, ce.notes as changelog_notes FROM resource_files rf LEFT JOIN changelog_entries ce ON ce.resource_file_id = rf.id WHERE rf.resource_id = ? ORDER BY rf.updated_at DESC, rf.created_at DESC", row.id);
  const files: ResourceFile[] = [];
    for (const fileRow of filesDb) {
        let parsedSelectedFileTags: DynamicTagSelection = {};
        let fileDisplayTags: Tag[] = [];
        if (fileRow.selected_file_tags_json) {
            try {
                parsedSelectedFileTags = JSON.parse(fileRow.selected_file_tags_json);
                if (categoryForResource && categoryForResource.tagGroupConfigs) {
                  categoryForResource.tagGroupConfigs.forEach(groupConfig => {
                    if (groupConfig.appliesToFiles && parsedSelectedFileTags[groupConfig.id]) {
                      parsedSelectedFileTags[groupConfig.id]?.forEach(tagId => {
                        const tagConfig = (groupConfig.tags || []).find(t => t.id === tagId);
                        if (tagConfig) {
                          fileDisplayTags.push(mapConfigToTagInterface(tagConfig, groupConfig.groupDisplayName.toLowerCase().replace(/\s+/g, '-')));
                        }
                      });
                    }
                  });
                }
            } catch (e) {
                console.error(`Error parsing selected_file_tags_json for file ${fileRow.id}:`, e);
            }
        }
        files.push({
            id: fileRow.id, resourceId: fileRow.resource_id, name: fileRow.name, url: fileRow.url,
            versionName: fileRow.version_name, size: fileRow.size, channelId: fileRow.channel_id,
            channel: await mapFileChannelToTagInterface(fileRow.channel_id),
            downloads: fileRow.downloads || 0, createdAt: fileRow.created_at, updatedAt: fileRow.updated_at,
            changelogNotes: fileRow.changelog_notes || undefined,
            supportedVersions: [], supportedLoaders: [],
            selectedFileTags: parsedSelectedFileTags,
            selectedFileTagsJson: fileRow.selected_file_tags_json,
            fileDisplayTags: fileDisplayTags,
        });
    }

    const reviewRows = await db.all(
        'SELECT rev.*, p_author.name as author_name, p_author.usertag as author_usertag, p_author.avatar_url as author_avatar_url ' +
        'FROM reviews rev ' +
        'JOIN profiles p_author ON rev.author_id = p_author.id ' +
        'WHERE rev.resource_id = ? ' +
        'ORDER BY rev.created_at DESC', // Default sort, most_helpful logic will be applied below
    row.id
    );

    let reviews: Review[] = reviewRows.map(revRow => ({
        id: revRow.id,
        resourceId: revRow.resource_id,
        authorId: revRow.author_id,
        resourceVersion: revRow.resource_version,
        isRecommended: Boolean(revRow.is_recommended),
        comment: revRow.comment,
        createdAt: revRow.created_at,
        updatedAt: revRow.updated_at,
        interactionCounts: revRow.interaction_counts ? JSON.parse(revRow.interaction_counts) : { helpful: 0, unhelpful: 0, funny: 0 },
        // isMostHelpful will be set dynamically
        author: {
            id: revRow.author_id,
            name: revRow.author_name,
            usertag: revRow.author_usertag,
            avatarUrl: revRow.author_avatar_url,
            role: 'usuario',
        }
    }));

    if (reviews.length > 0) {
      let mostHelpfulIdx = -1;
      let maxHelpfulCount = -1;
      reviews.forEach((rev, idx) => {
        const helpfulCount = rev.interactionCounts?.helpful || 0;
        if (helpfulCount > maxHelpfulCount) {
          maxHelpfulCount = helpfulCount;
          mostHelpfulIdx = idx;
        } else if (helpfulCount === maxHelpfulCount && helpfulCount > 0 && mostHelpfulIdx !== -1) {
          // Tie-breaking: prefer newer review among those with max helpful votes
          if (new Date(rev.createdAt) > new Date(reviews[mostHelpfulIdx].createdAt)) {
            mostHelpfulIdx = idx;
          }
        }
      });
      if (mostHelpfulIdx !== -1 && maxHelpfulCount > 0) {
        reviews = reviews.map((rev, idx) => ({ ...rev, isMostHelpful: idx === mostHelpfulIdx }));
      }
    }


  return {
    id: row.id, name: row.name, slug: row.slug,
    parentItemId: row.parent_item_id, parentItemName: row.parent_item_name, parentItemSlug: row.parent_item_slug, parentItemType: row.parent_item_type as ItemType,
    categoryId: row.category_id, categoryName: row.category_name, categorySlug: row.category_slug,
    authorId: row.author_id, author: { id: row.author_id, name: row.author_name, usertag: row.author_usertag, avatarUrl: row.author_avatar_url, role: 'usuario' },
    version: row.version, description: row.description, detailedDescription: row.detailed_description,
    imageUrl: row.image_url, imageGallery: row.image_gallery ? JSON.parse(row.image_gallery) : [],
    downloads: row.downloads || 0,
    followers: row.followers || 0,
    links: row.links ? JSON.parse(row.links) : {},
    requirements: row.requirements, createdAt: row.created_at, updatedAt: row.updated_at,
    rating: row.rating, reviewCount: row.review_count, positiveReviewPercentage: row.positive_review_percentage,
    status: row.status as ProjectStatus,
    tags: resourceDisplayTags,
    files,
    reviews,
    selectedDynamicTagsJson: row.selected_dynamic_tags_json,
    mainFileDetailsJson: row.main_file_details_json,
  } as Resource;
};

export const getHighlightedResources = async (parentItemSlug: string, parentItemType: ItemType, categorySlug: string, limit: number = 5): Promise<Resource[]> => {
    const { resources } = await getResources({ parentItemSlug, parentItemType, categorySlug, sortBy: 'downloads', page: 1, limit });
    return resources;
};

export const getAvailableFilterTags = async (parentItemSlug: string, parentItemType: ItemType, categorySlug?: string): Promise<DynamicAvailableFilterTags> => {
  if (!categorySlug) return [];
  const category = await getCategoryDetails(parentItemSlug, parentItemType, categorySlug);
  if (!category || !category.tagGroupConfigs || category.tagGroupConfigs.length === 0) return [];

  return category.tagGroupConfigs
    .sort((a,b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map(groupConfig => ({
      id: groupConfig.id,
      displayName: groupConfig.groupDisplayName,
      tags: (groupConfig.tags || []).map(tag => ({
          id: tag.id,
          name: tag.name,
          color: tag.color,
          text_color: tag.text_color,
          border_color: tag.border_color,
          hover_bg_color: tag.hover_bg_color,
          hover_text_color: tag.hover_text_color,
          hover_border_color: tag.hover_border_color,
          icon_svg: tag.icon_svg,
      })),
      appliesToFiles: groupConfig.appliesToFiles || false,
  }));
};


// --- User/Profile Functions ---
export const getUserProfileByUsertag = async (usertagWithoutAt: string): Promise<Author | undefined> => {
  const db = await getDb();
  const usertagWithAt = usertagWithoutAt.startsWith('@') ? usertagWithoutAt : `@${usertagWithoutAt}`;
  const profileRow = await db.get("SELECT * FROM profiles WHERE usertag = ?", usertagWithAt);
  if (!profileRow) return undefined;

  const mockBadges: UserBadge[] = [];
  if (profileRow.role === 'admin') mockBadges.push({ id: 'badge-admin', name: 'Admin', icon: 'ShieldCheck', color: 'hsl(var(--destructive))', textColor: 'hsl(var(--destructive-foreground))' });
  if (profileRow.role === 'mod') mockBadges.push({ id: 'badge-mod', name: 'Moderator', icon: 'Shield', color: 'hsl(var(--primary))', textColor: 'hsl(var(--primary-foreground))' });
  // All users get a "verified" badge for now as part of mock data
  mockBadges.push({id: 'badge-verified', name: 'Verified', icon: 'CheckCircle', color: 'hsl(var(--accent))', textColor: 'hsl(var(--accent-foreground))' });


  return {
    id: profileRow.id,
    name: profileRow.name,
    usertag: profileRow.usertag, // Store with @ from DB
    avatarUrl: profileRow.avatar_url,
    bannerUrl: profileRow.banner_url,
    bio: profileRow.bio,
    role: profileRow.role as UserAppRole,
    socialLinks: profileRow.social_links ? JSON.parse(profileRow.social_links) : undefined,
    badges: mockBadges,
    createdAt: profileRow.created_at,
    updatedAt: profileRow.updated_at,
  };
};

export const getUserStats = async (userId: string): Promise<UserStats> => {
  const db = await getDb();

  const resourcesPublishedResult = await db.get(
    "SELECT COUNT(*) as count FROM resources WHERE author_id = ? AND status = 'published'",
    userId
  );
  const resourcesPublishedCount = resourcesPublishedResult?.count || 0;

  const reviewsPublishedResult = await db.get(
    "SELECT COUNT(*) as count FROM reviews WHERE author_id = ?",
    userId
  );
  const reviewsPublishedCount = reviewsPublishedResult?.count || 0;

  const userPublishedResources = await db.all(
    "SELECT rating, review_count FROM resources WHERE author_id = ? AND status = 'published' AND rating IS NOT NULL AND review_count > 0",
    userId
  );

  let totalWeightedRating = 0;
  let totalReviewCountForAllResources = 0;
  userPublishedResources.forEach(res => {
    totalWeightedRating += (res.rating * res.review_count);
    totalReviewCountForAllResources += res.review_count;
  });

  const overallResourceRating = totalReviewCountForAllResources > 0 ? (totalWeightedRating / totalReviewCountForAllResources) : null;

  return {
    followersCount: 0, // Placeholder as user followers are not tracked directly
    resourcesPublishedCount,
    reviewsPublishedCount,
    overallResourceRating,
    overallResourceReviewCount: totalReviewCountForAllResources,
  };
};

const hydrateResourceRows = async (rows: any[]): Promise<Resource[]> => {
  return Promise.all(rows.map(async (row) => {
    const categoryForResource = await getCategoryDetails(row.parent_item_slug, row.parent_item_type as ItemType, row.category_slug);
    let resourceDisplayTags: Tag[] = [];
    const selectedTagGroups: DynamicTagSelection = row.selected_dynamic_tags_json ? JSON.parse(row.selected_dynamic_tags_json) : {};

    if (categoryForResource && categoryForResource.tagGroupConfigs) {
      categoryForResource.tagGroupConfigs.forEach(group => {
        const selectedTagIdsInGroup = selectedTagGroups[group.id];
        if (selectedTagIdsInGroup && Array.isArray(selectedTagIdsInGroup)) {
          selectedTagIdsInGroup.forEach(tagId => {
            const tagConfig = (group.tags || []).find(t => t.id === tagId);
            if (tagConfig) {
              resourceDisplayTags.push(mapConfigToTagInterface(tagConfig, group.groupDisplayName.toLowerCase().replace(/\s+/g, '-')));
            }
          });
        }
      });
    }
    
    const db = await getDb();
    const filesDb = await db.all("SELECT rf.*, ce.notes as changelog_notes FROM resource_files rf LEFT JOIN changelog_entries ce ON ce.resource_file_id = rf.id WHERE rf.resource_id = ? ORDER BY rf.updated_at DESC, rf.created_at DESC", row.id);
    const files: ResourceFile[] = [];
      for (const fileRow of filesDb) {
          let parsedSelectedFileTags: DynamicTagSelection = {};
          let fileDisplayTags: Tag[] = [];
          if (fileRow.selected_file_tags_json) {
              try {
                  parsedSelectedFileTags = JSON.parse(fileRow.selected_file_tags_json);
                  if (categoryForResource && categoryForResource.tagGroupConfigs) {
                    categoryForResource.tagGroupConfigs.forEach(groupConfig => {
                        if (groupConfig.appliesToFiles && parsedSelectedFileTags[groupConfig.id]) {
                        parsedSelectedFileTags[groupConfig.id]?.forEach(tagId => {
                            const tagConfig = (groupConfig.tags || []).find(t => t.id === tagId);
                            if (tagConfig) {
                            fileDisplayTags.push(mapConfigToTagInterface(tagConfig, groupConfig.groupDisplayName.toLowerCase().replace(/\s+/g, '-')));
                            }
                        });
                        }
                    });
                  }
              } catch (e) { console.error(`Error parsing selected_file_tags_json for file ${fileRow.id}:`, e); }
          }
          files.push({
              id: fileRow.id, resourceId: fileRow.resource_id, name: fileRow.name, url: fileRow.url,
              versionName: fileRow.version_name, size: fileRow.size, channelId: fileRow.channel_id,
              channel: await mapFileChannelToTagInterface(fileRow.channel_id),
              downloads: fileRow.downloads || 0, createdAt: fileRow.created_at, updatedAt: fileRow.updated_at,
              changelogNotes: fileRow.changelog_notes || undefined,
              supportedVersions: [], supportedLoaders: [],
              selectedFileTags: parsedSelectedFileTags,
              selectedFileTagsJson: fileRow.selected_file_tags_json,
              fileDisplayTags: fileDisplayTags,
          });
      }

    return {
      id: row.id, name: row.name, slug: row.slug,
      parentItemId: row.parent_item_id, parentItemName: row.parent_item_name, parentItemSlug: row.parent_item_slug, parentItemType: row.parent_item_type as ItemType,
      categoryId: row.category_id, categoryName: row.category_name, categorySlug: row.category_slug,
      authorId: row.author_id, author: { id: row.author_id, name: row.author_name, usertag: row.author_usertag, avatarUrl: row.author_avatar_url, role: 'usuario' },
      version: row.version, description: row.description, detailedDescription: row.detailed_description,
      imageUrl: row.image_url, imageGallery: row.image_gallery ? JSON.parse(row.image_gallery) : [],
      downloads: row.downloads || 0,
      followers: row.followers || 0,
      links: row.links ? JSON.parse(row.links) : {},
      requirements: row.requirements, createdAt: row.created_at, updatedAt: row.updated_at,
      rating: row.rating, reviewCount: row.review_count, positiveReviewPercentage: row.positive_review_percentage,
      status: row.status as ProjectStatus,
      tags: resourceDisplayTags,
      files: files,
      reviews: [], // Reviews not hydrated here for performance on lists
      selectedDynamicTagsJson: row.selected_dynamic_tags_json,
      mainFileDetailsJson: row.main_file_details_json,
    } as Resource;
  }));
};


export const getTopUserResources = async (userId: string, count: number = 3): Promise<RankedResource[]> => {
  const db = await getDb();
  const resourceRows = await db.all(`
    SELECT r.*,
           p.name as author_name, p.usertag as author_usertag, p.avatar_url as author_avatar_url,
           pi.name as parent_item_name, pi.slug as parent_item_slug, pi.item_type as parent_item_type,
           c.name as category_name, c.slug as category_slug
    FROM resources r
    JOIN profiles p ON r.author_id = p.id
    JOIN items pi ON r.parent_item_id = pi.id
    JOIN categories c ON r.category_id = c.id
    WHERE r.author_id = ? AND r.status = 'published'
    ORDER BY r.downloads DESC, r.rating DESC, r.updated_at DESC
    LIMIT ?
  `, userId, count);

  if (!resourceRows) return [];
  const hydratedResources = await hydrateResourceRows(resourceRows);
  return hydratedResources.map((res, index) => ({ ...res, rank: index + 1 }));
};

export async function getAuthorPublishedResources(
  userId: string,
  options: {
    limit?: number;
    sortBy?: 'updated_at' | 'created_at' | 'downloads' | 'rating';
    order?: 'ASC' | 'DESC';
    excludeIds?: string[];
  } = {}
): Promise<Resource[]> {
  const db = await getDb();
  const { limit, sortBy = 'created_at', order = 'DESC', excludeIds = [] } = options;

  let sql = `
    SELECT r.*,
           p.name as author_name, p.usertag as author_usertag, p.avatar_url as author_avatar_url,
           pi.name as parent_item_name, pi.slug as parent_item_slug, pi.item_type as parent_item_type,
           c.name as category_name, c.slug as category_slug
    FROM resources r
    JOIN profiles p ON r.author_id = p.id
    JOIN items pi ON r.parent_item_id = pi.id
    JOIN categories c ON r.category_id = c.id
    WHERE r.author_id = ? AND r.status = 'published'
  `;
  const queryParams: any[] = [userId];

  if (excludeIds.length > 0) {
    sql += ` AND r.id NOT IN (${excludeIds.map(() => '?').join(',')})`;
    queryParams.push(...excludeIds);
  }

  let orderByField = 'r.created_at';
  if (sortBy === 'updated_at') orderByField = 'r.updated_at';
  else if (sortBy === 'downloads') orderByField = 'r.downloads';
  else if (sortBy === 'rating') orderByField = 'r.rating';

  sql += ` ORDER BY ${orderByField} ${order === 'ASC' ? 'ASC' : 'DESC'}`;

  if (limit) {
    sql += ` LIMIT ?`;
    queryParams.push(limit);
  }

  const resourceRows = await db.all(sql, ...queryParams);
  if (!resourceRows) return [];

  return hydrateResourceRows(resourceRows);
}


// --- Admin Write Operations (used by server actions) ---

export const addProjectToDb = async (projectData: ProjectFormData): Promise<GenericListItem> => {
  const db = await getDb();
  const itemSlug = projectData.slug || await generateSlugLocal(projectData.name, 'items', { item_type: projectData.itemType });
  const itemId = 'item_' + itemSlug.replace(/-/g, '_') + '_' + Date.now().toString(36);

  await db.run(
    'INSERT INTO items (id, name, slug, description, long_description, banner_url, icon_url, item_type, project_url, author_display_name, status, followers_count, updated_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
    itemId, projectData.name, itemSlug, projectData.description,
    projectData.longDescription || null,
    projectData.bannerUrl || 'https://placehold.co/1200x400.png',
    projectData.iconUrl || 'https://placehold.co/128x128.png',
    projectData.itemType, projectData.projectUrl || null,
    projectData.authorDisplayName || null, projectData.status,
    0, // Initialize followers_count to 0
  );

  if (projectData.tagIds && projectData.tagIds.length > 0) {
    for (const tagId of projectData.tagIds) {
      await addSectionTagToProject(itemId, tagId);
    }
  }

  const createdItem = await getItemBySlugGeneric(itemSlug, projectData.itemType, false, true);
  if (!createdItem) throw new Error("Failed to retrieve created project after insert.");
  return createdItem;
};

export const updateProjectInDb = async (projectId: string, projectData: Partial<ProjectFormData>): Promise<GenericListItem | undefined> => {
  const db = await getDb();
  const currentProject = await db.get("SELECT * FROM items WHERE id = ?", projectId);
  if (!currentProject) throw new Error("Project not found for update.");

  let itemSlug = currentProject.slug;
  if (projectData.slug && projectData.slug.trim() !== '' && projectData.slug.trim() !== currentProject.slug) {
    itemSlug = await generateSlugLocal(projectData.slug.trim(), 'items', { item_type: projectData.itemType || currentProject.item_type });
  } else if (projectData.name && projectData.name !== currentProject.name && (!projectData.slug || projectData.slug.trim() === '')) {
    itemSlug = await generateSlugLocal(projectData.name, 'items', { item_type: projectData.itemType || currentProject.item_type });
  }

  await db.run(
    'UPDATE items SET name = ?, slug = ?, description = ?, long_description = ?, banner_url = ?, icon_url = ?, project_url = ?, author_display_name = ?, status = ?, followers_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    projectData.name ?? currentProject.name, itemSlug, projectData.description ?? currentProject.description,
    projectData.longDescription ?? currentProject.long_description, projectData.bannerUrl ?? currentProject.banner_url,
    projectData.iconUrl ?? currentProject.icon_url, projectData.projectUrl ?? currentProject.project_url,
    projectData.authorDisplayName ?? currentProject.author_display_name, projectData.status ?? currentProject.status,
    projectData.followers_count ?? currentProject.followers_count ?? 0, // Ensure followers_count is handled
    projectId
  );

  if (projectData.tagIds !== undefined) {
    const currentTags = await getSectionTagsForProject(projectId);
    const currentTagIds = currentTags.map(t => t.id);
    const newTagIds = projectData.tagIds || [];

    const tagsToAdd = newTagIds.filter(id => !currentTagIds.includes(id));
    const tagsToRemove = currentTagIds.filter(id => !newTagIds.includes(id));

    for (const tagId of tagsToAdd) {
      await addSectionTagToProject(projectId, tagId);
    }
    for (const tagId of tagsToRemove) {
      await removeSectionTagFromProject(projectId, tagId);
    }
  }

  return getItemBySlugGeneric(itemSlug, (projectData.itemType || currentProject.item_type) as ItemType, false, true);
};

export const deleteProjectFromDb = async (projectId: string): Promise<boolean> => {
  const db = await getDb();
  await db.run('DELETE FROM project_section_tags WHERE project_id = ?', projectId);
  const result = await db.run('DELETE FROM items WHERE id = ?', projectId);
  return (result.changes ?? 0) > 0;
};

export const addCategoryToDb = async (parentItemId: string, categoryData: CategoryFormData & { description: string | null }): Promise<Category | undefined> => {
  const db = await getDb();
  const maxSortOrderResult = await db.get('SELECT MAX(sort_order) as max_order FROM categories WHERE parent_item_id = ?', parentItemId);
  let nextSortOrder = (maxSortOrderResult?.max_order ?? -1) + 1;

  const catSlug = categoryData.slug || await generateSlugLocal(categoryData.name, 'categories', { parent_item_id: parentItemId });
  const categoryId = 'cat_' + catSlug.replace(/-/g, '_') + '_' + parentItemId.substring(0,4) + '_' + Date.now().toString(36);

  const finalSortOrder = categoryData.sortOrder !== undefined && categoryData.sortOrder >= 0 ? categoryData.sortOrder : nextSortOrder;

  await db.run(
    'INSERT INTO categories (id, name, slug, description, parent_item_id, sort_order, updated_at, created_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
    categoryId, categoryData.name, catSlug, categoryData.description, parentItemId, finalSortOrder
  );
  const newCategoryRow = await db.get('SELECT * FROM categories WHERE id = ?', categoryId);
  return newCategoryRow ? parseDescriptionAndConfigFromRow(newCategoryRow) : undefined;
};

export const updateCategoryInDb = async (categoryId: string, categoryData: Partial<CategoryFormData> & { description?: string | null }): Promise<Category | undefined> => {
  const db = await getDb();
  const currentCategory = await db.get("SELECT * FROM categories WHERE id = ?", categoryId);
  if (!currentCategory) throw new Error('Category with ID ' + categoryId + ' not found for update.');

  let catSlug = currentCategory.slug;
  if ((categoryData.slug && categoryData.slug.trim() !== '' && categoryData.slug.trim() !== currentCategory.slug) ||
      (categoryData.name && categoryData.name !== currentCategory.name && (!categoryData.slug || categoryData.slug.trim() === ''))) {
    catSlug = await generateSlugLocal(categoryData.slug?.trim() || categoryData.name || currentCategory.name, 'categories', { parent_item_id: currentCategory.parent_item_id });
  }

  const finalSortOrder = categoryData.sortOrder !== undefined && categoryData.sortOrder >= -1
                         ? (categoryData.sortOrder === -1 ? currentCategory.sort_order : categoryData.sortOrder)
                         : currentCategory.sort_order;

  const descriptionForDb = categoryData.description !== undefined ? categoryData.description : currentCategory.description;

  await db.run(
    'UPDATE categories SET name = ?, slug = ?, description = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    categoryData.name ?? currentCategory.name, catSlug, descriptionForDb, finalSortOrder, categoryId
  );
  const updatedCategoryRow = await db.get('SELECT * FROM categories WHERE id = ?', categoryId);
  return updatedCategoryRow ? parseDescriptionAndConfigFromRow(updatedCategoryRow) : undefined;
};

export const deleteCategoryFromDb = async (categoryId: string): Promise<boolean> => {
  const db = await getDb();
  const result = await db.run('DELETE FROM categories WHERE id = ?', categoryId);
  return (result.changes ?? 0) > 0;
};

export const updateCategoryOrderInDb = async (itemId: string, orderedCategoryIds: string[]): Promise<boolean> => {
  const db = await getDb();
  try {
    await db.exec('BEGIN TRANSACTION');
    for (let i = 0; i < orderedCategoryIds.length; i++) {
      await db.run('UPDATE categories SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND parent_item_id = ?', i, orderedCategoryIds[i], itemId);
    }
    await db.exec('COMMIT'); return true;
  } catch (error) { await db.exec('ROLLBACK'); console.error("Error updating category order:", error); return false; }
};


export const getProjectCategoryTagConfigurations = async (projectId: string): Promise<ProjectCategoryTagConfigurations> => {
  const db = await getDb();
  const categoriesForProject = await db.all('SELECT id, name, slug, description FROM categories WHERE parent_item_id = ? ORDER BY sort_order, name', projectId);

  const allGroupSources: ProjectTagGroupSource[] = [];

  for (const catRow of categoriesForProject) {
    const parsedCategory = parseDescriptionAndConfigFromRow(catRow);
    if (parsedCategory.tagGroupConfigs && parsedCategory.tagGroupConfigs.length > 0) {
      parsedCategory.tagGroupConfigs.forEach(groupConfig => {
        allGroupSources.push({
          sourceCategoryId: parsedCategory.id,
          sourceCategoryName: parsedCategory.name,
          groupConfig: {
            ...groupConfig,
            appliesToFiles: typeof groupConfig.appliesToFiles === 'boolean' ? groupConfig.appliesToFiles : false,
            tags: (groupConfig.tags || []).map(tag => ({...tag}))
          },
        });
      });
    }
  }
  return allGroupSources;
};

export const incrementResourceDownloadCount = async (resourceId: string): Promise<boolean> => {
  const db = await getDb();
  const result = await db.run('UPDATE resources SET downloads = downloads + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', resourceId);
  return (result.changes ?? 0) > 0;
};

export const incrementResourceFileDownloadCount = async (fileId: string): Promise<boolean> => {
  const db = await getDb();
  const result = await db.run('UPDATE resource_files SET downloads = downloads + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', fileId);
  return (result.changes ?? 0) > 0;
};

