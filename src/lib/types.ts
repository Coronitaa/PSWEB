
import type { Database } from './supabase/database.types';

export type UserAppRole = Database['public']['Enums']['user_app_role_enum'];
export const USER_APP_ROLES_CONST: UserAppRole[] = ['usuario', 'vip', 'mod', 'admin'];

export type ItemType = Database['public']['Enums']['item_type_enum'];
export const ITEM_TYPES_CONST: ItemType[] = ['game', 'web', 'app', 'art-music'];
export const ITEM_TYPE_NAMES: Record<ItemType, string> = {
  game: 'Games',
  web: 'Web Projects',
  app: 'Applications',
  'art-music': 'Art & Music'
};

export type ProjectStatus = Database['public']['Enums']['project_status_enum'];
export const PROJECT_STATUSES_CONST: ProjectStatus[] = ['published', 'draft', 'archived'];
export const PROJECT_STATUS_NAMES: Record<ProjectStatus, string> = {
  published: 'Published',
  draft: 'Draft',
  archived: 'Archived',
};

export type UserBadgeIcon = Database['public']['Enums']['user_badge_icon_enum'];
export const USER_BADGE_ICONS_CONST: UserBadgeIcon[] = ['ShieldCheck', 'Star', 'CheckCircle', 'Shield', 'Edit3'];


export const FILE_CHANNELS = [
  { id: 'release', name: 'Release', color: 'hsl(145 63% 42%)', textColor: 'hsl(145 100% 98%)', borderColor: 'hsl(145 63% 35%)', description: 'Stable and tested version, recommended for most users.' },
  { id: 'beta',    name: 'Beta',    color: 'hsl(39 92% 55%)',  textColor: 'hsl(39 100% 10%)', borderColor: 'hsl(39 92% 48%)', description: 'Potentially unstable, for testing new features.' },
  { id: 'alpha',   name: 'Alpha',   color: 'hsl(0 72% 51%)',   textColor: 'hsl(0 100% 98%)',  borderColor: 'hsl(0 72% 45%)', description: 'Highly unstable, early development version.' },
] as const;

export type FileChannelId = typeof FILE_CHANNELS[number]['id'];


export interface UserBadge {
  id: string;
  name: string;
  icon?: UserBadgeIcon;
  color?: string;
  textColor?: string;
}

export interface Author {
  id: string;
  name: string | null;
  usertag: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  bio?: string | null;
  socialLinks?: {
    twitter?: string;
    github?: string;
    website?: string;
    linkedin?: string;
    discord?: string;
  } | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  role: UserAppRole;
  badges?: UserBadge[];
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  color?: string | null;
  text_color?: string | null;
  border_color?: string | null;
  hover_bg_color?: string | null;
  hover_text_color?: string | null;
  hover_border_color?: string | null;
  icon_svg?: string | null;
  type: 'version' | 'loader' | 'genre' | 'platform' | 'misc' | 'channel' | 'framework' | 'language' | 'tooling' | 'app-category' | 'art-style' | 'music-genre' | 'medium' | 'section';
}

export interface TagInGroupConfig {
  id: string;
  name: string;
  color?: string | null;
  text_color?: string | null;
  border_color?: string | null;
  hover_bg_color?: string | null;
  hover_text_color?: string | null;
  hover_border_color?: string | null;
  icon_svg?: string | null;
}

export type DynamicTagSelection = Record<string, string[] | undefined>;

export interface CategoryTagGroupConfig {
  id: string;
  groupDisplayName: string;
  tags: TagInGroupConfig[];
  sortOrder: number;
  appliesToFiles?: boolean;
}

export interface ResourceFileFormData {
  id?: string;
  name: string;
  url: string;
  versionName: string;
  size?: string;
  channelId?: FileChannelId | string | null;
  changelogNotes?: string;
  selectedFileTags?: DynamicTagSelection;
  createdAt?: string; // Added for edit scenario
  updatedAt?: string; // Added for edit scenario
}

export interface ResourceFile {
  id: string;
  resourceId: string;
  name: string;
  url: string;
  versionName: string;
  size?: string | null;
  channelId?: FileChannelId | string | null;
  channel?: Tag | null;
  downloads?: number;
  date?: string | null; 
  createdAt?: string;
  updatedAt?: string;
  changelogNotes?: string | null;
  supportedVersions: Tag[]; 
  supportedLoaders: Tag[];  
  selectedFileTags?: DynamicTagSelection; 
  selectedFileTagsJson?: string | null; 
  fileDisplayTags?: Tag[]; 
}


export interface ResourceLinks {
  discord?: string;
  wiki?: string;
  issues?: string;
  source?: string;
  projectUrl?: string;
}

export interface ChangelogEntry {
  id: string;
  resource_id: string;
  resource_file_id?: string | null; 
  version_name: string; 
  date: string; 
  notes: string; 
  createdAt?: string;
  updatedAt?: string;
}

export interface BaseItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription?: string | null;
  bannerUrl: string | null;
  iconUrl: string | null;
  itemType: ItemType;
  projectUrl?: string | null;
  authorDisplayName?: string | null;
  status: ProjectStatus;
  followers_count?: number; 
  createdAt?: string | null;
  updatedAt?: string | null;
  tags?: Tag[]; 
}

export interface Game extends BaseItem {
  itemType: 'game';
}

export interface WebItem extends BaseItem {
  itemType: 'web';
}

export interface AppItem extends BaseItem {
  itemType: 'app';
}

export interface ArtMusicItem extends BaseItem {
  itemType: 'art-music';
  
  
  
}

export type GenericListItem = Game | WebItem | AppItem | ArtMusicItem;

export interface ItemStats {
  totalResources: number;
  totalDownloads: number; 
  totalFollowers: number;
  totalViews?: number; 
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null; 
  parentItemId: string;
  sortOrder: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  tagGroupConfigs?: CategoryTagGroupConfig[];
  rawDescription?: string | null; 
}

export interface ReviewInteractionCounts {
  helpful: number;
  unhelpful: number;
  funny: number;
}

export interface Review {
  id: string;
  resourceId: string;
  resourceVersion: string; 
  authorId: string;
  author: Author;
  // rating?: number | null; // Rating is now derived on the resource, not stored per review
  isRecommended: boolean;
  comment: string;
  createdAt: string;
  updatedAt?: string | null;
  interactionCounts: ReviewInteractionCounts;
  isMostHelpful?: boolean | null; 
  // For UI state on client after interaction
  currentUserSentiment?: 'helpful' | 'unhelpful' | null;
  currentUserIsFunny?: boolean;
}

export interface MainFileDetails {
    name: string;
    url: string;
    versionName: string;
    size?: string;
    channel?: Tag;
}

export interface Resource {
  id: string;
  name: string;
  slug: string;
  parentItemId: string;
  parentItemName: string;
  parentItemSlug: string;
  parentItemType: ItemType;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  authorId: string;
  author: Author;
  version: string | null;
  description: string;
  detailedDescription: string | null;
  imageUrl: string | null;
  imageGallery?: string[] | null;
  downloads: number;
  followers: number; 
  links?: ResourceLinks | null;
  requirements?: string | null;
  createdAt: string;
  updatedAt: string | null;
  rating?: number | null; 
  reviewCount?: number | null;
  positiveReviewPercentage?: number | null; 
  status: ProjectStatus;
  tags: Tag[]; 
  files: ResourceFile[];
  changelogEntries?: ChangelogEntry[];
  reviews?: Review[];
  selectedDynamicTagsJson?: string | null; 
  mainFileDetailsJson?: string | null; 
}


export interface GetResourcesParams {
  parentItemSlug?: string;
  parentItemType?: ItemType;
  categorySlug?: string;
  selectedTagIds?: string[]; 
  searchQuery?: string;
  sortBy?: 'relevance' | 'downloads' | 'updatedAt' | 'name';
  page?: number;
  limit?: number;
  minScore?: number; 
  includeDrafts?: boolean; 
}

export interface PaginatedResourcesResponse {
  resources: Resource[];
  total: number;
  hasMore: boolean;
}

export interface ItemWithDetails extends GenericListItem {
  categories: Category[];
  stats: ItemStats;
}

export interface UserStats {
  followersCount: number;
  resourcesPublishedCount: number;
  reviewsPublishedCount: number;
  overallResourceRating: number | null;
  overallResourceReviewCount: number;
}

export interface RankedResource extends Resource {
  rank: number; 
}

export interface ProjectFormData {
  name: string;
  slug?: string;
  description: string;
  longDescription?: string;
  bannerUrl?: string;
  iconUrl?: string;
  itemType: ItemType;
  projectUrl?: string;
  authorDisplayName?: string;
  status: ProjectStatus;
  followers_count?: number;
  tagIds?: string[];
}

export type CategoryFormData = Omit<Category, 'id' | 'createdAt' | 'slug' | 'parentItemId' | 'tagGroupConfigs' | 'rawDescription' | 'updatedAt'> & {
  parentItemId: string;
  slug?: string; 
  tagGroupConfigs?: CategoryTagGroupConfig[];
};

export interface ResourceFormData {
  name: string;
  slug?: string; 
  version: string;
  description: string;
  detailedDescription?: string;
  imageUrl?: string;
  imageGallery?: string[]; 
  requirements?: string;
  links?: ResourceLinks;
  status: ProjectStatus;
  files: ResourceFileFormData[];
  selectedDynamicTags: DynamicTagSelection; 
}

export interface ReviewFormData {
  resourceVersion: string;
  isRecommended: boolean;
  comment: string;
  // rating?: number; // Removed as per previous discussion
}

export interface SectionTagFormData {
  itemType: ItemType;
  name: string;
  description?: string;
}

export interface ProfileUpdateFormData {
  name: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  socialLinks?: {
    github?: string;
    twitter?: string;
    website?: string;
    linkedin?: string;
    discord?: string;
  };
}


export interface ProjectTagGroupSource {
  sourceCategoryName: string;
  sourceCategoryId: string;
  groupConfig: CategoryTagGroupConfig;
}
export type ProjectCategoryTagConfigurations = ProjectTagGroupSource[];



export interface DynamicTagGroup {
  id: string; 
  displayName: string;
  tags: TagInGroupConfig[]; 
  appliesToFiles?: boolean; 
}
export type DynamicAvailableFilterTags = DynamicTagGroup[];

export interface RawCategoryProjectDetails {
  projectName: string;
  projectSlug: string;
  itemType: ItemType;
  categoryName: string;
  categorySlug: string;
  parentItemId: string;
  categoryId: string;
}

// Added for review interaction action result
export interface UpdateReviewInteractionResult {
  updatedCounts: ReviewInteractionCounts;
  currentUserSentiment: 'helpful' | 'unhelpful' | null;
  currentUserIsFunny: boolean;
}
    
// For getUserSentimentForReviewAction result
export interface UserSentimentForReview {
  sentiment: 'helpful' | 'unhelpful' | null;
  isFunny: boolean;
}
