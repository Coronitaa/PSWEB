
-- Enable pgcrypto for gen_random_uuid() if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUM Types
CREATE TYPE user_badge_icon_type AS ENUM (
  'ShieldCheck', 
  'Star', 
  'CheckCircle', 
  'Shield', 
  'Edit3'
);

CREATE TYPE item_type_enum AS ENUM (
  'game', 
  'web', 
  'app', 
  'art-music'
);

CREATE TYPE tag_type_enum AS ENUM (
  'version', 
  'loader', 
  'genre', 
  'platform', 
  'misc', 
  'channel', 
  'framework', 
  'language', 
  'tooling', 
  'app-category', 
  'art-style', 
  'music-genre'
);

-- Tables
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usertag VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  banner_url TEXT,
  bio TEXT,
  social_links JSONB, -- Store as {"twitter": "url", "github": "url"}
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP -- For profile updates
);
CREATE INDEX idx_users_usertag ON users(usertag);

CREATE TABLE badges (
  id VARCHAR(50) PRIMARY KEY, -- e.g., 'badge-admin', 'badge-verified'
  name VARCHAR(100) NOT NULL,
  icon user_badge_icon_type,
  color_class VARCHAR(50),    -- Tailwind CSS class for background
  text_color_class VARCHAR(50) -- Tailwind CSS class for text
);

CREATE TABLE user_applied_badges (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id VARCHAR(50) NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, badge_id)
);
CREATE INDEX idx_user_applied_badges_user_id ON user_applied_badges(user_id);
CREATE INDEX idx_user_applied_badges_badge_id ON user_applied_badges(badge_id);

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  tag_type tag_type_enum NOT NULL,
  color_class VARCHAR(50),
  text_color_class VARCHAR(50),
  UNIQUE (slug, tag_type) -- Ensure slug is unique within its type
);
CREATE INDEX idx_tags_slug ON tags(slug);
CREATE INDEX idx_tags_type ON tags(tag_type);

CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type item_type_enum NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  long_description TEXT,
  banner_url TEXT,
  icon_url TEXT,
  project_url TEXT,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  -- Specific fields for item types that are not complex relations
  artist_name VARCHAR(255), -- For 'art-music'
  medium_tag_id UUID REFERENCES tags(id) ON DELETE SET NULL, -- For 'art-music', if medium is a single tag
  UNIQUE (slug, item_type) -- Slug should be unique per item type
);
CREATE INDEX idx_items_slug_item_type ON items(slug, item_type);
CREATE INDEX idx_items_author_id ON items(author_id);
CREATE INDEX idx_items_item_type ON items(item_type);

CREATE TABLE item_tags ( -- General tags for any item
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);
CREATE INDEX idx_item_tags_item_id ON item_tags(item_id);
CREATE INDEX idx_item_tags_tag_id ON item_tags(tag_id);

-- Junction table for WebItem technologies (assuming technologies are stored in the 'tags' table)
CREATE TABLE item_technologies (
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);
CREATE INDEX idx_item_technologies_item_id ON item_technologies(item_id);
CREATE INDEX idx_item_technologies_tag_id ON item_technologies(tag_id);

-- Junction table for AppItem platforms (assuming platforms are stored in the 'tags' table)
CREATE TABLE item_platforms (
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);
CREATE INDEX idx_item_platforms_item_id ON item_platforms(item_id);
CREATE INDEX idx_item_platforms_tag_id ON item_platforms(tag_id);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  parent_item_type item_type_enum NOT NULL, -- So a category 'Maps' for 'game' is different from 'Maps' for 'app' if needed
  UNIQUE (slug, parent_item_type)
);
CREATE INDEX idx_categories_slug_parent_item_type ON categories(slug, parent_item_type);

CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,         -- Parent item (game, web, app, art-music)
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  image_url TEXT,
  image_gallery TEXT[], -- Array of image URLs
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  downloads INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  version VARCHAR(50),
  description TEXT,
  detailed_description TEXT,
  requirements TEXT,
  followers_count INTEGER DEFAULT 0,
  links JSONB, -- Store as {"discord": "url", "wiki": "url"}
  rating_avg NUMERIC(3, 2), -- e.g., 4.75, calculated from reviews, can be NULL
  rating_count INTEGER DEFAULT 0,
  positive_review_percentage NUMERIC(5,2) -- e.g., 95.50
);
CREATE INDEX idx_resources_slug ON resources(slug);
CREATE INDEX idx_resources_item_id ON resources(item_id);
CREATE INDEX idx_resources_category_id ON resources(category_id);
CREATE INDEX idx_resources_author_id ON resources(author_id);

CREATE TABLE resource_tags (
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (resource_id, tag_id)
);
CREATE INDEX idx_resource_tags_resource_id ON resource_tags(resource_id);
CREATE INDEX idx_resource_tags_tag_id ON resource_tags(tag_id);

CREATE TABLE resource_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  size VARCHAR(50),
  channel_tag_id UUID REFERENCES tags(id) ON DELETE SET NULL, -- FK to tags table where tag_type is 'channel'
  uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_resource_files_resource_id ON resource_files(resource_id);

CREATE TABLE resource_file_supported_versions (
  file_id UUID NOT NULL REFERENCES resource_files(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE, -- where tag_type is 'version'
  PRIMARY KEY (file_id, tag_id)
);

CREATE TABLE resource_file_supported_loaders (
  file_id UUID NOT NULL REFERENCES resource_files(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE, -- where tag_type is 'loader'
  PRIMARY KEY (file_id, tag_id)
);

CREATE TABLE changelog_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  version_name VARCHAR(100) NOT NULL,
  published_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  related_file_id UUID REFERENCES resource_files(id) ON DELETE SET NULL,
  game_version_tag_id UUID REFERENCES tags(id) ON DELETE SET NULL, -- FK to tags where tag_type is 'version'
  channel_tag_id UUID REFERENCES tags(id) ON DELETE SET NULL     -- FK to tags where tag_type is 'channel'
);
CREATE INDEX idx_changelog_entries_resource_id ON changelog_entries(resource_id);

CREATE TABLE changelog_entry_loader_tags (
  changelog_entry_id UUID NOT NULL REFERENCES changelog_entries(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE, -- where tag_type is 'loader'
  PRIMARY KEY (changelog_entry_id, tag_id)
);

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  resource_version VARCHAR(50), -- Version of the resource being reviewed
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_recommended BOOLEAN NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, -- If reviews can be edited
  helpful_count INTEGER DEFAULT 0,
  unhelpful_count INTEGER DEFAULT 0,
  funny_count INTEGER DEFAULT 0,
  is_most_helpful BOOLEAN DEFAULT FALSE -- Could be managed by a job or manually
);
CREATE INDEX idx_reviews_resource_id ON reviews(resource_id);
CREATE INDEX idx_reviews_author_id ON reviews(author_id);

-- Optional: Table to track individual review interactions if needed for more complex logic
-- CREATE TABLE review_interactions (
--   review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
--   user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--   interaction_type VARCHAR(20) NOT NULL CHECK (interaction_type IN ('helpful', 'unhelpful', 'funny')), -- Could be an ENUM
--   created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
--   PRIMARY KEY (review_id, user_id, interaction_type) -- A user can only vote once per type per review
-- );
-- CREATE INDEX idx_review_interactions_review_id ON review_interactions(review_id);
-- CREATE INDEX idx_review_interactions_user_id ON review_interactions(user_id);

-- Trigger function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables that need auto updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON resources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed data for Badges (example)
INSERT INTO badges (id, name, icon, color_class, text_color_class) VALUES
  ('badge-admin', 'Admin', 'ShieldCheck', 'bg-red-500', 'text-white'),
  ('badge-vip', 'VIP', 'Star', 'bg-yellow-400', 'text-black'),
  ('badge-mod', 'Moderator', 'Shield', 'bg-blue-500', 'text-white'),
  ('badge-verified', 'Verified Creator', 'CheckCircle', 'bg-green-500', 'text-white')
ON CONFLICT (id) DO NOTHING;

-- Seed data for Tags (example - you'd populate this with your commonTags)
-- INSERT INTO tags (id, name, slug, tag_type, color_class) VALUES
--   (gen_random_uuid(), '1.20.X', '1-20-x', 'version', 'bg-green-500'),
--   (gen_random_uuid(), 'Fabric', 'fabric', 'loader', 'bg-indigo-500')
-- ON CONFLICT (slug, tag_type) DO NOTHING;
-- ... add more seed data as needed for tags, categories etc.
-- Note: For commonTags with fixed IDs like 'tag-react', use those fixed IDs in your INSERTs if desired,
-- but ensure they are UUID format if the column is UUID, or change column type to VARCHAR for IDs.
-- The schema above uses UUID for tag.id for flexibility. If using predefined string IDs from commonTags,
-- you would change tags.id to VARCHAR(50) PRIMARY KEY and insert them directly.

