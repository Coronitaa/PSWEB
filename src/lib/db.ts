
'use server';

import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';
import path from 'path';

let dbInstance: Database | null = null;

const DB_FILE_PATH = path.join(process.cwd(), 'local.sqlite3');

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await open({
    filename: DB_FILE_PATH,
    driver: sqlite3.Database,
  });

  await initDbSchema(dbInstance);
  return dbInstance;
}

async function initDbSchema(db: Database): Promise<void> {
  await db.exec(
    'CREATE TABLE IF NOT EXISTS items (' +
    '  id TEXT PRIMARY KEY,' +
    '  name TEXT NOT NULL,' +
    '  slug TEXT NOT NULL,' +
    '  description TEXT,' +
    '  long_description TEXT,' +
    '  banner_url TEXT,' +
    '  icon_url TEXT,' +
    '  item_type TEXT NOT NULL CHECK(item_type IN (\'game\', \'web\', \'app\', \'art-music\')),' +
    '  project_url TEXT,' +
    '  author_display_name TEXT,' +
    '  status TEXT NOT NULL DEFAULT \'draft\' CHECK(status IN (\'published\', \'draft\', \'archived\')),' +
    '  artist_name TEXT, ' + 
    '  medium_tag_id TEXT, ' + 
    '  followers_count INTEGER DEFAULT 0 NOT NULL,' +
    '  created_at TEXT DEFAULT CURRENT_TIMESTAMP,' +
    '  updated_at TEXT' +
    ');' +

    'CREATE TABLE IF NOT EXISTS categories (' +
    '  id TEXT PRIMARY KEY,' +
    '  name TEXT NOT NULL,' +
    '  slug TEXT NOT NULL,' +
    '  description TEXT, ' + 
    '  parent_item_id TEXT NOT NULL,' +
    '  sort_order INTEGER NOT NULL DEFAULT 0,' +
    '  created_at TEXT DEFAULT CURRENT_TIMESTAMP,' +
    '  updated_at TEXT,' +
    '  FOREIGN KEY (parent_item_id) REFERENCES items(id) ON DELETE CASCADE,' +
    '  UNIQUE (parent_item_id, slug)' +
    ');' +

    'CREATE TABLE IF NOT EXISTS profiles (' +
    '  id TEXT PRIMARY KEY, ' + 
    '  name TEXT,' +
    '  usertag TEXT UNIQUE, ' + 
    '  avatar_url TEXT,' +
    '  banner_url TEXT,' +
    '  bio TEXT,' +
    '  role TEXT NOT NULL DEFAULT \'usuario\' CHECK(role IN (\'usuario\', \'vip\', \'mod\', \'admin\')),' +
    '  social_links TEXT, ' + 
    '  created_at TEXT DEFAULT CURRENT_TIMESTAMP,' +
    '  updated_at TEXT' +
    ');' +

    'CREATE TABLE IF NOT EXISTS resources (' +
    '  id TEXT PRIMARY KEY,' +
    '  name TEXT NOT NULL,' +
    '  slug TEXT NOT NULL,' +
    '  parent_item_id TEXT NOT NULL,' +
    '  category_id TEXT NOT NULL,' +
    '  author_id TEXT NOT NULL,' +
    '  version TEXT, ' +
    '  description TEXT NOT NULL, ' + 
    '  detailed_description TEXT, ' + 
    '  image_url TEXT, ' +
    '  image_gallery TEXT, ' + 
    '  downloads INTEGER DEFAULT 0 NOT NULL,' +
    '  followers INTEGER DEFAULT 0 NOT NULL,' +
    '  links TEXT, ' + 
    '  requirements TEXT, ' +
    '  status TEXT NOT NULL DEFAULT \'draft\' CHECK(status IN (\'published\', \'draft\', \'archived\')),' +
    '  rating REAL, ' + 
    '  review_count INTEGER DEFAULT 0,' +
    '  positive_review_percentage REAL, ' + 
    '  selected_dynamic_tags_json TEXT, ' + 
    '  main_file_details_json TEXT, ' + 
    '  created_at TEXT DEFAULT CURRENT_TIMESTAMP,' +
    '  updated_at TEXT,' +
    '  FOREIGN KEY (parent_item_id) REFERENCES items(id) ON DELETE CASCADE,' +
    '  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,' +
    '  FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE,' + 
    '  UNIQUE (parent_item_id, category_id, slug)' +
    ');' +

    'CREATE TABLE IF NOT EXISTS resource_files (' +
    '    id TEXT PRIMARY KEY,' +
    '    resource_id TEXT NOT NULL,' +
    '    name TEXT NOT NULL,' +
    '    url TEXT NOT NULL,' +
    '    version_name TEXT NOT NULL,' +
    '    size TEXT,' + 
    '    channel_id TEXT, ' + 
    '    selected_file_tags_json TEXT, ' + 
    '    downloads INTEGER DEFAULT 0 NOT NULL, ' +
    '    created_at TEXT DEFAULT CURRENT_TIMESTAMP,' +
    '    updated_at TEXT,' + 
    '    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE' +
    ');' +

    'CREATE TABLE IF NOT EXISTS reviews (' +
    '    id TEXT PRIMARY KEY,' +
    '    resource_id TEXT NOT NULL,' +
    '    author_id TEXT NOT NULL,' +
    '    resource_version TEXT NOT NULL, ' + 
    '    rating REAL, ' + 
    '    is_recommended BOOLEAN NOT NULL,' +
    '    comment TEXT NOT NULL,' +
    '    interaction_counts TEXT, ' + 
    // '    is_most_helpful BOOLEAN DEFAULT FALSE,' + // Removed: will be determined dynamically
    '    created_at TEXT DEFAULT CURRENT_TIMESTAMP,' +
    '    updated_at TEXT,' +
    '    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,' +
    '    FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE,' + 
    '    UNIQUE (resource_id, author_id)' + 
    ');' +

    'CREATE TABLE IF NOT EXISTS user_review_sentiments (' +
    '    user_id TEXT NOT NULL,' +
    '    review_id TEXT NOT NULL,' +
    '    sentiment TEXT CHECK(sentiment IN (\'helpful\', \'unhelpful\')),' +
    '    is_funny BOOLEAN DEFAULT FALSE NOT NULL,' +
    '    created_at TEXT DEFAULT CURRENT_TIMESTAMP,' +
    '    updated_at TEXT,' +
    '    PRIMARY KEY (user_id, review_id),' +
    '    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,' +
    '    FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE' +
    ');' +


    'CREATE TABLE IF NOT EXISTS changelog_entries (' +
    '    id TEXT PRIMARY KEY,' +
    '    resource_id TEXT NOT NULL,' +
    '    resource_file_id TEXT, ' + 
    '    version_name TEXT NOT NULL, ' + 
    '    date TEXT NOT NULL, ' + 
    '    notes TEXT NOT NULL, ' + 
    '    created_at TEXT DEFAULT CURRENT_TIMESTAMP,' +
    '    updated_at TEXT,' +
    '    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,' +
    '    FOREIGN KEY (resource_file_id) REFERENCES resource_files(id) ON DELETE SET NULL' +
    ');' +

    
    'CREATE TABLE IF NOT EXISTS section_tags (' +
    '  id TEXT PRIMARY KEY,' +
    '  item_type TEXT NOT NULL CHECK(item_type IN (\'game\', \'web\', \'app\', \'art-music\')),' + 
    '  name TEXT NOT NULL,' +
    '  slug TEXT NOT NULL,' +
    '  description TEXT,' +
    '  color TEXT, text_color TEXT, border_color TEXT,' + 
    '  hover_bg_color TEXT, hover_text_color TEXT, hover_border_color TEXT,' + 
    '  icon_svg TEXT,' + 
    '  created_at TEXT DEFAULT CURRENT_TIMESTAMP,' +
    '  updated_at TEXT,' +
    '  UNIQUE (item_type, slug)' +
    ');' +

    
    'CREATE TABLE IF NOT EXISTS project_section_tags (' +
    '  project_id TEXT NOT NULL,' +
    '  section_tag_id TEXT NOT NULL,' +
    '  PRIMARY KEY (project_id, section_tag_id),' +
    '  FOREIGN KEY (project_id) REFERENCES items(id) ON DELETE CASCADE,' +
    '  FOREIGN KEY (section_tag_id) REFERENCES section_tags(id) ON DELETE CASCADE' +
    ');'
  );

  
  const tablesWithUpdatedAtTrigger = ['items', 'categories', 'profiles', 'resources', 'reviews', 'changelog_entries', 'section_tags', 'project_section_tags', 'user_review_sentiments'];
  for (const tableName of tablesWithUpdatedAtTrigger) {
    const tableInfo = await db.all('PRAGMA table_info(' + tableName + ');');
    
    
    if (tableName === 'items' && !tableInfo.some(col => col.name === 'followers_count')) {
      await db.exec('ALTER TABLE items ADD COLUMN followers_count INTEGER DEFAULT 0 NOT NULL;');
    }
    if (tableName === 'resources') {
        if (!tableInfo.some(col => col.name === 'downloads')) {
          await db.exec('ALTER TABLE resources ADD COLUMN downloads INTEGER DEFAULT 0 NOT NULL;');
        }
        if (!tableInfo.some(col => col.name === 'followers')) {
          await db.exec('ALTER TABLE resources ADD COLUMN followers INTEGER DEFAULT 0 NOT NULL;');
        }
         if (!tableInfo.some(col => col.name === 'rating')) {
          await db.exec('ALTER TABLE resources ADD COLUMN rating REAL;');
        }
        if (!tableInfo.some(col => col.name === 'review_count')) {
          await db.exec('ALTER TABLE resources ADD COLUMN review_count INTEGER DEFAULT 0;');
        }
        if (!tableInfo.some(col => col.name === 'positive_review_percentage')) {
          await db.exec('ALTER TABLE resources ADD COLUMN positive_review_percentage REAL;');
        }
    }
    if (tableName === 'resource_files' && !tableInfo.some(col => col.name === 'downloads')) {
        
        await db.exec('ALTER TABLE resource_files ADD COLUMN downloads INTEGER DEFAULT 0 NOT NULL;');
    }
     if (tableName === 'reviews' && !tableInfo.some(col => col.name === 'rating')) {
        await db.exec('ALTER TABLE reviews ADD COLUMN rating REAL;'); 
    }


    if (!tableInfo.some(col => col.name === 'updated_at')) {
      await db.exec('ALTER TABLE ' + tableName + ' ADD COLUMN updated_at TEXT;');
    }
    if (!tableInfo.some(col => col.name === 'created_at')) {
      await db.exec('ALTER TABLE ' + tableName + ' ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP;');
    }
    
    
    await db.exec(
      'CREATE TRIGGER IF NOT EXISTS update_' + tableName + '_updated_at' +
      ' AFTER UPDATE ON ' + tableName +
      ' FOR EACH ROW' +
      ' BEGIN' +
      '    UPDATE ' + tableName + ' SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;' +
      ' END;'
    );
  }
  
  
  const rfTableInfo = await db.all('PRAGMA table_info(resource_files);');
  if (!rfTableInfo.some(col => col.name === 'updated_at')) {
      await db.exec('ALTER TABLE resource_files ADD COLUMN updated_at TEXT;');
  }
  if (!rfTableInfo.some(col => col.name === 'created_at')) {
      await db.exec('ALTER TABLE resource_files ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP;');
  }
  
  await db.exec('DROP TRIGGER IF EXISTS update_resource_files_updated_at;');


  
  
  const firstRunCheck = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='_first_run_check_stats_v2'");
  if (!firstRunCheck) {
    await db.run("UPDATE resources SET downloads = ROUND(RANDOM() * 1000) WHERE downloads = 0;");
    
    
    await db.run("UPDATE items SET followers_count = 0;");
    await db.run("UPDATE resources SET followers = 0;");

    
    const resourcesToUpdate = await db.all("SELECT id FROM resources");
    for (const res of resourcesToUpdate) {
        const reviewsForResource = await db.all('SELECT rating, is_recommended FROM reviews WHERE resource_id = ?', res.id);
        const reviewCount = reviewsForResource.length;
        let totalRating = 0;
        let positiveReviews = 0;
        reviewsForResource.forEach(rev => { totalRating += (rev.rating || 0); if (rev.is_recommended) positiveReviews++; });
        
        let derivedAvgRating = null;
        let positiveReviewPercentage = null;

        if (reviewCount > 0) {
          positiveReviewPercentage = (positiveReviews / reviewCount) * 100;
          
          derivedAvgRating = (positiveReviewPercentage / 100) * 5;
        }

        await db.run(
          'UPDATE resources SET rating = ?, review_count = ?, positive_review_percentage = ? WHERE id = ?',
          derivedAvgRating, reviewCount, positiveReviewPercentage, res.id
        );
    }

    await db.exec("CREATE TABLE IF NOT EXISTS _first_run_check_stats_v2 (id INTEGER PRIMARY KEY); INSERT INTO _first_run_check_stats_v2 (id) VALUES (1);");
    console.log("First run (v2): Initialized resource downloads, follower counts, and review aggregates.");
  }


  await db.run("INSERT OR IGNORE INTO profiles (id, name, usertag, role, avatar_url) VALUES ('mock-admin-id', 'Admin User', '@admin', 'admin', 'https://placehold.co/128x128/E91E63/FFFFFF?text=A')");
  await db.run("INSERT OR IGNORE INTO profiles (id, name, usertag, role, avatar_url) VALUES ('mock-mod-id', 'Moderator User', '@mod', 'mod', 'https://placehold.co/128x128/2196F3/FFFFFF?text=M')");
  await db.run("INSERT OR IGNORE INTO profiles (id, name, usertag, role, avatar_url) VALUES ('mock-user-id', 'Regular User', '@user', 'usuario', 'https://placehold.co/128x128/4CAF50/FFFFFF?text=U')");

  await db.run("INSERT OR IGNORE INTO section_tags (id, item_type, name, slug, color, text_color, border_color) VALUES ('stag_game_rpg_1', 'game', 'RPG', 'rpg', '#4A90E2', '#FFFFFF', '#4A90E2')");
  await db.run("INSERT OR IGNORE INTO section_tags (id, item_type, name, slug, color, text_color, border_color) VALUES ('stag_game_action_2', 'game', 'Action', 'action', '#D0021B', '#FFFFFF', '#D0021B')");
  await db.run("INSERT OR IGNORE INTO section_tags (id, item_type, name, slug, color, text_color, border_color) VALUES ('stag_game_strategy_3', 'game', 'Strategy', 'strategy', '#F5A623', '#000000', '#F5A623')");
  await db.run("INSERT OR IGNORE INTO section_tags (id, item_type, name, slug, color, text_color, border_color) VALUES ('stag_web_portfolio_4', 'web', 'Portfolio', 'portfolio', '#50E3C2', '#000000', '#50E3C2')");
  await db.run("INSERT OR IGNORE INTO section_tags (id, item_type, name, slug, color, text_color, border_color) VALUES ('stag_app_productivity_5', 'app', 'Productivity', 'productivity', '#7ED321', '#000000', '#7ED321')");
  await db.run("INSERT OR IGNORE INTO section_tags (id, item_type, name, slug, color, text_color, border_color) VALUES ('stag_art_digital_6', 'art-music', 'Digital Art', 'digital-art', '#9013FE', '#FFFFFF', '#9013FE')");
  await db.run("INSERT OR IGNORE INTO section_tags (id, item_type, name, slug, color, text_color, border_color) VALUES ('stag_music_electronic_7', 'art-music', 'Electronic', 'electronic', '#BD10E0', '#FFFFFF', '#BD10E0')");


  console.log("SQLite database schema initialized/verified. 'user_review_sentiments' table added. 'reviews.is_most_helpful' column removed.");
}
    

    

