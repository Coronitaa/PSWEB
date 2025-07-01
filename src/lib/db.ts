

'use server';

import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

let dbInstance: Database | null = null;

const DB_FILE_PATH = path.join('/tmp', 'local.sqlite3');
const SEED_FILE_PATH = path.join(process.cwd(), 'local.sqlite3');

async function ensureDbFileExists() {
  try {
    // Check if the database in /tmp already exists
    await fs.promises.access(DB_FILE_PATH, fs.constants.F_OK);
  } catch (error) {
    // If it doesn't exist, copy it from the project root
    try {
      await fs.promises.copyFile(SEED_FILE_PATH, DB_FILE_PATH);
      console.log(`Database seeded from ${SEED_FILE_PATH} to ${DB_FILE_PATH}`);
    } catch (copyError) {
      console.warn(`Could not copy seed database from ${SEED_FILE_PATH}. A new empty database will be created at ${DB_FILE_PATH}. Error: ${copyError}`);
      // If the seed file doesn't exist, an empty file will be created by sqlite.open()
    }
  }
}

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  await ensureDbFileExists();

  dbInstance = await open({
    filename: DB_FILE_PATH,
    driver: sqlite3.Database,
  });

  // Enable WAL mode for better concurrency and to prevent locking issues.
  await dbInstance.exec('PRAGMA journal_mode = WAL;');

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
    '  author_id TEXT, ' + // This is now a legacy field, made nullable.
    '  version TEXT, ' +
    '  description TEXT NOT NULL, ' + 
    '  detailed_description TEXT, ' + 
    '  image_url TEXT, ' +
    '  image_gallery TEXT, ' + 
    '  gallery_aspect_ratio TEXT, ' +
    '  gallery_autoplay_interval INTEGER, ' +
    '  show_main_image_in_gallery BOOLEAN DEFAULT TRUE NOT NULL, ' +
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
    '  FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE SET NULL' +
    ');' +
    
    'CREATE TABLE IF NOT EXISTS resource_authors (' +
    '  resource_id TEXT NOT NULL,' +
    '  author_id TEXT NOT NULL,' +
    '  role_description TEXT,' +
    '  author_color TEXT,' +
    '  is_creator BOOLEAN DEFAULT FALSE NOT NULL,' +
    '  sort_order INTEGER DEFAULT 0 NOT NULL,' +
    '  PRIMARY KEY (resource_id, author_id),' +
    '  FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,' +
    '  FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE' +
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
    '    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE' +
    ');' +

    'CREATE TABLE IF NOT EXISTS reviews (' +
    '    id TEXT PRIMARY KEY,' +
    '    resource_id TEXT NOT NULL,' +
    '    author_id TEXT NOT NULL,' + 
    '    resource_version TEXT NOT NULL, ' + 
    '    is_recommended BOOLEAN NOT NULL,' +
    '    comment TEXT NOT NULL,' +
    '    interaction_counts TEXT, ' + 
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
  
  const tablesWithUpdatedAtTrigger = ['items', 'categories', 'profiles', 'resources', 'reviews', 'changelog_entries', 'section_tags', 'project_section_tags', 'user_review_sentiments', 'resource_authors'];
  for (const tableName of tablesWithUpdatedAtTrigger) {
    const tableInfo = await db.all(`PRAGMA table_info(${tableName});`);
    const pkColumns = tableInfo.filter(col => col.pk > 0).map(col => col.name);
    
    if (tableName === 'items' && !tableInfo.some(col => col.name === 'followers_count')) {
      await db.exec('ALTER TABLE items ADD COLUMN followers_count INTEGER DEFAULT 0 NOT NULL;');
    }
    if (tableName === 'resources') {
        if (!tableInfo.some(col => col.name === 'downloads')) { await db.exec('ALTER TABLE resources ADD COLUMN downloads INTEGER DEFAULT 0 NOT NULL;'); }
        if (!tableInfo.some(col => col.name === 'followers')) { await db.exec('ALTER TABLE resources ADD COLUMN followers INTEGER DEFAULT 0 NOT NULL;'); }
        if (!tableInfo.some(col => col.name === 'rating')) { await db.exec('ALTER TABLE resources ADD COLUMN rating REAL;'); }
        if (!tableInfo.some(col => col.name === 'review_count')) { await db.exec('ALTER TABLE resources ADD COLUMN review_count INTEGER DEFAULT 0;'); }
        if (!tableInfo.some(col => col.name === 'positive_review_percentage')) { await db.exec('ALTER TABLE resources ADD COLUMN positive_review_percentage REAL;'); }
        if (!tableInfo.some(col => col.name === 'show_main_image_in_gallery')) { await db.exec('ALTER TABLE resources ADD COLUMN show_main_image_in_gallery BOOLEAN DEFAULT TRUE NOT NULL;'); }
        if (!tableInfo.some(col => col.name === 'gallery_aspect_ratio')) { await db.exec('ALTER TABLE resources ADD COLUMN gallery_aspect_ratio TEXT;'); }
        if (!tableInfo.some(col => col.name === 'gallery_autoplay_interval')) { await db.exec('ALTER TABLE resources ADD COLUMN gallery_autoplay_interval INTEGER;'); }
        if (tableInfo.some(col => col.name === 'author_id')) { // Check if old author_id exists
          const resourcesWithAuthor = await db.all('SELECT id, author_id FROM resources WHERE author_id IS NOT NULL');
          for (const res of resourcesWithAuthor) {
            await db.run('INSERT OR IGNORE INTO resource_authors (resource_id, author_id, is_creator, role_description) VALUES (?, ?, ?, ?)', res.id, res.author_id, true, 'Creator');
          }
        }
    }
    if (tableName === 'resource_files' && !tableInfo.some(col => col.name === 'downloads')) {
        await db.exec('ALTER TABLE resource_files ADD COLUMN downloads INTEGER DEFAULT 0 NOT NULL;');
    }
    
    if (tableName === 'resource_authors' && !tableInfo.some(col => col.name === 'sort_order')) {
      await db.exec('ALTER TABLE resource_authors ADD COLUMN sort_order INTEGER DEFAULT 0 NOT NULL;');
    }
    if (tableName === 'resource_authors' && !tableInfo.some(col => col.name === 'author_color')) {
      await db.exec('ALTER TABLE resource_authors ADD COLUMN author_color TEXT;');
    }
    
    if (!tableInfo.some(col => col.name === 'updated_at')) { await db.exec('ALTER TABLE ' + tableName + ' ADD COLUMN updated_at TEXT;'); }
    if (!tableInfo.some(col => col.name === 'created_at')) {
      await db.exec('ALTER TABLE ' + tableName + ' ADD COLUMN created_at TEXT;');
    }
    
    const triggerName = `update_${tableName}_updated_at`;
    await db.exec(`DROP TRIGGER IF EXISTS ${triggerName};`);

    if (pkColumns.length > 0) {
      const whereClause = pkColumns.map(pk => `${pk} = OLD.${pk}`).join(' AND ');
      await db.exec(
        `CREATE TRIGGER ${triggerName}
         AFTER UPDATE ON ${tableName}
         FOR EACH ROW
         WHEN OLD.updated_at = NEW.updated_at OR OLD.updated_at IS NULL
         BEGIN
            UPDATE ${tableName} SET updated_at = CURRENT_TIMESTAMP WHERE ${whereClause};
         END;`
      );
    } else {
      console.warn(`Could not create update trigger for table ${tableName} as it has no primary key defined.`);
    }
  }
  
  // Ensure mock profiles exist with social links
  const adminSocialLinks = JSON.stringify({ github: 'https://github.com/admin', discord: 'https://discord.gg/adminchannel', website: 'https://admin.example.com' });
  const modSocialLinks = JSON.stringify({ twitter: 'https://twitter.com/mod', website: 'https://moderator.example.com', linkedin: 'https://linkedin.com/in/moderator' });
  const userSocialLinks = JSON.stringify({ website: 'https://userpage.example.com', github: 'https://github.com/regularuser' });
  const creativeCatSocialLinks = JSON.stringify({ github: 'https://github.com/creativecat', twitter: 'https://twitter.com/creativecat_art', website: 'https://creativecat.art' });


  await db.run("INSERT OR IGNORE INTO profiles (id, name, usertag, role, avatar_url, banner_url, bio, social_links) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", 
    'mock-admin-id', 'Administrator', '@admin', 'admin', 
    'https://placehold.co/128x128/E91E63/FFFFFF?text=A', 
    'https://placehold.co/1200x300/1a1a1a/E91E63?text=Admin+Banner', 
    'Overseeing the PinkStar realm. Ensuring all systems are go and content is top-notch. If you see something, say something (to a mod first, probably).',
    adminSocialLinks
  );
  await db.run("INSERT OR IGNORE INTO profiles (id, name, usertag, role, avatar_url, banner_url, bio, social_links) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    'mock-mod-id', 'Moderator', '@mod', 'mod', 
    'https://placehold.co/128x128/2196F3/FFFFFF?text=M', 
    'https://placehold.co/1200x300/1a1a1a/2196F3?text=Mod+Banner', 
    'Keeping PinkStar friendly and fun! Reach out if you need assistance or spot any troublemakers. Happy gaming and creating!',
    modSocialLinks
  );
  await db.run("INSERT OR IGNORE INTO profiles (id, name, usertag, role, avatar_url, banner_url, bio, social_links) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    'mock-user-id', 'Regular User', '@user', 'usuario', 
    'https://placehold.co/128x128/4CAF50/FFFFFF?text=U', 
    'https://placehold.co/1200x300/1a1a1a/4CAF50?text=User+Banner', 
    'Just a regular PinkStar enthusiast, exploring awesome games, web projects, apps, and art. Always on the lookout for the next cool thing!',
    userSocialLinks
  );
  await db.run("INSERT OR IGNORE INTO profiles (id, name, usertag, role, avatar_url, banner_url, bio, social_links) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    'another-user-id', 'CreativeCat', '@creativecat', 'usuario', 
    'https://placehold.co/128x128/FF9800/FFFFFF?text=C', 
    'https://placehold.co/1200x300/1a1a1a/FF9800?text=CreativeCat', 
    'Digital artist and indie game admirer. Sharing my creations and discovering gems on PinkStar. Let us connect!',
    creativeCatSocialLinks
  );

  const firstRunCheck = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='_first_run_check_stats_v3_review_fix'");
  if (!firstRunCheck) {
    await db.run("UPDATE resources SET downloads = ROUND(RANDOM() * 1000) WHERE downloads = 0;");
    await db.run("UPDATE items SET followers_count = 0;");
    await db.run("UPDATE resources SET followers = 0;");
    
    const resourcesToUpdate = await db.all("SELECT id FROM resources");
    for (const res of resourcesToUpdate) {
        const reviewsForResource = await db.all('SELECT is_recommended FROM reviews WHERE resource_id = ?', res.id);
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
          'UPDATE resources SET rating = ?, review_count = ?, positive_review_percentage = ? WHERE id = ?',
          derivedAvgRating, reviewCount, positiveReviewPercentage, res.id
        );
    }

    await db.exec("CREATE TABLE IF NOT EXISTS _first_run_check_stats_v3_review_fix (id INTEGER PRIMARY KEY); INSERT INTO _first_run_check_stats_v3_review_fix (id) VALUES (1);");
    console.log("First run (v3 - review fix): Initialized resource downloads, follower counts, and review aggregates.");
  }

  console.log("SQLite database schema initialized/verified. Mock profiles ensured (with social links).");
}
