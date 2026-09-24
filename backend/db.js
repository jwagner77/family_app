import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { populateUSHolidays } from './holidays.js';

let dbInstance = null;
let dbPromise = null;

export async function getDb() {
  if (dbInstance) return dbInstance;
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    const dbPath = process.env.DATABASE_PATH || './data/base.db';
    const dbDir = path.dirname(dbPath);

    // Ensure directories exist
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    dbInstance = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

  // Enable foreign keys
  await dbInstance.run('PRAGMA foreign_keys = ON');

  // Run migrations
  await dbInstance.exec(`

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      permissions TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS todo_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      list_type TEXT CHECK( list_type IN ('local', 'm365') ) DEFAULT 'local',
      m365_list_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS todo_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      assigned_to INTEGER,
      status TEXT CHECK( status IN ('pending', 'completed') ) DEFAULT 'pending',
      due_date TEXT,
      m365_task_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (list_id) REFERENCES todo_lists(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      location TEXT,
      m365_event_id TEXT,
      event_type TEXT DEFAULT 'event',
      all_day INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      billing_cycle TEXT CHECK( billing_cycle IN ('monthly', 'annual') ) DEFAULT 'monthly',
      next_billing_date TEXT NOT NULL,
      category TEXT,
      active INTEGER DEFAULT 1,
      payment_method TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS recurring_bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      billing_cycle TEXT CHECK( billing_cycle IN ('monthly', 'annual') ) DEFAULT 'monthly',
      next_billing_date TEXT NOT NULL,
      tag TEXT,
      active INTEGER DEFAULT 1,
      payment_method TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bill_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS feature_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS bug_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      steps_to_reproduce TEXT,
      severity TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'open',
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      game_type TEXT CHECK( game_type IN ('Board', 'Card') ) DEFAULT 'Board',
      min_players INTEGER NOT NULL DEFAULT 1,
      max_players INTEGER NOT NULL DEFAULT 4,
      recommended_ages TEXT,
      rating INTEGER CHECK( rating >= 1 AND rating <= 5 ) DEFAULT 5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS game_play_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      players_count INTEGER,
      winner TEXT,
      played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      prep_time INTEGER,
      cook_time INTEGER,
      servings INTEGER,
      image_path TEXT,
      source_url TEXT,
      favorite INTEGER DEFAULT 0,
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER,
      name TEXT NOT NULL,
      amount TEXT,
      unit TEXT,
      raw_text TEXT,
      FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS instructions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER,
      step_number INTEGER NOT NULL,
      instruction_text TEXT NOT NULL,
      FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS recipe_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER,
      step_number INTEGER DEFAULT 1,
      note_text TEXT NOT NULL,
      FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS leftovers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      recipe_id INTEGER,
      date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
      servings INTEGER DEFAULT 1,
      expiration_date TEXT,
      FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS weekly_menu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_of_week TEXT NOT NULL,
      meal_type TEXT NOT NULL,
      recipe_id INTEGER,
      leftover_id INTEGER,
      has_leftovers INTEGER DEFAULT 0,
      custom_meal TEXT,
      servings INTEGER,
      tags TEXT,
      assigned_people TEXT,
      FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE SET NULL,
      FOREIGN KEY (leftover_id) REFERENCES leftovers (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shopping_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      owner_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS shopping_list_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      amount TEXT,
      unit TEXT,
      category TEXT,
      raw_text TEXT,
      is_checked INTEGER DEFAULT 0,
      recipe_id INTEGER,
      FOREIGN KEY (list_id) REFERENCES shopping_lists (id) ON DELETE CASCADE,
      FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS shopping_list_recipes (
      list_id INTEGER NOT NULL,
      recipe_id INTEGER NOT NULL,
      PRIMARY KEY (list_id, recipe_id),
      FOREIGN KEY (list_id) REFERENCES shopping_lists (id) ON DELETE CASCADE,
      FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS shopping_list_shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_id INTEGER NOT NULL,
      shared_with_user_id INTEGER NOT NULL,
      permission TEXT DEFAULT 'view',
      UNIQUE(list_id, shared_with_user_id),
      FOREIGN KEY (list_id) REFERENCES shopping_lists (id) ON DELETE CASCADE,
      FOREIGN KEY (shared_with_user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      date_added TEXT NOT NULL,
      expiration_date TEXT,
      percentage_used INTEGER DEFAULT 0,
      size_number REAL,
      size_unit TEXT
    );

    CREATE TABLE IF NOT EXISTS custom_meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reusable_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      isbn TEXT,
      title TEXT NOT NULL,
      author TEXT,
      publisher TEXT,
      published_date TEXT,
      description TEXT,
      cover_url TEXT,
      status TEXT DEFAULT 'library', -- 'library', 'archived'
      tags TEXT, -- comma-separated tags
      added_by INTEGER,
      red_flag INTEGER DEFAULT 0,
      total_pages INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (added_by) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS reading_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      is_public INTEGER DEFAULT 0,
      share_token TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reading_list (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      book_id INTEGER,
      reading_list_id INTEGER,
      title TEXT NOT NULL,
      author TEXT,
      cover_url TEXT,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE SET NULL,
      FOREIGN KEY (reading_list_id) REFERENCES reading_lists (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reading_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      book_id INTEGER,
      reading_list_id INTEGER,
      book_title TEXT NOT NULL,
      book_author TEXT,
      entry_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      progress_percent INTEGER DEFAULT 0,
      notes TEXT,
      page_number INTEGER DEFAULT NULL,
      total_pages INTEGER DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE SET NULL,
      FOREIGN KEY (reading_list_id) REFERENCES reading_list (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS dnf_books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      book_id INTEGER,
      reading_list_id INTEGER,
      book_title TEXT NOT NULL,
      book_author TEXT,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE SET NULL,
      FOREIGN KEY (reading_list_id) REFERENCES reading_list (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS book_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      comment TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS book_recommendations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      from_user_id INTEGER NOT NULL,
      to_user_id INTEGER NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE,
      FOREIGN KEY (from_user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (to_user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS dashboards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS dashboard_widgets (
      id TEXT PRIMARY KEY,
      dashboard_id TEXT DEFAULT 'default',
      type TEXT NOT NULL,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      w INTEGER NOT NULL,
      h INTEGER NOT NULL,
      config TEXT
    );

    CREATE TABLE IF NOT EXISTS dashboard_shares (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      target_type TEXT NOT NULL CHECK(target_type IN ('single', 'rotation')),
      dashboard_id TEXT,
      rotation_interval INTEGER DEFAULT 30,
      rotation_dashboards TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    INSERT OR IGNORE INTO settings (key, value) VALUES ('app_name', 'Home Hub');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('primary_color', '#3f51b5');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('isbndb_api_key', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('google_books_api_key', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'system');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('oidc_enabled', 'false');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('oidc_auto_provision', 'true');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('oidc_default_role', 'Viewer');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('branding_icon', '🏠');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('branding_logo', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('branding_logo_light', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('branding_logo_dark', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('branding_favicon', '');

    INSERT OR IGNORE INTO settings (key, value) VALUES ('fr_notify_smtp_enabled', 'false');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('fr_notify_smtp_to', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('fr_notify_discord_enabled', 'false');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('fr_notify_discord_webhook_url', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('fr_notify_webhook_enabled', 'false');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('fr_notify_webhook_url', '');

    INSERT OR IGNORE INTO settings (key, value) VALUES ('bug_notify_smtp_enabled', 'false');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('bug_notify_smtp_to', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('bug_notify_discord_enabled', 'false');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('bug_notify_discord_webhook_url', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('bug_notify_webhook_enabled', 'false');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('bug_notify_webhook_url', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('notify_subscription_due_today', 'false');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('notify_bill_due_today', 'false');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('notify_recipe_added', 'false');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('notify_recipe_deleted', 'false');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('notify_meal_plan_updated', 'false');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('notify_leftovers_added', 'false');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('notify_leftovers_expiring', 'false');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('notify_inventory_expiring', 'false');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('notify_leftovers_expiry_days', '2');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('notify_inventory_expiry_days', '3');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('notify_book_added', 'false');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('notify_book_deleted', 'false');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('notify_log_added', 'false');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('notify_book_started', 'false');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('notify_book_completed', 'false');

    -- FocusFlow / ADHD Default Settings
    INSERT OR IGNORE INTO settings (key, value) VALUES ('pomodoro_work_duration', '1500');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('pomodoro_short_break', '300');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('pomodoro_long_break', '900');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('focus_ticking_sound', 'false');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('confetti_enabled', 'true');

    INSERT OR IGNORE INTO settings (key, value) VALUES ('mtg_url', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('mtg_key', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('library_url', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('library_key', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('dashboard_share_token', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('dashboard_rotation_enabled', 'false');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('dashboard_rotation_interval', '30');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('dashboard_rotation_dashboards', '["default"]');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('unsplash_key', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('unsplash_app_id', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('unsplash_secret', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('notify_integration_errors', 'true');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('weather_location', '10001');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('weather_unit', 'fahrenheit');
  `);

  // Safe Migration to add dashboard_id column to dashboard_widgets table if missing
  try {
    await dbInstance.run("ALTER TABLE dashboard_widgets ADD COLUMN dashboard_id TEXT DEFAULT 'default'");
  } catch (err) {}

  // Safe Migration: ensure default dashboard exists and orphaned widgets are assigned to 'default'
  try {
    const existingCount = await dbInstance.get("SELECT COUNT(*) as count FROM dashboards");
    if (!existingCount || existingCount.count === 0) {
      await dbInstance.run("INSERT OR IGNORE INTO dashboards (id, name, is_default) VALUES ('default', 'Main Dashboard', 1)");
    }
    await dbInstance.run("UPDATE dashboard_widgets SET dashboard_id = 'default' WHERE dashboard_id IS NULL OR dashboard_id = ''");
  } catch (err) {}

  // Safe Migration: migrate legacy single dashboard share token to dashboard_shares table
  try {
    const tokenRow = await dbInstance.get("SELECT value FROM settings WHERE key = 'dashboard_share_token'");
    if (tokenRow && tokenRow.value) {
      const existingShares = await dbInstance.get("SELECT COUNT(*) as count FROM dashboard_shares");
      if (!existingShares || existingShares.count === 0) {
        await dbInstance.run(
          "INSERT OR IGNORE INTO dashboard_shares (id, name, token, target_type, dashboard_id, active) VALUES (?, ?, ?, 'single', 'default', 1)",
          ['share_' + Date.now(), 'Main Dashboard Public Share', tokenRow.value]
        );
      }
    }
  } catch (err) {}

  // Safe Migration to add primary_color column to users table if missing
  try {
    await dbInstance.run("ALTER TABLE users ADD COLUMN primary_color TEXT DEFAULT '#3f51b5'");
  } catch (err) {}

  // Safe Migration to add theme column to users table if missing
  try {
    await dbInstance.run("ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'system'");
  } catch (err) {}

  // Safe Migration to add auth_provider column to users table if missing
  try {
    await dbInstance.run("ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'local'");
  } catch (err) {}

  // Safe Migration to add display_name column to users table if missing
  try {
    await dbInstance.run("ALTER TABLE users ADD COLUMN display_name TEXT");
  } catch (err) {}

  // Safe Migration to add calendar_guid column to users table if missing
  try {
    await dbInstance.run("ALTER TABLE users ADD COLUMN calendar_guid TEXT");
  } catch (err) {}

  // Safe Migration to add timezone column to users table if missing
  try {
    await dbInstance.run("ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT 'US/New_York'");
  } catch (err) {}

  // Safe Migration to add navbar_bg column to users table if missing
  try {
    await dbInstance.run("ALTER TABLE users ADD COLUMN navbar_bg TEXT");
  } catch (err) {}

  // Safe Migration to add navbar_opacity column to users table if missing
  try {
    await dbInstance.run("ALTER TABLE users ADD COLUMN navbar_opacity REAL DEFAULT 0.75");
  } catch (err) {}

  // Safe Migration to add app_bg column to users table if missing
  try {
    await dbInstance.run("ALTER TABLE users ADD COLUMN app_bg TEXT");
  } catch (err) {}

  // Safe Migration to add theme_info_cards column to users table if missing
  try {
    await dbInstance.run("ALTER TABLE users ADD COLUMN theme_info_cards INTEGER DEFAULT 0");
  } catch (err) {}

  // Safe Migration to add text_color column to users table if missing
  try {
    await dbInstance.run("ALTER TABLE users ADD COLUMN text_color TEXT DEFAULT 'white'");
  } catch (err) {}

  // Safe Migration to add dynamic_text_color column to users table if missing
  try {
    await dbInstance.run("ALTER TABLE users ADD COLUMN dynamic_text_color INTEGER DEFAULT 0");
  } catch (err) {}

  // Safe Migration to add notes_file column to game_play_history if missing
  try {
    await dbInstance.run("ALTER TABLE game_play_history ADD COLUMN notes_file TEXT");
  } catch (err) {}

  // Safe Migration to add is_read column to notification_logs table if missing
  try {
    await dbInstance.run("ALTER TABLE notification_logs ADD COLUMN is_read INTEGER DEFAULT 0");
  } catch (err) {}

  // Safe Migration to add branding_logo_light and branding_logo_dark settings if missing
  try {
    await dbInstance.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('branding_logo_light', '')");
    await dbInstance.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('branding_logo_dark', '')");
  } catch (err) {}

  // Pre-populate default tags
  try {
    const defaultTags = ['Breakfast', 'Lunch', 'Dinner', 'Dessert'];
    for (const tag of defaultTags) {
      await dbInstance.run("INSERT OR IGNORE INTO reusable_tags (name) VALUES (?)", [tag]);
    }
  } catch (err) {}

  // Safe Migration to add m365 token columns to users table if missing
  try {
    await dbInstance.run("ALTER TABLE users ADD COLUMN m365_access_token TEXT");
  } catch (err) {}
  try {
    await dbInstance.run("ALTER TABLE users ADD COLUMN m365_refresh_token TEXT");
  } catch (err) {}
  try {
    await dbInstance.run("ALTER TABLE users ADD COLUMN m365_token_expires_at INTEGER");
  } catch (err) {}

  // Safe Migration to add is_shared column to projects table if missing
  try {
    await dbInstance.run("ALTER TABLE projects ADD COLUMN is_shared INTEGER DEFAULT 0");
  } catch (err) {}

  // Safe Migration to add user profile columns if missing
  try {
    await dbInstance.run("ALTER TABLE users ADD COLUMN birthday TEXT");
  } catch (err) {}
  try {
    await dbInstance.run("ALTER TABLE users ADD COLUMN phone TEXT");
  } catch (err) {}
  try {
    await dbInstance.run("ALTER TABLE users ADD COLUMN email TEXT");
  } catch (err) {}
  try {
    await dbInstance.run("ALTER TABLE users ADD COLUMN picture_url TEXT");
  } catch (err) {}
  try {
    await dbInstance.run("ALTER TABLE users ADD COLUMN hide_from_contacts INTEGER DEFAULT 0");
  } catch (err) {}

  // Safe Migration to add user_id to contacts if missing
  try {
    await dbInstance.run("ALTER TABLE contacts ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE");
  } catch (err) {}

  // Safe Migration to pre-populate Google SSO settings if missing
  try {
    await dbInstance.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('google_sso_enabled', 'false')");
    await dbInstance.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('google_client_id', '')");
    await dbInstance.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('google_client_secret', '')");
    await dbInstance.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('google_auto_provision', 'true')");
    await dbInstance.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('google_default_role', 'Viewer')");
  } catch (err) {}

  // Safe Migration to pre-populate GitHub integration settings
  try {
    await dbInstance.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('github_integration_enabled', 'false')");
    await dbInstance.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('github_owner', '')");
    await dbInstance.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('github_repo', '')");
    await dbInstance.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('github_token', '')");
  } catch (err) {}

  // Safe Migration to pre-populate book lookup API keys
  try {
    await dbInstance.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('google_books_api_key', '')");
    await dbInstance.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('isbndb_api_key', '')");
  } catch (err) {}

  // Safe Migration to pre-populate calendar contact events color
  try {
    await dbInstance.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('calendar_contact_event_color', '#ec4899')");
  } catch (err) {}

  // Safe Migration to add github issue columns to feature_requests & bug_reports
  try {
    await dbInstance.run("ALTER TABLE feature_requests ADD COLUMN github_issue_url TEXT");
  } catch (err) {}
  try {
    await dbInstance.run("ALTER TABLE feature_requests ADD COLUMN github_issue_number INTEGER");
  } catch (err) {}
  try {
    await dbInstance.run("ALTER TABLE bug_reports ADD COLUMN github_issue_url TEXT");
  } catch (err) {}
  try {
    await dbInstance.run("ALTER TABLE bug_reports ADD COLUMN github_issue_number INTEGER");
  } catch (err) {}
  try {
    await dbInstance.run("ALTER TABLE housekeeping_tasks ADD COLUMN reoccurrence_days TEXT");
  } catch (err) {}
  try {
    await dbInstance.run("ALTER TABLE housekeeping_tasks ADD COLUMN reoccurrence_months TEXT");
  } catch (err) {}

  // Safe Migration to add event_type and all_day columns to calendar_events if missing
  try {
    await dbInstance.run("ALTER TABLE calendar_events ADD COLUMN event_type TEXT DEFAULT 'event'");
  } catch (err) {}
  try {
    await dbInstance.run("ALTER TABLE calendar_events ADD COLUMN all_day INTEGER DEFAULT 0");
  } catch (err) {}

  // Safe Migration to add calendar_sync_mappings to users table if missing
  try {
    await dbInstance.run("ALTER TABLE users ADD COLUMN calendar_sync_mappings TEXT");
  } catch (err) {}

  // Safe Migration to add source_url column to recipes if missing
  try {
    await dbInstance.run("ALTER TABLE recipes ADD COLUMN source_url TEXT");
  } catch (err) {}

  // Safe Migration to pre-populate calendar holiday color
  try {
    await dbInstance.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('calendar_holiday_color', '#f97316')");
  } catch (err) {}

  // Safe Migration to populate known US Holidays
  try {
    await populateUSHolidays(dbInstance);
  } catch (err) {
    console.error('Failed to populate US Holidays on startup:', err);
  }

  // Safe Migration to add monarch_recurring_id to subscriptions and recurring_bills
  try {
    await dbInstance.run("ALTER TABLE subscriptions ADD COLUMN monarch_recurring_id TEXT");
  } catch (err) {}
  try {
    await dbInstance.run("ALTER TABLE recurring_bills ADD COLUMN monarch_recurring_id TEXT");
  } catch (err) {}

  try {
    await dbInstance.run(`
      CREATE TABLE IF NOT EXISTS contact_important_dates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE
      )
    `);
  } catch (err) {}

  try {
    await dbInstance.run(`
      CREATE TABLE IF NOT EXISTS recipe_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipe_id INTEGER,
        step_number INTEGER DEFAULT 1,
        note_text TEXT NOT NULL,
        FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE
      )
    `);
  } catch (err) {}

  // Create notification logs table
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS notification_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      event_type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      birthday TEXT,
      relationship TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contact_important_dates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS health_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      log_date TEXT NOT NULL,
      steps INTEGER,
      water_ml INTEGER,
      sleep_hours REAL,
      mood TEXT,
      weight REAL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(user_id, log_date)
    );

    CREATE TABLE IF NOT EXISTS medications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      dosage TEXT,
      frequency TEXT,
      time_of_day TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS doctor_appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      provider TEXT NOT NULL,
      specialty TEXT,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT,
      breed TEXT,
      birthdate TEXT,
      weight REAL,
      picture_url TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pet_vet_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pet_id INTEGER NOT NULL,
      visit_date TEXT NOT NULL,
      provider TEXT,
      reason TEXT,
      weight_logged REAL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pet_id) REFERENCES pets (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pet_medications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pet_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      dosage TEXT,
      frequency TEXT,
      instructions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pet_id) REFERENCES pets (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pet_medication_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medication_id INTEGER NOT NULL,
      given_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (medication_id) REFERENCES pet_medications (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS housekeeping_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT NOT NULL,
      reoccurrence TEXT NOT NULL DEFAULT 'none',
      reoccurrence_days TEXT,
      reoccurrence_months TEXT,
      assigned_to_user_id INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS housekeeping_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      task_title TEXT NOT NULL,
      completed_by_user_id INTEGER NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (completed_by_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#3b82f6',
      status TEXT DEFAULT 'active',
      schedule_enabled INTEGER DEFAULT 0,
      is_shared INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS project_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      day_of_week INTEGER NOT NULL,
      all_day INTEGER DEFAULT 0,
      start_time TEXT,
      end_time TEXT,
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS routines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      frequency TEXT NOT NULL DEFAULT 'daily',
      custom_days TEXT,
      time_of_day TEXT,
      estimated_time INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS routine_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      routine_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      completed_date TEXT NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (routine_id) REFERENCES routines (id) ON DELETE CASCADE,
      UNIQUE (routine_id, completed_date)
    );

    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#3b82f6',
      icon TEXT DEFAULT '⭐',
      target_frequency TEXT DEFAULT 'daily',
      custom_days TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS habit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      completed_date TEXT NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (habit_id) REFERENCES habits (id) ON DELETE CASCADE,
      UNIQUE (habit_id, completed_date)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      project_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'backlog',
      priority TEXT DEFAULT 'medium',
      due_date TEXT,
      estimated_time INTEGER DEFAULT 0,
      time_spent INTEGER DEFAULT 0,
      is_recurring INTEGER DEFAULT 0,
      recurrence_pattern TEXT,
      parent_id INTEGER,
      is_micro_step INTEGER DEFAULT 0,
      routine_id INTEGER,
      habit_id INTEGER,
      habit_task_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL,
      FOREIGN KEY (parent_id) REFERENCES tasks (id) ON DELETE CASCADE,
      FOREIGN KEY (routine_id) REFERENCES routines (id) ON DELETE CASCADE,
      FOREIGN KEY (habit_id) REFERENCES habits (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS routine_task_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      completed_date TEXT NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
      UNIQUE (task_id, completed_date)
    );

    CREATE TABLE IF NOT EXISTS habit_task_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      completed_date TEXT NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
      UNIQUE (task_id, completed_date)
    );

    CREATE TABLE IF NOT EXISTS time_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME,
      duration INTEGER DEFAULT 0,
      FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS focus_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      task_id INTEGER,
      type TEXT DEFAULT 'pomodoro',
      duration INTEGER NOT NULL,
      completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS user_streaks (
      user_id INTEGER PRIMARY KEY,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_completed_date TEXT,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_important_dates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      shared_with_type TEXT CHECK(shared_with_type IN ('user', 'contact', 'none')) DEFAULT 'none',
      shared_with_user_id INTEGER,
      shared_with_contact_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (shared_with_contact_id) REFERENCES contacts(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS relationships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_person_type TEXT CHECK(from_person_type IN ('user', 'contact')) NOT NULL,
      from_person_id INTEGER NOT NULL,
      to_person_type TEXT CHECK(to_person_type IN ('user', 'contact')) NOT NULL,
      to_person_id INTEGER NOT NULL,
      relationship_type TEXT NOT NULL,
      UNIQUE(from_person_type, from_person_id, to_person_type, to_person_id)
    );

    CREATE TABLE IF NOT EXISTS user_push_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      platform TEXT DEFAULT 'mobile',
      device_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Bootstrap default roles and admin user
  const adminRole = await dbInstance.get("SELECT id, permissions FROM roles WHERE name = 'Administrator'");
  const adminPermsObj = {
    recipes: 'full',
    planner: 'full',
    shopping_list: 'full',
    users: 'full',
    roles: 'full',
    todo: 'full',
    calendar: 'full',
    subscriptions: 'full',
    bills: 'full',
    settings_general: 'full',
    settings_users: 'full',
    settings_roles: 'full',
    settings_sso: 'full',
    settings_branding: 'full',
    settings_calendar: 'full'
  };
  let adminRoleId;
  if (!adminRole) {
    const result = await dbInstance.run(
      "INSERT INTO roles (name, permissions) VALUES ('Administrator', ?)",
      [JSON.stringify(adminPermsObj)]
    );
    adminRoleId = result.lastID;
  } else {
    adminRoleId = adminRole.id;
    await dbInstance.run(
      "UPDATE roles SET permissions = ? WHERE id = ?",
      [JSON.stringify(adminPermsObj), adminRoleId]
    );
  }

  const viewerRole = await dbInstance.get("SELECT id, permissions FROM roles WHERE name = 'Viewer'");
  const viewerPermsObj = {
    recipes: 'read',
    planner: 'read',
    shopping_list: 'read',
    users: 'none',
    roles: 'none',
    todo: 'read',
    calendar: 'read',
    subscriptions: 'read',
    bills: 'read',
    settings_general: 'read',
    settings_users: 'none',
    settings_roles: 'none',
    settings_sso: 'none',
    settings_branding: 'none',
    settings_calendar: 'full'
  };
  if (!viewerRole) {
    await dbInstance.run(
      "INSERT INTO roles (name, permissions) VALUES ('Viewer', ?)",
      [JSON.stringify(viewerPermsObj)]
    );
  } else {
    await dbInstance.run(
      "UPDATE roles SET permissions = ? WHERE id = ?",
      [JSON.stringify(viewerPermsObj), viewerRole.id]
    );
  }

  const adminUser = await dbInstance.get("SELECT id FROM users WHERE username = 'admin'");
  if (!adminUser) {
    const hashedPassword = hashPassword('admin123');
    await dbInstance.run(
      "INSERT INTO users (username, password, role_id) VALUES ('admin', ?, ?)",
      [hashedPassword, adminRoleId]
    );
  }

  // Ensure default Inbox project exists
  const inboxProject = await dbInstance.get("SELECT id FROM projects WHERE name = 'Inbox'");
  if (!inboxProject) {
    await dbInstance.run(
      "INSERT INTO projects (name, description, color, status) VALUES ('Inbox', 'Quickly captured thoughts and task ideas.', '#64748b', 'active')"
    );
  }

  // Ensure default Housekeeping project exists
  const hkProject = await dbInstance.get("SELECT id FROM projects WHERE name = 'Housekeeping'");
  if (!hkProject) {
    await dbInstance.run(
      "INSERT INTO projects (name, description, color, status, is_shared) VALUES ('Housekeeping', 'System project for Housekeeping tasks.', '#8b5cf6', 'active', 0)"
    );
  }

  // Ensure default streaks table records exist for each user
  const dbUsers = await dbInstance.all("SELECT id FROM users");
  for (const u of dbUsers) {
    await dbInstance.run("INSERT OR IGNORE INTO user_streaks (user_id, current_streak, longest_streak, last_completed_date) VALUES (?, 0, 0, NULL)", [u.id]);
  }



    return dbInstance;
  })();

  return dbPromise;
}

// Database helper functions

export async function getSettings() {
  const db = await getDb();
  const rows = await db.all('SELECT * FROM settings');
  const settings = {};
  rows.forEach(r => {
    settings[r.key] = r.value;
  });
  return settings;
}

export async function saveSettings(settings) {
  const db = await getDb();
  await db.run('BEGIN TRANSACTION');
  try {
    for (const [key, val] of Object.entries(settings)) {
      await db.run(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        [key, String(val)]
      );
    }
    await db.run('COMMIT');
    return 0;
  } catch (error) {
    await db.run('ROLLBACK');
    throw error;
  }
}

// ==========================================
// --- LIBRARY MODULE HELPERS ---
// ==========================================

export async function getAllBooks(search = '', tag = '', status = 'library') {
  const db = await getDb();
  let query = 'SELECT * FROM books WHERE 1=1';
  const params = [];
  
  if (search) {
    query += ' AND (title LIKE ? OR author LIKE ? OR isbn LIKE ? OR description LIKE ?)';
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam, searchParam);
  }
  if (tag) {
    query += ' AND ("," || tags || ",") LIKE ?';
    params.push(`%,${tag},%`);
  }
  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }
  query += ' ORDER BY title ASC';
  return await db.all(query, params);
}

export async function getBookById(id) {
  const db = await getDb();
  return await db.get('SELECT * FROM books WHERE id = ?', [id]);
}

export async function createBook(book) {
  const db = await getDb();
  const result = await db.run(
    `INSERT INTO books (isbn, title, author, publisher, published_date, description, cover_url, status, tags, added_by, red_flag, total_pages)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      book.isbn || null,
      book.title,
      book.author || null,
      book.publisher || null,
      book.published_date || null,
      book.description || null,
      book.cover_url || null,
      book.status || 'library',
      book.tags || null,
      book.added_by || null,
      book.red_flag || 0,
      book.total_pages || 0
    ]
  );
  return result.lastID;
}

export async function updateBook(id, book) {
  const db = await getDb();
  await db.run(
    `UPDATE books 
     SET isbn = ?, title = ?, author = ?, publisher = ?, published_date = ?, description = ?, cover_url = ?, status = ?, tags = ?, red_flag = ?, total_pages = ?
     WHERE id = ?`,
    [
      book.isbn || null,
      book.title,
      book.author || null,
      book.publisher || null,
      book.published_date || null,
      book.description || null,
      book.cover_url || null,
      book.status || 'library',
      book.tags || null,
      book.red_flag || 0,
      book.total_pages || 0,
      id
    ]
  );
  return true;
}

export async function deleteBook(id) {
  const db = await getDb();
  const result = await db.run('DELETE FROM books WHERE id = ?', [id]);
  return result.changes > 0;
}

export async function bulkDeleteBooks(ids) {
  const db = await getDb();
  if (!ids || ids.length === 0) return 0;
  const placeholders = ids.map(() => '?').join(',');
  const result = await db.run(`DELETE FROM books WHERE id IN (${placeholders})`, ids);
  return result.changes;
}

export async function bulkArchiveBooks(ids, archiveStatus = 'archived') {
  const db = await getDb();
  if (!ids || ids.length === 0) return 0;
  const placeholders = ids.map(() => '?').join(',');
  const result = await db.run(
    `UPDATE books SET status = ? WHERE id IN (${placeholders})`,
    [archiveStatus, ...ids]
  );
  return result.changes;
}

export async function bulkTagBooks(ids, newTags, action = 'add') {
  const db = await getDb();
  if (!ids || ids.length === 0) return 0;
  
  await db.run('BEGIN TRANSACTION');
  try {
    let updatedCount = 0;
    for (const id of ids) {
      const book = await getBookById(id);
      if (!book) continue;
      
      let tagsArr = [];
      if (book.tags) {
        tagsArr = book.tags.split(',').map(t => t.trim()).filter(Boolean);
      }
      
      const tagsToApply = newTags.split(',').map(t => t.trim()).filter(Boolean);
      
      if (action === 'add') {
        const merged = Array.from(new Set([...tagsArr, ...tagsToApply]));
        await db.run('UPDATE books SET tags = ? WHERE id = ?', [merged.join(','), id]);
      } else if (action === 'remove') {
        const filtered = tagsArr.filter(t => !tagsToApply.includes(t));
        await db.run('UPDATE books SET tags = ? WHERE id = ?', [filtered.join(','), id]);
      } else if (action === 'set') {
        await db.run('UPDATE books SET tags = ? WHERE id = ?', [tagsToApply.join(','), id]);
      }
      updatedCount++;
    }
    await db.run('COMMIT');
    return updatedCount;
  } catch (error) {
    await db.run('ROLLBACK');
    throw error;
  }
}

export async function getRecentBooks(limit = 4) {
  const db = await getDb();
  return await db.all('SELECT * FROM books WHERE status = "library" ORDER BY id DESC LIMIT ?', [limit]);
}

// --- READING LIST HELPERS ---

export async function getReadingListForUser(userId) {
  const db = await getDb();
  return await db.all(`
    SELECT rl.*, 
           b.title as lib_title, b.author as lib_author, b.cover_url as lib_cover_url, b.isbn as lib_isbn
    FROM reading_list rl
    LEFT JOIN books b ON rl.book_id = b.id
    WHERE rl.user_id = ?
    ORDER BY rl.id DESC
  `, [userId]);
}

export async function addBookToReadingList(userId, bookId, manualBook = null, readingListId = null) {
  const db = await getDb();
  if (bookId) {
    const book = await getBookById(bookId);
    if (!book) throw new Error('Book not found in library');
    
    // Check if already in reading list for this specific list
    const existing = await db.get(
      'SELECT id FROM reading_list WHERE user_id = ? AND book_id = ? AND (reading_list_id = ? OR (reading_list_id IS NULL AND ? IS NULL))',
      [userId, bookId, readingListId, readingListId]
    );
    if (existing) return existing.id;
    
    const result = await db.run(
      `INSERT INTO reading_list (user_id, book_id, reading_list_id, title, author, cover_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, bookId, readingListId, book.title, book.author, book.cover_url]
    );
    return result.lastID;
  } else if (manualBook) {
    const result = await db.run(
      `INSERT INTO reading_list (user_id, book_id, reading_list_id, title, author, cover_url)
       VALUES (?, NULL, ?, ?, ?, ?)`,
      [userId, readingListId, manualBook.title, manualBook.author || null, manualBook.cover_url || null]
    );
    return result.lastID;
  }
  throw new Error('Invalid book details provided');
}

export async function removeBookFromReadingList(userId, id) {
  const db = await getDb();
  const result = await db.run(
    'DELETE FROM reading_list WHERE user_id = ? AND id = ?',
    [userId, id]
  );
  return result.changes > 0;
}

export async function getRandomRecommendation(userId) {
  const db = await getDb();
  const books = await db.all('SELECT * FROM reading_list WHERE user_id = ?', [userId]);
  if (books.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * books.length);
  
  // Join the detailed book if it has one
  const rec = books[randomIndex];
  if (rec.book_id) {
    const detail = await getBookById(rec.book_id);
    if (detail) {
      return { ...rec, description: detail.description, publisher: detail.publisher, published_date: detail.published_date };
    }
  }
  return rec;
}

// --- READING LOG HELPERS ---

export async function getReadingLogsForUser(userId) {
  const db = await getDb();
  return await db.all(`
    SELECT rl.*, 
           b.title as lib_title, b.author as lib_author, b.cover_url as lib_cover_url
    FROM reading_log rl
    LEFT JOIN books b ON rl.book_id = b.id
    WHERE rl.user_id = ?
    ORDER BY rl.entry_date DESC, rl.id DESC
  `, [userId]);
}

export async function getBooksLogSummaryForUser(userId) {
  const db = await getDb();
  
  // Get unique books that have logs
  const loggedBooks = await db.all(`
    SELECT DISTINCT 
      COALESCE(rl.book_id, 0) as book_id,
      COALESCE(rl.reading_list_id, 0) as reading_list_id,
      rl.book_title,
      rl.book_author,
      b.cover_url as lib_cover_url
    FROM reading_log rl
    LEFT JOIN books b ON rl.book_id = b.id
    WHERE rl.user_id = ?
  `, [userId]);
  
  for (const book of loggedBooks) {
    let logs;
    if (book.book_id > 0) {
      logs = await db.all(
        'SELECT * FROM reading_log WHERE user_id = ? AND book_id = ? ORDER BY entry_date DESC, id DESC',
        [userId, book.book_id]
      );
    } else if (book.reading_list_id > 0) {
      logs = await db.all(
        'SELECT * FROM reading_log WHERE user_id = ? AND reading_list_id = ? ORDER BY entry_date DESC, id DESC',
        [userId, book.reading_list_id]
      );
    } else {
      logs = await db.all(
        'SELECT * FROM reading_log WHERE user_id = ? AND book_id IS NULL AND reading_list_id IS NULL AND book_title = ? ORDER BY entry_date DESC, id DESC',
        [userId, book.book_title]
      );
    }
    book.logs = logs;
    book.latest_progress = logs.length > 0 ? logs[0].progress_percent : 0;
    book.latest_entry_date = logs.length > 0 ? logs[0].entry_date : null;

    // Check DNF status
    let dnfEntry = null;
    if (book.book_id > 0) {
      dnfEntry = await db.get('SELECT id, reason FROM dnf_books WHERE user_id = ? AND book_id = ?', [userId, book.book_id]);
    } else if (book.reading_list_id > 0) {
      dnfEntry = await db.get('SELECT id, reason FROM dnf_books WHERE user_id = ? AND reading_list_id = ?', [userId, book.reading_list_id]);
    } else {
      dnfEntry = await db.get('SELECT id, reason FROM dnf_books WHERE user_id = ? AND book_title = ? AND book_id IS NULL AND reading_list_id IS NULL', [userId, book.book_title]);
    }
    book.is_dnf = !!dnfEntry;
    book.dnf_id = dnfEntry ? dnfEntry.id : null;
    book.dnf_reason = dnfEntry ? dnfEntry.reason : null;
  }
  
  loggedBooks.sort((a, b) => {
    const dateA = new Date(a.latest_entry_date || 0);
    const dateB = new Date(b.latest_entry_date || 0);
    return dateB - dateA;
  });
  
  return loggedBooks;
}

export async function createReadingLogEntry(userId, entry) {
  const db = await getDb();
  
  let title = entry.book_title;
  let author = entry.book_author;
  
  if (entry.book_id) {
    const book = await getBookById(entry.book_id);
    if (book) {
      title = book.title;
      author = book.author;
    }
  } else if (entry.reading_list_id) {
    const rlItem = await db.get('SELECT * FROM reading_list WHERE id = ?', [entry.reading_list_id]);
    if (rlItem) {
      title = rlItem.title;
      author = rlItem.author;
    }
  }
  
  const entryDate = entry.entry_date || new Date().toISOString().replace('T', ' ').substring(0, 19);
  
  const result = await db.run(
    `INSERT INTO reading_log (user_id, book_id, reading_list_id, book_title, book_author, entry_date, progress_percent, notes, page_number, total_pages)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      entry.book_id || null,
      entry.reading_list_id || null,
      title,
      author || null,
      entryDate,
      entry.progress_percent !== undefined ? Number(entry.progress_percent) : 0,
      entry.notes || null,
      entry.page_number !== undefined ? Number(entry.page_number) : null,
      entry.total_pages !== undefined ? Number(entry.total_pages) : null
    ]
  );
  return result.lastID;
}

export async function deleteReadingLogEntry(userId, entryId) {
  const db = await getDb();
  const result = await db.run(
    'DELETE FROM reading_log WHERE user_id = ? AND id = ?',
    [userId, entryId]
  );
  return result.changes > 0;
}

// --- READING LISTS & DNF HELPERS ---

export async function getReadingListsForUser(userId) {
  const db = await getDb();
  return await db.all('SELECT * FROM reading_lists WHERE user_id = ? ORDER BY id DESC', [userId]);
}

export async function getReadingListById(id) {
  const db = await getDb();
  return await db.get('SELECT * FROM reading_lists WHERE id = ?', [id]);
}

export async function createReadingList(userId, name, description, isPublic = 0) {
  const db = await getDb();
  const shareToken = crypto.randomBytes(16).toString('hex');
  const result = await db.run(
    'INSERT INTO reading_lists (user_id, name, description, is_public, share_token) VALUES (?, ?, ?, ?, ?)',
    [userId, name, description, isPublic ? 1 : 0, shareToken]
  );
  return result.lastID;
}

export async function updateReadingList(id, name, description, isPublic) {
  const db = await getDb();
  await db.run(
    'UPDATE reading_lists SET name = ?, description = ?, is_public = ? WHERE id = ?',
    [name, description, isPublic ? 1 : 0, id]
  );
  return true;
}

export async function deleteReadingList(id) {
  const db = await getDb();
  await db.run('DELETE FROM reading_list WHERE reading_list_id = ?', [id]);
  const result = await db.run('DELETE FROM reading_lists WHERE id = ?', [id]);
  return result.changes > 0;
}

export async function getReadingListItems(listId) {
  const db = await getDb();
  return await db.all(`
    SELECT rl.*, 
           b.title as lib_title, b.author as lib_author, b.cover_url as lib_cover_url, b.isbn as lib_isbn, b.total_pages as lib_total_pages
    FROM reading_list rl
    LEFT JOIN books b ON rl.book_id = b.id
    WHERE rl.reading_list_id = ?
    ORDER BY rl.id DESC
  `, [listId]);
}

export async function getSharedReadingList(token) {
  const db = await getDb();
  const list = await db.get('SELECT * FROM reading_lists WHERE share_token = ?', [token]);
  if (!list) return null;
  if (list.is_public !== 1) return null;
  const items = await getReadingListItems(list.id);
  return { list, items };
}

export async function addBookComment(bookId, userId, comment) {
  const db = await getDb();
  const result = await db.run(
    'INSERT INTO book_comments (book_id, user_id, comment) VALUES (?, ?, ?)',
    [bookId, userId, comment]
  );
  return result.lastID;
}

export async function getBookComments(bookId) {
  const db = await getDb();
  return await db.all(`
    SELECT bc.*, u.username, u.display_name
    FROM book_comments bc
    LEFT JOIN users u ON bc.user_id = u.id
    WHERE bc.book_id = ?
    ORDER BY bc.created_at ASC
  `, [bookId]);
}

export async function deleteBookComment(commentId, userId) {
  const db = await getDb();
  const result = await db.run(
    'DELETE FROM book_comments WHERE id = ? AND user_id = ?',
    [commentId, userId]
  );
  return result.changes > 0;
}

export async function addBookRecommendation(bookId, fromUserId, toUserId, notes) {
  const db = await getDb();
  const result = await db.run(
    'INSERT INTO book_recommendations (book_id, from_user_id, to_user_id, notes) VALUES (?, ?, ?, ?)',
    [bookId, fromUserId, toUserId, notes || null]
  );
  return result.lastID;
}

export async function getRecommendationsForUser(userId) {
  const db = await getDb();
  return await db.all(`
    SELECT br.*, 
           b.title as book_title, b.author as book_author, b.cover_url as book_cover_url,
           u_from.username as from_username, u_from.display_name as from_display_name
    FROM book_recommendations br
    LEFT JOIN books b ON br.book_id = b.id
    LEFT JOIN users u_from ON br.from_user_id = u_from.id
    WHERE br.to_user_id = ?
    ORDER BY br.created_at DESC
  `, [userId]);
}

export async function deleteRecommendation(recId, userId) {
  const db = await getDb();
  const result = await db.run(
    'DELETE FROM book_recommendations WHERE id = ? AND to_user_id = ?',
    [recId, userId]
  );
  return result.changes > 0;
}


// Password utilities
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedPassword) {
  if (!storedPassword) return false;
  const [salt, originalHash] = storedPassword.split(':');
  if (!salt || !originalHash) return false;
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

// User CRUD Helpers
export async function getUserByUsername(username) {
  const db = await getDb();
  return await db.get(`
    SELECT u.*, r.name as role_name, r.permissions as role_permissions 
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.username = ?
  `, [username]);
}

export async function getUserById(id) {
  const db = await getDb();
  return await db.get(`
    SELECT u.*, r.name as role_name, r.permissions as role_permissions 
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.id = ?
  `, [id]);
}

export async function getAllUsers() {
  const db = await getDb();
  return await db.all(`
    SELECT u.id, u.username, u.role_id, u.display_name, u.auth_provider, u.timezone, u.hide_from_contacts, u.created_at, r.name as role_name 
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    ORDER BY u.username ASC
  `);
}

export async function createUser(username, password, roleId, displayName = null, authProvider = 'local', hideFromContacts = 0) {
  const db = await getDb();
  const hashedPassword = hashPassword(password);
  const hideVal = (hideFromContacts === 1 || hideFromContacts === '1' || hideFromContacts === true) ? 1 : 0;
  const result = await db.run(
    "INSERT INTO users (username, password, role_id, display_name, auth_provider, hide_from_contacts) VALUES (?, ?, ?, ?, ?, ?)",
    [username, hashedPassword, roleId || null, displayName, authProvider, hideVal]
  );
  return result.lastID;
}

export async function updateUser(id, username, password, roleId, displayName = undefined, hideFromContacts = undefined) {
  const db = await getDb();
  const updates = ['username = ?', 'role_id = ?'];
  const params = [username, roleId || null];

  if (password && password.trim()) {
    const hashedPassword = hashPassword(password);
    updates.push('password = ?');
    params.push(hashedPassword);
  }
  if (displayName !== undefined) {
    updates.push('display_name = ?');
    params.push(displayName);
  }
  if (hideFromContacts !== undefined) {
    const hideVal = (hideFromContacts === 1 || hideFromContacts === '1' || hideFromContacts === true) ? 1 : 0;
    updates.push('hide_from_contacts = ?');
    params.push(hideVal);
  }

  params.push(id);
  await db.run(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    params
  );
  return true;
}

export async function deleteUser(id) {
  const db = await getDb();
  const user = await getUserById(id);
  if (user && user.username === 'admin') {
    throw new Error("Cannot delete default admin user.");
  }
  const result = await db.run("DELETE FROM users WHERE id = ?", [id]);
  return result.changes > 0;
}

// Role CRUD Helpers
export async function getAllRoles() {
  const db = await getDb();
  return await db.all("SELECT * FROM roles ORDER BY name ASC");
}

export async function getRoleById(id) {
  const db = await getDb();
  return await db.get("SELECT * FROM roles WHERE id = ?", [id]);
}

export async function createRole(name, permissions) {
  const db = await getDb();
  const permsStr = typeof permissions === 'string' ? permissions : JSON.stringify(permissions);
  const result = await db.run(
    "INSERT INTO roles (name, permissions) VALUES (?, ?)",
    [name, permsStr]
  );
  return result.lastID;
}

export async function updateRole(id, name, permissions) {
  const db = await getDb();
  const permsStr = typeof permissions === 'string' ? permissions : JSON.stringify(permissions);
  await db.run(
    "UPDATE roles SET name = ?, permissions = ? WHERE id = ?",
    [name, permsStr, id]
  );
  return true;
}

export async function deleteRole(id) {
  const db = await getDb();
  const role = await getRoleById(id);
  if (role && role.name === 'Administrator') {
    throw new Error("Cannot delete Administrator role.");
  }
  const linkedUsers = await db.get("SELECT COUNT(*) as cnt FROM users WHERE role_id = ?", [id]);
  if (linkedUsers && linkedUsers.cnt > 0) {
    throw new Error("Cannot delete role; it is currently assigned to users.");
  }
  const result = await db.run("DELETE FROM roles WHERE id = ?", [id]);
  return result.changes > 0;
}


// --- SHOPPING LIST HELPERS ---

export async function getShoppingListsForUser(userId) {
  const db = await getDb();
  
  // Get all lists owned by the user or shared with the user
  const lists = await db.all(`
    SELECT sl.id, sl.name, sl.owner_id, sl.created_at, u.username as owner_username,
           CASE WHEN sl.owner_id = ? THEN 'owner'
                ELSE IFNULL(sls.permission, 'view')
           END as permission
    FROM shopping_lists sl
    JOIN users u ON sl.owner_id = u.id
    LEFT JOIN shopping_list_shares sls ON sl.id = sls.list_id AND sls.shared_with_user_id = ?
    WHERE sl.owner_id = ? OR sls.shared_with_user_id = ?
    ORDER BY sl.name ASC
  `, [userId, userId, userId, userId]);
  
  return lists;
}

export async function createShoppingList(name, ownerId) {
  const db = await getDb();
  const result = await db.run(
    "INSERT INTO shopping_lists (name, owner_id) VALUES (?, ?)",
    [name, ownerId]
  );
  return result.lastID;
}

export async function renameShoppingList(id, name) {
  const db = await getDb();
  await db.run("UPDATE shopping_lists SET name = ? WHERE id = ?", [name, id]);
  return true;
}

export async function deleteShoppingList(id) {
  const db = await getDb();
  await db.run("DELETE FROM shopping_lists WHERE id = ?", [id]);
  return true;
}

export async function getShoppingListDetails(id, userId) {
  const db = await getDb();
  
  // Verify access and get list info
  const listInfo = await db.get(`
    SELECT sl.id, sl.name, sl.owner_id, u.username as owner_username,
           CASE WHEN sl.owner_id = ? THEN 'owner'
                ELSE IFNULL(sls.permission, 'view')
           END as permission
    FROM shopping_lists sl
    JOIN users u ON sl.owner_id = u.id
    LEFT JOIN shopping_list_shares sls ON sl.id = sls.list_id AND sls.shared_with_user_id = ?
    WHERE sl.id = ? AND (sl.owner_id = ? OR sls.shared_with_user_id = ?)
  `, [userId, userId, id, userId, userId]);

  if (!listInfo) return null;

  // Get custom/static items
  const items = await db.all(
    "SELECT * FROM shopping_list_items WHERE list_id = ? ORDER BY id ASC",
    [id]
  );

  // Get linked recipes
  const recipes = await db.all(`
    SELECT slr.recipe_id, r.title as recipe_title
    FROM shopping_list_recipes slr
    JOIN recipes r ON slr.recipe_id = r.id
    WHERE slr.list_id = ?
    ORDER BY r.title ASC
  `, [id]);

  // Get share settings (only for owner)
  let shares = [];
  if (listInfo.owner_id === userId) {
    shares = await db.all(`
      SELECT sls.id, sls.shared_with_user_id, sls.permission, u.username as shared_username
      FROM shopping_list_shares sls
      JOIN users u ON sls.shared_with_user_id = u.id
      WHERE sls.list_id = ?
      ORDER BY u.username ASC
    `, [id]);
  }

  return { list: listInfo, items, recipes, shares };
}

// Function to link a recipe to a shopping list and copy its ingredients
export async function addRecipeToShoppingList(listId, recipeId) {
  const db = await getDb();
  
  // Link the recipe in shopping_list_recipes
  await db.run(
    "INSERT OR IGNORE INTO shopping_list_recipes (list_id, recipe_id) VALUES (?, ?)",
    [listId, recipeId]
  );
  
  // Fetch recipe ingredients
  const recipe = await getRecipeById(recipeId);
  if (!recipe) return;
  
  // Fetch ingredients category helper function (inline copy from server.js to db.js to avoid circular import)
  const categorizeIngredientLocal = (name) => {
    const nameLower = name.toLowerCase();
    const produce = ['onion', 'garlic', 'tomato', 'cilantro', 'spinach', 'lettuce', 'lemon', 'lime', 'potato', 'apple', 'banana', 'ginger', 'pepper', 'carrot', 'basil', 'parsley', 'herb', 'cucumber', 'avocado', 'cabbage', 'broccoli', 'mushroom', 'celery', 'zucchini', 'squash', 'shallot', 'scallion', 'chive', 'rosemary', 'thyme', 'oregano', 'mint', 'berry', 'strawberry', 'blueberry', 'raspberry', 'fruit', 'vegetable', 'greens', 'asparagus', 'kale', 'cilantro'];
    const meat = ['chicken', 'beef', 'pork', 'bacon', 'sausage', 'steak', 'shrimp', 'fish', 'salmon', 'turkey', 'breast', 'thigh', 'ground', 'lamb', 'ham', 'rib', 'meat', 'seafood', 'crab', 'lobster', 'tuna', 'veal', 'venison', 'pepperoni'];
    const dairy = ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'egg', 'sour cream', 'cheddar', 'parmesan', 'mozzarella', 'ricotta', 'ghee', 'half-and-half', 'buttermilk', 'margarine', 'feta', 'provolone'];
    const bakery = ['bread', 'bun', 'roll', 'tortilla', 'pita', 'baguette', 'loaf', 'crust', 'naan', 'wrap'];
    const pantry = ['flour', 'sugar', 'salt', 'pepper', 'oil', 'vinegar', 'sauce', 'rice', 'pasta', 'noodle', 'bean', 'spice', 'powder', 'extract', 'honey', 'maple', 'broth', 'stock', 'can', 'canned', 'soy sauce', 'mayo', 'mustard', 'ketchup', 'vanilla', 'soda', 'yeast', 'cinnamon', 'cumin', 'chili', 'oregano', 'paprika', 'bouillon', 'chickpea', 'lentil', 'nut', 'almond', 'peanut', 'cashew', 'seed', 'dressing', 'syrup', 'tahini', 'cocoa', 'chocolate', 'chips', 'breadcrumbs', 'caper', 'olives', 'jam', 'jelly', 'broth', 'marinade'];
    const frozen = ['frozen', 'ice cream', 'ice', 'waffles', 'veggies'];

    if (meat.some(k => nameLower.includes(k))) return 'Meat & Seafood';
    if (produce.some(k => nameLower.includes(k))) return 'Produce';
    if (dairy.some(k => nameLower.includes(k))) return 'Dairy & Eggs';
    if (bakery.some(k => nameLower.includes(k))) return 'Bakery';
    if (pantry.some(k => nameLower.includes(k))) return 'Pantry';
    if (frozen.some(k => nameLower.includes(k))) return 'Frozen';
    return 'Other';
  };

  // Copy ingredients to shopping_list_items
  for (const ing of recipe.ingredients) {
    const category = categorizeIngredientLocal(ing.name);
    const rawText = ing.raw_text || `${ing.amount} ${ing.unit} ${ing.name}`.trim();
    await db.run(
      `INSERT INTO shopping_list_items (list_id, name, amount, unit, category, raw_text, is_checked, recipe_id)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      [listId, ing.name, ing.amount || '', ing.unit || '', category, rawText, recipeId]
    );
  }
}

// Function to unlink a recipe and delete its ingredients from the list
export async function removeRecipeFromShoppingList(listId, recipeId) {
  const db = await getDb();
  await db.run(
    "DELETE FROM shopping_list_recipes WHERE list_id = ? AND recipe_id = ?",
    [listId, recipeId]
  );
  await db.run(
    "DELETE FROM shopping_list_items WHERE list_id = ? AND recipe_id = ?",
    [listId, recipeId]
  );
}

// Add a manual custom item
export async function addCustomShoppingListItem(listId, item) {
  const db = await getDb();
  const rawText = item.raw_text || `${item.amount || ''} ${item.unit || ''} ${item.name}`.trim();
  const result = await db.run(
    `INSERT INTO shopping_list_items (list_id, name, amount, unit, category, raw_text, is_checked, recipe_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
    [listId, item.name, item.amount || '', item.unit || '', item.category || 'Other', rawText, item.is_checked || 0]
  );
  return result.lastID;
}

// Update a shopping list item
export async function updateShoppingListItem(itemId, updates) {
  const db = await getDb();
  const fields = [];
  const values = [];
  
  for (const [key, val] of Object.entries(updates)) {
    fields.push(`${key} = ?`);
    values.push(val);
  }
  
  values.push(itemId);
  
  await db.run(
    `UPDATE shopping_list_items SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  return true;
}

// Delete a shopping list item
export async function deleteShoppingListItem(itemId) {
  const db = await getDb();
  await db.run("DELETE FROM shopping_list_items WHERE id = ?", [itemId]);
  return true;
}

// Share a shopping list with another user
export async function shareShoppingList(listId, sharedWithUserId, permission) {
  const db = await getDb();
  await db.run(
    `INSERT INTO shopping_list_shares (list_id, shared_with_user_id, permission)
     VALUES (?, ?, ?)
     ON CONFLICT(list_id, shared_with_user_id) DO UPDATE SET permission = excluded.permission`,
    [listId, sharedWithUserId, permission]
  );
  return true;
}

// Revoke sharing permissions
export async function removeShoppingListShare(listId, shareId) {
  const db = await getDb();
  await db.run(
    "DELETE FROM shopping_list_shares WHERE list_id = ? AND id = ?",
    [listId, shareId]
  );
  return true;
}

// Clear all items and links
export async function clearShoppingListItems(listId) {
  const db = await getDb();
  await db.run("DELETE FROM shopping_list_items WHERE list_id = ?", [listId]);
  await db.run("DELETE FROM shopping_list_recipes WHERE list_id = ?", [listId]);
  return true;
}

export async function getAllRecipes(search = '') {
  const db = await getDb();
  if (search) {
    return await db.all(
      'SELECT * FROM recipes WHERE title LIKE ? OR description LIKE ? ORDER BY title ASC',
      [`%${search}%`, `%${search}%`]
    );
  }
  return await db.all('SELECT * FROM recipes ORDER BY title ASC');
}

export async function getRecipeById(id) {
  const db = await getDb();
  const recipe = await db.get('SELECT * FROM recipes WHERE id = ?', [id]);
  if (!recipe) return null;

  recipe.ingredients = await db.all('SELECT * FROM ingredients WHERE recipe_id = ? ORDER BY id ASC', [id]);
  recipe.instructions = await db.all('SELECT * FROM instructions WHERE recipe_id = ? ORDER BY step_number ASC', [id]);
  recipe.notes = await db.all('SELECT * FROM recipe_notes WHERE recipe_id = ? ORDER BY step_number ASC, id ASC', [id]);
  
  return recipe;
}

export async function createRecipe(recipe) {
  const db = await getDb();
  
  // Start transaction
  await db.run('BEGIN TRANSACTION');
  try {
    const recipeResult = await db.run(
      `INSERT INTO recipes (title, description, prep_time, cook_time, servings, image_path, source_url, favorite, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recipe.title,
        recipe.description || '',
        recipe.prep_time || null,
        recipe.cook_time || null,
        recipe.servings || null,
        recipe.image_path || '',
        recipe.source_url || '',
        recipe.favorite ? 1 : 0,
        recipe.tags || null
      ]
    );
    const recipeId = recipeResult.lastID;

    if (recipe.ingredients && recipe.ingredients.length > 0) {
      for (const ing of recipe.ingredients) {
        await db.run(
          `INSERT INTO ingredients (recipe_id, name, amount, unit, raw_text)
           VALUES (?, ?, ?, ?, ?)`,
          [recipeId, ing.name, ing.amount || '', ing.unit || '', ing.raw_text || '']
        );
      }
    }

    if (recipe.instructions && recipe.instructions.length > 0) {
      for (let i = 0; i < recipe.instructions.length; i++) {
        const inst = recipe.instructions[i];
        await db.run(
          `INSERT INTO instructions (recipe_id, step_number, instruction_text)
           VALUES (?, ?, ?)`,
          [recipeId, inst.step_number || (i + 1), inst.instruction_text]
        );
      }
    }

    if (recipe.notes && recipe.notes.length > 0) {
      for (let i = 0; i < recipe.notes.length; i++) {
        const n = recipe.notes[i];
        const noteText = typeof n === 'string' ? n.trim() : (n.note_text || '').trim();
        if (noteText) {
          await db.run(
            `INSERT INTO recipe_notes (recipe_id, step_number, note_text)
             VALUES (?, ?, ?)`,
            [recipeId, n.step_number || (i + 1), noteText]
          );
        }
      }
    }

    await db.run('COMMIT');
    return recipeId;
  } catch (error) {
    await db.run('ROLLBACK');
    throw error;
  }
}

export async function updateRecipe(id, recipe) {
  const db = await getDb();
  
  await db.run('BEGIN TRANSACTION');
  try {
    await db.run(
      `UPDATE recipes 
       SET title = ?, description = ?, prep_time = ?, cook_time = ?, servings = ?, image_path = ?, source_url = ?, favorite = ?, tags = ?
       WHERE id = ?`,
      [
        recipe.title,
        recipe.description || '',
        recipe.prep_time || null,
        recipe.cook_time || null,
        recipe.servings || null,
        recipe.image_path || '',
        recipe.source_url || '',
        recipe.favorite ? 1 : 0,
        recipe.tags || null,
        id
      ]
    );

    // Re-create ingredients
    await db.run('DELETE FROM ingredients WHERE recipe_id = ?', [id]);
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      for (const ing of recipe.ingredients) {
        await db.run(
          `INSERT INTO ingredients (recipe_id, name, amount, unit, raw_text)
           VALUES (?, ?, ?, ?, ?)`,
          [id, ing.name, ing.amount || '', ing.unit || '', ing.raw_text || '']
        );
      }
    }

    // Re-create instructions
    await db.run('DELETE FROM instructions WHERE recipe_id = ?', [id]);
    if (recipe.instructions && recipe.instructions.length > 0) {
      for (let i = 0; i < recipe.instructions.length; i++) {
        const inst = recipe.instructions[i];
        await db.run(
          `INSERT INTO instructions (recipe_id, step_number, instruction_text)
           VALUES (?, ?, ?)`,
          [id, inst.step_number || (i + 1), inst.instruction_text]
        );
      }
    }

    // Re-create notes
    await db.run('DELETE FROM recipe_notes WHERE recipe_id = ?', [id]);
    if (recipe.notes && recipe.notes.length > 0) {
      for (let i = 0; i < recipe.notes.length; i++) {
        const n = recipe.notes[i];
        const noteText = typeof n === 'string' ? n.trim() : (n.note_text || '').trim();
        if (noteText) {
          await db.run(
            `INSERT INTO recipe_notes (recipe_id, step_number, note_text)
             VALUES (?, ?, ?)`,
            [id, n.step_number || (i + 1), noteText]
          );
        }
      }
    }

    await db.run('COMMIT');
    return true;
  } catch (error) {
    await db.run('ROLLBACK');
    throw error;
  }
}

export async function deleteRecipe(id) {
  const db = await getDb();
  const result = await db.run('DELETE FROM recipes WHERE id = ?', [id]);
  return result.changes > 0;
}

export async function toggleRecipeFavorite(id) {
  const db = await getDb();
  const recipe = await db.get("SELECT favorite FROM recipes WHERE id = ?", [id]);
  if (!recipe) throw new Error("Recipe not found");
  const newFav = recipe.favorite === 1 ? 0 : 1;
  await db.run("UPDATE recipes SET favorite = ? WHERE id = ?", [newFav, id]);
  return newFav;
}

export async function getWeeklyMenu() {
  const db = await getDb();
  const items = await db.all(`
    SELECT wm.*, 
           r.title as recipe_title, r.image_path as recipe_image,
           l.name as leftover_name, l.id as leftover_id
    FROM weekly_menu wm
    LEFT JOIN recipes r ON wm.recipe_id = r.id
    LEFT JOIN leftovers l ON wm.leftover_id = l.id
  `);
  return items;
}

export async function saveCustomMeal(name) {
  if (!name || name.trim() === '') return;
  const db = await getDb();
  await db.run('INSERT OR IGNORE INTO custom_meals (name) VALUES (?)', [name.trim()]);
}

export async function saveReusableTags(tagsString) {
  if (!tagsString || tagsString.trim() === '') return;
  const db = await getDb();
  const tagList = tagsString.split(',').map(t => t.trim()).filter(Boolean);
  for (const tag of tagList) {
    await db.run('INSERT OR IGNORE INTO reusable_tags (name) VALUES (?)', [tag]);
  }
}

export async function getCustomMeals() {
  const db = await getDb();
  const rows = await db.all('SELECT name FROM custom_meals ORDER BY name ASC');
  return rows.map(r => r.name);
}

export async function getReusableTags() {
  const db = await getDb();
  const rows = await db.all('SELECT name FROM reusable_tags ORDER BY name ASC');
  return rows.map(r => r.name);
}

export async function clearWeeklyMenu() {
  const db = await getDb();
  await db.run('DELETE FROM weekly_menu');
  return true;
}

export async function addWeeklyMenuEntry(dayOfWeek, mealType, recipeId, leftoverId = null, hasLeftovers = 0, customMeal = null, servings = null, tags = null, assignedPeople = null) {
  const db = await getDb();
  let finalTags = tags;
  if (leftoverId) {
    const tagList = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    if (!tagList.some(t => t.toLowerCase() === 'leftovers')) {
      tagList.push('Leftovers');
    }
    finalTags = tagList.join(', ');
  }
  const result = await db.run(
    `INSERT INTO weekly_menu (day_of_week, meal_type, recipe_id, leftover_id, has_leftovers, custom_meal, servings, tags, assigned_people)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [dayOfWeek, mealType, recipeId || null, leftoverId || null, hasLeftovers, customMeal || null, servings || null, finalTags || null, assignedPeople || null]
  );

  if (customMeal) {
    await saveCustomMeal(customMeal);
  }
  if (finalTags) {
    await saveReusableTags(finalTags);
  }

  return result.lastID;
}

export async function updateWeeklyMenuEntry(id, recipeId, leftoverId = null, hasLeftovers = 0, customMeal = null, servings = null, tags = null, assignedPeople = null) {
  const db = await getDb();
  let finalTags = tags;
  if (leftoverId) {
    const tagList = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    if (!tagList.some(t => t.toLowerCase() === 'leftovers')) {
      tagList.push('Leftovers');
    }
    finalTags = tagList.join(', ');
  }
  await db.run(
    `UPDATE weekly_menu SET 
       recipe_id = ?, 
       leftover_id = ?, 
       has_leftovers = ?, 
       custom_meal = ?, 
       servings = ?, 
       tags = ?,
       assigned_people = ?
     WHERE id = ?`,
    [recipeId || null, leftoverId || null, hasLeftovers, customMeal || null, servings || null, finalTags || null, assignedPeople || null, id]
  );

  if (customMeal) {
    await saveCustomMeal(customMeal);
  }
  if (finalTags) {
    await saveReusableTags(finalTags);
  }

  return id;
}

export async function deleteWeeklyMenuEntry(id) {
  const db = await getDb();
  await db.run('DELETE FROM weekly_menu WHERE id = ?', [id]);
  return id;
}

export async function updateWeeklyMenu(dayOfWeek, mealType, recipeId, leftoverId = null, hasLeftovers = 0, customMeal = null, servings = null) {
  return await addWeeklyMenuEntry(dayOfWeek, mealType, recipeId, leftoverId, hasLeftovers, customMeal, servings, null);
}

export async function getAllTemplates() {
  const db = await getDb();
  return await db.all('SELECT * FROM templates ORDER BY name ASC');
}

export async function getTemplateById(id) {
  const db = await getDb();
  return await db.get('SELECT * FROM templates WHERE id = ?', [id]);
}

export async function getDefaultTemplate() {
  const db = await getDb();
  return await db.get('SELECT * FROM templates WHERE is_default = 1');
}

export async function addTemplate(name, filePath, isDefault = 0) {
  const db = await getDb();
  
  if (isDefault === 1) {
    // Reset other templates default flag
    await db.run('UPDATE templates SET is_default = 0');
  }
  
  const result = await db.run(
    'INSERT INTO templates (name, file_path, is_default) VALUES (?, ?, ?)',
    [name, filePath, isDefault]
  );
  
  // If this is the only template, make it default
  const count = await db.get('SELECT COUNT(*) as cnt FROM templates');
  if (count.cnt === 1) {
    await db.run('UPDATE templates SET is_default = 1 WHERE id = ?', [result.lastID]);
  }
  
  return result.lastID;
}

export async function setDefaultTemplate(id) {
  const db = await getDb();
  await db.run('UPDATE templates SET is_default = 0');
  const result = await db.run('UPDATE templates SET is_default = 1 WHERE id = ?', [id]);
  return result.changes > 0;
}

export async function deleteTemplate(id) {
  const db = await getDb();
  const template = await getTemplateById(id);
  if (!template) return false;
  
  // Delete database record
  await db.run('DELETE FROM templates WHERE id = ?', [id]);
  
  // If we deleted the default template, set another one as default
  if (template.is_default === 1) {
    const nextTemplate = await db.get('SELECT id FROM templates LIMIT 1');
    if (nextTemplate) {
      await db.run('UPDATE templates SET is_default = 1 WHERE id = ?', [nextTemplate.id]);
    }
  }
  
  return template.file_path;
}


// Leftovers CRUD helpers
export async function getAllLeftovers() {
  const db = await getDb();
  return await db.all(`
    SELECT l.*, r.title as recipe_title 
    FROM leftovers l 
    LEFT JOIN recipes r ON l.recipe_id = r.id 
    ORDER BY l.date_added DESC
  `);
}

export async function createLeftover(name, recipeId, servings = 1, expirationDate = null) {
  const db = await getDb();
  let expDate = expirationDate;
  if (!expDate) {
    const d = new Date();
    d.setDate(d.getDate() + 4);
    expDate = d.toISOString().split('T')[0];
  }
  const result = await db.run(
    "INSERT INTO leftovers (name, recipe_id, servings, expiration_date) VALUES (?, ?, ?, ?)",
    [name, recipeId || null, servings, expDate]
  );
  return result.lastID;
}

export async function getLeftoverById(id) {
  const db = await getDb();
  return await db.get(`
    SELECT l.*, r.title as recipe_title 
    FROM leftovers l 
    LEFT JOIN recipes r ON l.recipe_id = r.id 
    WHERE l.id = ?
  `, [id]);
}

export async function updateLeftover(id, name, recipeId, servings = 1, expirationDate = null) {
  const db = await getDb();
  await db.run(
    "UPDATE leftovers SET name = ?, recipe_id = ?, servings = ?, expiration_date = ? WHERE id = ?",
    [name, recipeId || null, servings, expirationDate || null, id]
  );
  return await getLeftoverById(id);
}

export async function deleteLeftover(id) {
  const db = await getDb();
  const result = await db.run("DELETE FROM leftovers WHERE id = ?", [id]);
  return result.changes > 0;
}

// Recent recipes helper
export async function getRecentRecipes(limit = 4) {
  const db = await getDb();
  return await db.all("SELECT * FROM recipes ORDER BY id DESC LIMIT ?", [limit]);
}

// Inventory CRUD Helpers
export async function getAllInventory() {
  const db = await getDb();
  return await db.all("SELECT * FROM inventory ORDER BY date_added DESC");
}

export async function getInventoryItemById(id) {
  const db = await getDb();
  return await db.get("SELECT * FROM inventory WHERE id = ?", [id]);
}

export async function createInventoryItem(item) {
  const db = await getDb();
  const result = await db.run(
    `INSERT INTO inventory (title, category, date_added, expiration_date, percentage_used, size_number, size_unit)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      item.title,
      item.category,
      item.date_added,
      item.expiration_date || null,
      item.percentage_used || 0,
      item.size_number !== undefined && item.size_number !== null ? Number(item.size_number) : null,
      item.size_unit || null
    ]
  );
  return result.lastID;
}

export async function updateInventoryItem(id, item) {
  const db = await getDb();
  const result = await db.run(
    `UPDATE inventory 
     SET title = ?, category = ?, date_added = ?, expiration_date = ?, percentage_used = ?, size_number = ?, size_unit = ?
     WHERE id = ?`,
    [
      item.title,
      item.category,
      item.date_added,
      item.expiration_date || null,
      item.percentage_used !== undefined ? Number(item.percentage_used) : 0,
      item.size_number !== undefined && item.size_number !== null ? Number(item.size_number) : null,
      item.size_unit || null,
      id
    ]
  );
  return result.changes > 0;
}

export async function deleteInventoryItem(id) {
  const db = await getDb();
  const result = await db.run("DELETE FROM inventory WHERE id = ?", [id]);
  return result.changes > 0;
}

export async function deleteInventoryItemsBulk(ids) {
  const db = await getDb();
  if (!ids || ids.length === 0) return 0;
  
  await db.run('BEGIN TRANSACTION');
  try {
    const placeholders = ids.map(() => '?').join(',');
    const result = await db.run(`DELETE FROM inventory WHERE id IN (${placeholders})`, ids);
    await db.run('COMMIT');
    return result.changes;
  } catch (error) {
    await db.run('ROLLBACK');
    throw error;
  }
}

export async function updateInventoryItemsBulk(ids, updates) {
  const db = await getDb();
  if (!ids || ids.length === 0) return 0;

  await db.run('BEGIN TRANSACTION');
  try {
    const placeholders = ids.map(() => '?').join(',');
    
    if (updates.percentage_used !== undefined && updates.expiration_date !== undefined) {
      const result = await db.run(
        `UPDATE inventory SET percentage_used = ?, expiration_date = ? WHERE id IN (${placeholders})`,
        [updates.percentage_used, updates.expiration_date || null, ...ids]
      );
      await db.run('COMMIT');
      return result.changes;
    } else if (updates.percentage_used !== undefined) {
      const result = await db.run(
        `UPDATE inventory SET percentage_used = ? WHERE id IN (${placeholders})`,
        [updates.percentage_used, ...ids]
      );
      await db.run('COMMIT');
      return result.changes;
    } else if (updates.expiration_date !== undefined) {
      const result = await db.run(
        `UPDATE inventory SET expiration_date = ? WHERE id IN (${placeholders})`,
        [updates.expiration_date || null, ...ids]
      );
      await db.run('COMMIT');
      return result.changes;
    }
    
    await db.run('COMMIT');
    return 0;
  } catch (error) {
    await db.run('ROLLBACK');
    throw error;
  }
}


// --- PROJECT HELPERS ---
export async function getAllProjects() {
  const db = await getDb();
  return await db.all("SELECT * FROM projects ORDER BY name ASC");
}

export async function getProjectById(id) {
  const db = await getDb();
  return await db.get("SELECT * FROM projects WHERE id = ?", [id]);
}

export async function createProject(project) {
  const db = await getDb();
  const result = await db.run(
    "INSERT INTO projects (name, description, color, status, is_shared) VALUES (?, ?, ?, ?, ?)",
    [project.name, project.description || null, project.color || '#3b82f6', project.status || 'active', project.is_shared ? 1 : 0]
  );
  return result.lastID;
}

export async function updateProject(id, project) {
  const db = await getDb();
  await db.run(
    "UPDATE projects SET name = ?, description = ?, color = ?, status = ?, is_shared = ? WHERE id = ?",
    [project.name, project.description || null, project.color || '#3b82f6', project.status || 'active', project.is_shared ? 1 : 0, id]
  );
  return true;
}

export async function deleteProject(id) {
  const db = await getDb();
  
  // Do not allow deleting Inbox or Housekeeping project
  const project = await getProjectById(id);
  if (project && (project.name === 'Inbox' || project.name === 'Housekeeping')) {
    throw new Error(`Cannot delete default ${project.name} project.`);
  }

  // Move tasks associated with this project to Inbox project
  const inbox = await db.get("SELECT id FROM projects WHERE name = 'Inbox'");
  if (inbox) {
    await db.run("UPDATE tasks SET project_id = ? WHERE project_id = ?", [inbox.id, id]);
  }

  const result = await db.run("DELETE FROM projects WHERE id = ?", [id]);
  return result.changes > 0;
}


// --- TASK HELPERS ---
export async function getAllTasks(userId, filters = {}, todayStr = null) {
  const db = await getDb();
  if (!todayStr) {
    const user = await db.get("SELECT timezone FROM users WHERE id = ?", [userId]);
    const tz = user?.timezone || 'America/New_York';
    const mapping = {
      'US/New_York': 'America/New_York',
      'US/Eastern': 'America/New_York',
      'US/Central': 'America/Chicago',
      'US/Mountain': 'America/Denver',
      'US/Pacific': 'America/Los_Angeles',
      'US/Alaska': 'America/Anchorage',
      'US/Hawaii': 'Pacific/Honolulu'
    };
    const normTz = mapping[tz] || tz || 'America/New_York';
    todayStr = new Date().toLocaleDateString('sv', { timeZone: normTz });
  }
  let query = `
    SELECT t.*, p.name as project_name, p.color as project_color, p.is_shared as project_is_shared,
           u.username as assignee_username, u.display_name as assignee_display_name
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON t.user_id = u.id
    WHERE (t.user_id = ? OR p.is_shared = 1) AND t.is_micro_step = 0
  `;
  const params = [userId];

  if (!filters.routine_id && !filters.include_routines) {
    query += ' AND t.routine_id IS NULL';
  } else if (filters.routine_id) {
    query += ' AND t.routine_id = ?';
    params.push(filters.routine_id);
  }

  if (!filters.habit_id && !filters.include_habits) {
    query += ' AND t.habit_id IS NULL';
  } else if (filters.habit_id) {
    query += ' AND t.habit_id = ?';
    params.push(filters.habit_id);
  }

  if (filters.search) {
    query += ' AND (t.title LIKE ? OR t.description LIKE ?)';
    const searchParam = `%${filters.search}%`;
    params.push(searchParam, searchParam);
  }

  if (filters.project_id) {
    query += ' AND t.project_id = ?';
    params.push(filters.project_id);
  }

  if (filters.status) {
    if (filters.status === 'today') {
      query += " AND t.status = 'today'";
    } else if (filters.status === 'pending') {
      query += " AND t.status != 'completed' AND t.status != 'archived'";
    } else {
      query += ' AND t.status = ?';
      params.push(filters.status);
    }
  }

  if (filters.priority) {
    query += ' AND t.priority = ?';
    params.push(filters.priority);
  }

  if (filters.due_date) {
    query += ' AND t.due_date = ?';
    params.push(filters.due_date);
  }

  query += ' ORDER BY CASE t.priority WHEN "urgent" THEN 1 WHEN "high" THEN 2 WHEN "medium" THEN 3 WHEN "low" THEN 4 ELSE 5 END ASC, t.id DESC';
  
  const tasks = await db.all(query, params);
  
  // Attach subtasks / micro-steps count
  for (const task of tasks) {
    const subtasks = await db.all("SELECT id, title, status FROM tasks WHERE parent_id = ? AND is_micro_step = 1", [task.id]);
    task.subtasks = subtasks;
  }

  // Fetch virtual housekeeping tasks assigned to this user and merge them
  const hk = await db.get("SELECT id, name FROM projects WHERE name = 'Housekeeping'");
  if (hk) {
    const matchesHkFilter = !filters.project_id || String(filters.project_id) === String(hk.id);
    if (matchesHkFilter) {
      let hkStatusFilter = '';
      if (filters.status === 'pending') {
        hkStatusFilter = " AND h.status != 'completed' ";
      } else if (filters.status === 'completed') {
        hkStatusFilter = " AND h.status = 'completed' ";
      } else if (filters.status === 'today') {
        hkStatusFilter = ` AND h.status != 'completed' AND h.due_date = '${todayStr}' `;
      }
      
      let hkQuery = `
        SELECT 
          'housekeeping-' || h.id as id,
          h.assigned_to_user_id as user_id,
          ? as project_id,
          h.title,
          h.description,
          CASE 
            WHEN h.status = 'completed' THEN 'completed' 
            WHEN h.due_date = '${todayStr}' THEN 'today'
            ELSE 'backlog' 
          END as status,
          'medium' as priority,
          h.due_date,
          0 as estimated_time,
          0 as time_spent,
          0 as is_recurring,
          NULL as recurrence_pattern,
          NULL as parent_id,
          0 as is_micro_step,
          NULL as routine_id,
          NULL as habit_id,
          NULL as habit_task_type,
          h.created_at,
          NULL as completed_at,
          ? as project_name,
          '#8b5cf6' as project_color,
          0 as project_is_shared,
          u.username as assignee_username,
          u.display_name as assignee_display_name
        FROM housekeeping_tasks h
        LEFT JOIN users u ON h.assigned_to_user_id = u.id
        WHERE h.assigned_to_user_id = ? ${hkStatusFilter}
      `;
      
      const hkParams = [hk.id, hk.name, userId];
      
      if (filters.search) {
        hkQuery += ' AND (h.title LIKE ? OR h.description LIKE ?)';
        const searchParam = `%${filters.search}%`;
        hkParams.push(searchParam, searchParam);
      }
      
      if (filters.due_date) {
        hkQuery += ' AND h.due_date = ?';
        hkParams.push(filters.due_date);
      }
      
      const hkTasks = await db.all(hkQuery, hkParams);
      for (const t of hkTasks) {
        t.subtasks = [];
      }
      tasks.push(...hkTasks);
    }
  }
  
  return tasks;
}

export async function getTaskById(id) {
  const db = await getDb();
  const task = await db.get(`
    SELECT t.*, p.name as project_name, p.color as project_color 
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.id = ?
  `, [id]);
  
  if (task) {
    task.subtasks = await db.all("SELECT id, title, status FROM tasks WHERE parent_id = ? ORDER BY id ASC", [id]);
  }
  return task;
}

export async function createTask(userId, task) {
  const db = await getDb();
  let projectId = task.project_id;
  
  if (!projectId && !task.routine_id && !task.habit_id) {
    const inbox = await db.get("SELECT id FROM projects WHERE name = 'Inbox'");
    if (inbox) projectId = inbox.id;
  }

  const result = await db.run(
    `INSERT INTO tasks (user_id, project_id, title, description, status, priority, due_date, estimated_time, time_spent, is_recurring, recurrence_pattern, parent_id, is_micro_step, routine_id, habit_id, habit_task_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      projectId || null,
      task.title,
      task.description || null,
      task.status || 'backlog',
      task.priority || 'medium',
      task.due_date || null,
      task.estimated_time || 0,
      task.is_recurring ? 1 : 0,
      task.recurrence_pattern || null,
      task.parent_id || null,
      task.is_micro_step ? 1 : 0,
      task.routine_id || null,
      task.habit_id || null,
      task.habit_task_type || null
    ]
  );

  const newTaskId = result.lastID;

  // Add micro-steps if provided
  if (task.subtasks && Array.from(task.subtasks).length > 0) {
    for (const sub of task.subtasks) {
      await db.run(
        `INSERT INTO tasks (user_id, project_id, title, status, parent_id, is_micro_step)
         VALUES (?, ?, ?, 'backlog', ?, 1)`,
        [userId, projectId || null, sub.title, newTaskId]
      );
    }
  }

  return newTaskId;
}

export async function updateTask(id, task) {
  const db = await getDb();
  await db.run(
    `UPDATE tasks 
     SET project_id = ?, title = ?, description = ?, status = ?, priority = ?, due_date = ?, estimated_time = ?, is_recurring = ?, recurrence_pattern = ?, parent_id = ?, is_micro_step = ?, routine_id = ?, habit_id = ?, habit_task_type = ?
     WHERE id = ?`,
    [
      task.project_id || null,
      task.title,
      task.description || null,
      task.status || 'backlog',
      task.priority || 'medium',
      task.due_date || null,
      task.estimated_time || 0,
      task.is_recurring ? 1 : 0,
      task.recurrence_pattern || null,
      task.parent_id || null,
      task.is_micro_step ? 1 : 0,
      task.routine_id || null,
      task.habit_id || null,
      task.habit_task_type || null,
      id
    ]
  );

  // Sync subtasks
  if (task.subtasks) {
    // Basic replacement for subtasks: delete subtasks not present in the new set, and insert/update others
    const currentSubtasks = await db.all("SELECT id FROM tasks WHERE parent_id = ?", [id]);
    const currentIds = currentSubtasks.map(s => s.id);
    const newIds = task.subtasks.filter(s => s.id).map(s => s.id);
    
    // Delete missing
    const toDelete = currentIds.filter(cid => !newIds.includes(cid));
    if (toDelete.length > 0) {
      const placeholders = toDelete.map(() => '?').join(',');
      await db.run(`DELETE FROM tasks WHERE id IN (${placeholders})`, toDelete);
    }

    // Add or Update
    for (const sub of task.subtasks) {
      if (sub.id) {
        await db.run("UPDATE tasks SET title = ?, status = ? WHERE id = ?", [sub.title, sub.status || 'backlog', sub.id]);
      } else {
        await db.run(
          "INSERT INTO tasks (user_id, project_id, title, status, parent_id, is_micro_step) VALUES (?, ?, ?, ?, ?, 1)",
          [task.user_id || 1, task.project_id || null, sub.title, sub.status || 'backlog', id]
        );
      }
    }
  }

  return true;
}

export async function deleteTask(id) {
  const db = await getDb();
  // Subtasks will be deleted by CASCADE foreign key constraint
  const result = await db.run('DELETE FROM tasks WHERE id = ?', [id]);
  return result.changes > 0;
}

export async function completeTask(userId, id, completed = true) {
  const db = await getDb();
  const status = completed ? 'completed' : 'backlog';
  const completedAt = completed ? new Date().toISOString() : null;
  
  const task = await db.get("SELECT t.*, p.is_shared FROM tasks t LEFT JOIN projects p ON t.project_id = p.id WHERE t.id = ?", [id]);
  if (!task) return false;
  
  if (task.user_id !== userId && (!task.is_shared || task.is_shared !== 1)) {
    return false;
  }
  
  const result = await db.run(
    "UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?",
    [status, completedAt, id]
  );
  
  if (result.changes > 0 && completed) {
    // Trigger user streak check
    await updateUserStreak(userId);
  }
  
  return result.changes > 0;
}

// --- TIME LOG HELPERS ---
export async function startTimeLog(taskId) {
  const db = await getDb();
  
  // Stop any active time logs first
  const activeLog = await db.get("SELECT id, task_id, start_time FROM time_logs WHERE end_time IS NULL");
  if (activeLog) {
    const end = new Date().toISOString();
    const duration = Math.round((new Date(end) - new Date(activeLog.start_time)) / 1000);
    await db.run("UPDATE time_logs SET end_time = ?, duration = ? WHERE id = ?", [end, duration, activeLog.id]);
    await db.run("UPDATE tasks SET time_spent = time_spent + ? WHERE id = ?", [duration, activeLog.task_id]);
  }

  const start = new Date().toISOString();
  const result = await db.run(
    "INSERT INTO time_logs (task_id, start_time, end_time, duration) VALUES (?, ?, NULL, 0)",
    [taskId]
  );
  return result.lastID;
}

export async function stopTimeLog(logId) {
  const db = await getDb();
  const log = await db.get("SELECT * FROM time_logs WHERE id = ?", [logId]);
  if (!log || log.end_time) return false;

  const end = new Date().toISOString();
  const duration = Math.round((new Date(end) - new Date(log.start_time)) / 1000);
  
  await db.run(
    "UPDATE time_logs SET end_time = ?, duration = ? WHERE id = ?",
    [end, duration, logId]
  );

  await db.run(
    "UPDATE tasks SET time_spent = time_spent + ? WHERE id = ?",
    [duration, log.task_id]
  );

  return true;
}

export async function getActiveTimeLog(userId) {
  const db = await getDb();
  return await db.get(`
    SELECT tl.*, t.title as task_title 
    FROM time_logs tl
    JOIN tasks t ON tl.task_id = t.id
    WHERE t.user_id = ? AND tl.end_time IS NULL
    LIMIT 1
  `, [userId]);
}

export async function getTimeLogsForTask(taskId) {
  const db = await getDb();
  return await db.all("SELECT * FROM time_logs WHERE task_id = ? ORDER BY start_time DESC", [taskId]);
}

// --- FOCUS SESSION HELPERS ---
export async function createFocusSession(userId, session) {
  const db = await getDb();
  const result = await db.run(
    "INSERT INTO focus_sessions (user_id, task_id, type, duration, completed) VALUES (?, ?, ?, ?, ?)",
    [userId, session.task_id || null, session.type || 'pomodoro', session.duration, session.completed ? 1 : 0]
  );

  // If completed work session, add duration to task's time_spent
  if (session.completed && session.task_id && session.type === 'pomodoro') {
    await db.run("UPDATE tasks SET time_spent = time_spent + ? WHERE id = ?", [session.duration, session.task_id]);
    
    // Log in time_logs as well
    const end = new Date().toISOString();
    const start = new Date(Date.now() - session.duration * 1000).toISOString();
    await db.run(
      "INSERT INTO time_logs (task_id, start_time, end_time, duration) VALUES (?, ?, ?, ?)",
      [session.task_id, start, end, session.duration]
    );
  }

  return result.lastID;
}

export async function getFocusSessionsForUser(userId) {
  const db = await db.all("SELECT * FROM focus_sessions WHERE user_id = ? ORDER BY created_at DESC", [userId]);
  return db;
}

function normalizeTimezone(tz) {
  const mapping = {
    'US/New_York': 'America/New_York',
    'US/Eastern': 'America/New_York',
    'US/Central': 'America/Chicago',
    'US/Mountain': 'America/Denver',
    'US/Pacific': 'America/Los_Angeles',
    'US/Alaska': 'America/Anchorage',
    'US/Hawaii': 'Pacific/Honolulu'
  };
  return mapping[tz] || tz || 'America/New_York';
}

// --- STREAK HELPERS ---
export async function checkAndResetStreak(userId) {
  const db = await getDb();
  let streak = await db.get("SELECT * FROM user_streaks WHERE user_id = ?", [userId]);
  if (!streak) {
    await db.run("INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_completed_date) VALUES (?, 0, 0, NULL)", [userId]);
    return { current_streak: 0, longest_streak: 0, last_completed_date: null };
  }

  if (streak.last_completed_date) {
    const user = await db.get("SELECT timezone FROM users WHERE id = ?", [userId]);
    const userTz = normalizeTimezone(user?.timezone);
    const todayStr = new Date().toLocaleDateString('sv', { timeZone: userTz }); // YYYY-MM-DD user local format
    const lastDate = new Date(streak.last_completed_date);
    const todayDate = new Date(todayStr);
    
    const diffTime = Math.abs(todayDate - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // If they missed yesterday (more than 1 day difference between today and last completed date)
    // and they haven't completed a task today, reset current_streak to 0
    if (diffDays > 1 && streak.last_completed_date !== todayStr) {
      await db.run("UPDATE user_streaks SET current_streak = 0 WHERE user_id = ?", [userId]);
      streak.current_streak = 0;
    }
  }

  return streak;
}

export async function updateUserStreak(userId) {
  const db = await getDb();
  // Ensure streak record exists and is checked
  const streak = await checkAndResetStreak(userId);
  const user = await db.get("SELECT timezone FROM users WHERE id = ?", [userId]);
  const userTz = normalizeTimezone(user?.timezone);
  const todayStr = new Date().toLocaleDateString('sv', { timeZone: userTz }); // YYYY-MM-DD
  
  if (streak.last_completed_date === todayStr) {
    // Already logged task completion today, streak is up to date
    return streak;
  }

  let nextStreak = 1;
  
  if (streak.last_completed_date) {
    const lastDate = new Date(streak.last_completed_date);
    const todayDate = new Date(todayStr);
    const diffTime = Math.abs(todayDate - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      // Completed yesterday, streak continues!
      nextStreak = streak.current_streak + 1;
    }
  }

  const nextLongest = Math.max(nextStreak, streak.longest_streak);

  await db.run(
    "UPDATE user_streaks SET current_streak = ?, longest_streak = ?, last_completed_date = ? WHERE user_id = ?",
    [nextStreak, nextLongest, todayStr, userId]
  );

  return {
    user_id: userId,
    current_streak: nextStreak,
    longest_streak: nextLongest,
    last_completed_date: todayStr
  };
}

// User Push Notifications Tokens for Mobile Client
export async function saveUserPushToken(userId, token, platform = 'mobile', deviceName = '') {
  const db = await getDb();
  await db.run(
    `INSERT INTO user_push_tokens (user_id, token, platform, device_name, updated_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(token) DO UPDATE SET
       user_id = excluded.user_id,
       platform = excluded.platform,
       device_name = excluded.device_name,
       updated_at = CURRENT_TIMESTAMP`,
    [userId, token, platform || 'mobile', deviceName || '']
  );
  return { success: true };
}

export async function deleteUserPushToken(userId, token = null) {
  const db = await getDb();
  if (token) {
    await db.run('DELETE FROM user_push_tokens WHERE user_id = ? AND token = ?', [userId, token]);
  } else {
    await db.run('DELETE FROM user_push_tokens WHERE user_id = ?', [userId]);
  }
  return { success: true };
}

export async function getUserPushTokens(userId) {
  const db = await getDb();
  return await db.all('SELECT * FROM user_push_tokens WHERE user_id = ? ORDER BY updated_at DESC', [userId]);
}

