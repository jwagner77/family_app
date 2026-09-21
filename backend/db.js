import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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

  // Seed default recipes if not already present
  await seedDefaultRecipes(dbInstance);

    return dbInstance;
  })();

  return dbPromise;
}

async function seedDefaultRecipes(db) {
  const recipes = [
    {
      title: 'Arancini Rice Ball Casserole',
      description: 'A comforting Italian-style baked casserole with seasoned ground beef, sweet peas, and rich tomato sauce layered between creamy Arborio rice and melted cheeses.',
      prep_time: 40,
      cook_time: 30,
      servings: 6,
      tags: 'Beef, Italian, Casserole, Dinner',
      ingredients: [
        { name: 'Ground Beef', amount: '1', unit: 'pound', raw_text: '1 pound Ground Beef' },
        { name: 'Uncooked Arborio Rice', amount: '1', unit: 'cup', raw_text: '1 cup Uncooked Arborio Rice' },
        { name: 'Eggs, beaten', amount: '2', unit: '', raw_text: '2 Eggs, beaten' },
        { name: 'Olive Oil', amount: '1', unit: 'tablespoon', raw_text: '1 tablespoon Olive Oil' },
        { name: 'Tomato Sauce', amount: '3', unit: 'cups', raw_text: '3 cups Tomato Sauce' },
        { name: 'Peas, Frozen', amount: '1', unit: 'cup', raw_text: '1 cup Peas, Frozen' },
        { name: 'Mozzarella Cheese, shredded', amount: '1 1/2', unit: 'cups', raw_text: '1 ½ cups Mozzarella Cheese, shredded' },
        { name: 'Pecorino Romano Cheese, grated', amount: '1/4', unit: 'cup', raw_text: '¼ cup Pecorino Romano Cheese, grated' },
        { name: 'Minced Onion', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Minced Onion' },
        { name: 'Garlic Powder', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Garlic Powder' },
        { name: 'Salt', amount: '1/4', unit: 'teaspoon', raw_text: '¼ teaspoon Salt' },
        { name: 'Pepper', amount: '1/4', unit: 'teaspoon', raw_text: '¼ teaspoon Pepper' },
        { name: 'Cooking Spray', amount: '', unit: '', raw_text: 'Cooking Spray' }
      ],
      instructions: [
        'Cook Arborio rice according to package directions and set aside to cool.',
        'Preheat oven to 400 degrees. Coat sides and bottom of 9x13 baking dish with cooking spray.',
        'Heat olive oil in skillet over medium-high heat. Cook ground beef until brown. Add in minced onion, garlic, salt, pepper and peas. Add one cup of sauce and remove from heat.',
        'In a large bowl, combine rice with two eggs, half the Pecorino Romano cheese and two cups of sauce.',
        'Spread half the rice mixture at the bottom of the baking pan. Spread the meat mixture over the rice. Sprinkle half the mozzarella cheese over the meat mix. Cover with the remaining rice mixture. Bake for 20 minutes.',
        'Remove from oven and sprinkle with the remaining cheeses. Continue baking for an additional 10 minutes.',
        'Serve.'
      ]
    },
    {
      title: 'Corned Beef',
      description: 'Tender slow-cooked corned beef with garlic, sweet brown sugar, apple cider vinegar, and fragrant bay leaf.',
      prep_time: 5,
      cook_time: 540,
      servings: 6,
      tags: 'Beef, Slow Cooker, Dinner',
      ingredients: [
        { name: 'Corned Beef, with packet', amount: '3', unit: 'pounds', raw_text: '3 pounds Corned Beef, with packet' },
        { name: 'Water', amount: '1', unit: 'cup', raw_text: '1 cup Water' },
        { name: 'Garlic, minced', amount: '1 1/2', unit: 'teaspoons', raw_text: '1 ½ teaspoons Garlic, minced' },
        { name: 'Bay Leaf', amount: '1', unit: '', raw_text: '1 Bay Leaf' },
        { name: 'Sugar', amount: '2', unit: 'tablespoons', raw_text: '2 tablespoons Sugar' },
        { name: 'Apple Cider Vinegar', amount: '2', unit: 'tablespoons', raw_text: '2 tablespoons Apple Cider Vinegar' },
        { name: 'Pepper', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Pepper' }
      ],
      instructions: [
        'Add corned beef, fat side up, to the slow cooker.',
        'Add the garlic, spice packet, sugar and pepper to the top of the meat and rub.',
        'Add the vinegar and bay leaf to the side of the corned beef and add then add the water.',
        'Cook on low for 8-9 hours.'
      ]
    },
    {
      title: 'Filet Mignon',
      description: 'Perfect tender seared and oven-finished filet mignon basted in aromatic garlic, fresh rosemary, and melted butter.',
      prep_time: 10,
      cook_time: 90,
      servings: 2,
      tags: 'Beef, Steak, Dinner, Gourmet',
      ingredients: [
        { name: 'Filet Mignons', amount: '2', unit: '', raw_text: '2 Filet Mignons' },
        { name: 'Salt', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Salt' },
        { name: 'Pepper', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Pepper' },
        { name: 'Olive Oil', amount: '1', unit: 'tablespoon', raw_text: '1 tablespoon Olive Oil' },
        { name: 'Butter', amount: '2', unit: 'tablespoons', raw_text: '2 tablespoons Butter' },
        { name: 'Garlic, minced', amount: '1 1/2', unit: 'teaspoons', raw_text: '1 ½ teaspoons Garlic, minced' },
        { name: 'Fresh Rosemary', amount: '4', unit: 'sprigs', raw_text: '4 sprigs Fresh Rosemary' }
      ],
      instructions: [
        'Remove steaks from refrigerator 30-60 minutes before preparing. Unwrap, season with salt and pepper and let sit on a plate.',
        'Preheat oven to 360 degrees. Place a medium cast iron skillet over high heat for 3-5 minutes. Once hot, add oil. Sear the filet mignons for 2-3 minutes per side, until brown with a nice crust. Remove skillet from heat.',
        'Carefully add butter, garlic and rosemary to skillet. Place skillet in oven and bake for 2-8 minutes depending on desired doneness (Rule of thumb: 8 min well-done, 6-7 min medium-well, 5 min medium, 3-4 min medium-rare, 2 min rare).',
        'Remove steak from skillet and place on a plate. Tent with foil, then rest for 5-10 minutes.',
        'Serve with garlic and butter from skillet.'
      ]
    },
    {
      title: 'Korean BBQ Meatballs',
      description: 'Savory seasoned beef meatballs glazed in sweet and tangy Korean BBQ sauce with spicy mayo and toasted sesame seeds.',
      prep_time: 15,
      cook_time: 20,
      servings: 5,
      tags: 'Beef, Korean, Asian, Meatballs, Appetizer, Dinner',
      ingredients: [
        { name: 'Ground Beef', amount: '1', unit: 'pound', raw_text: '1 pound Ground Beef' },
        { name: 'Panko Breadcrumbs', amount: '1/2', unit: 'cup', raw_text: '½ cup Panko Breadcrumbs' },
        { name: 'Egg, beaten', amount: '1', unit: '', raw_text: '1 Egg, beaten' },
        { name: 'Green Onions, chopped', amount: '2', unit: '', raw_text: '2 Green Onions, chopped' },
        { name: 'Garlic, minced', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Garlic, minced' },
        { name: 'Ginger, grated', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Ginger, grated' },
        { name: 'Soy Sauce', amount: '2', unit: 'tablespoons', raw_text: '2 tablespoons Soy Sauce' },
        { name: 'Sesame Oil', amount: '1', unit: 'tablespoon', raw_text: '1 tablespoon Sesame Oil' },
        { name: 'Brown Sugar', amount: '1', unit: 'tablespoon', raw_text: '1 tablespoon Brown Sugar' },
        { name: 'Pepper', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Pepper' },
        { name: 'Korean BBQ Glaze', amount: '1', unit: 'serving', raw_text: '1 serving Korean BBQ Glaze (see recipe)' },
        { name: 'Spicy Mayonnaise', amount: '1', unit: 'serving', raw_text: '1 serving Spicy Mayonnaise (see recipe)' },
        { name: 'Sesame Seeds', amount: '', unit: '', raw_text: 'Sesame Seeds' }
      ],
      instructions: [
        'Preheat oven to 400 degrees and line a baking sheet with parchment paper.',
        'In a bowl, combine ground meat, breadcrumbs, egg, green onions, garlic, ginger, soy sauce, sesame oil, brown sugar and pepper.',
        'Roll mixture into 1 1/2-inch meatballs and place them on the prepared baking sheet.',
        'Bake the meatballs for 15-18 minutes.',
        'Make the Korean BBQ Glaze.',
        'Once the meatballs are cooked, toss them in the Korean BBQ Glaze.',
        'Make the Spicy Mayo.',
        'Serve meatballs with sesame seeds and spicy Mayonnaise.'
      ]
    },
    {
      title: 'Meatball Wellington',
      description: 'Juicy Italian-seasoned meatballs wrapped in flaky puff pastry with melted mozzarella and rich tomato sauce.',
      prep_time: 20,
      cook_time: 35,
      servings: 4,
      tags: 'Beef, Italian, Baking, Dinner, Entree',
      ingredients: [
        { name: 'Ground Beef', amount: '1', unit: 'pound', raw_text: '1 pound Ground Beef' },
        { name: 'Italian Breadcrumbs', amount: '1/2', unit: 'cup', raw_text: '½ cup Italian Breadcrumbs' },
        { name: 'Egg + 1 Egg, beaten', amount: '2', unit: '', raw_text: '1 Egg + 1 Egg, beaten' },
        { name: 'Salt', amount: '1/4', unit: 'teaspoon', raw_text: '¼ teaspoons Salt' },
        { name: 'Pepper', amount: '1/4', unit: 'teaspoon', raw_text: '¼ teaspoon Pepper' },
        { name: 'Yellow Onion, minced', amount: '1/2', unit: '', raw_text: '½ Yellow Onion, minced' },
        { name: 'Garlic, minced', amount: '1 1/2', unit: 'teaspoons', raw_text: '1 ½ teaspoons Garlic, minced' },
        { name: 'Parsley, chopped', amount: '1/4', unit: 'cup', raw_text: '¼ cup Parsley, chopped' },
        { name: 'Thawed Puff Pastry, cut into 4-inch squares', amount: '1', unit: 'package', raw_text: '1 package Thawed Puff Pastry, cut into 4-inch squares' },
        { name: 'Mozzarella Cheese, shredded', amount: '2', unit: 'cups', raw_text: '2 cups Mozzarella Cheese, shredded' },
        { name: 'Tomato Sauce', amount: '1/4', unit: 'cup', raw_text: '¼ cup Tomato Sauce (for serving)' },
        { name: 'Garnish Basil', amount: '', unit: '', raw_text: 'Garnish Basil' },
        { name: 'Garnish Parmesan Cheese', amount: '', unit: '', raw_text: 'Garnish Parmesan Cheese' }
      ],
      instructions: [
        'Preheat oven to 400 degrees.',
        'In a large mixing bowl, combine ground beef, breadcrumbs, 1 egg, salt, pepper, onion, garlic, and parsley.',
        'Shape into 1-inch balls and place on parchment lined baking sheet. Bake for 7-10 minutes. Set aside until cool enough to handle.',
        'Flour your work surface and place puff pastry squares onto the surface. Add 1 tablespoon of shredded mozzarella onto the center of the pastry square. Place meatball on top of the cheese. Wrap puff pastry around meatball.',
        'Place on parchment lined baking sheet, seam side down. Brush with beaten egg.',
        'Bake for 25 minutes.',
        'Serve over tomato sauce and garnish with basil and parmesan cheese.'
      ]
    },
    {
      title: 'Meatloaf',
      description: "Classic tender homemade beef and pork meatloaf with sauteed mushrooms, onions, and a savory sweet ketchup-mustard glaze (Mom's Recipe).",
      prep_time: 15,
      cook_time: 80,
      servings: 6,
      tags: 'Beef, Pork, Comfort Food, Dinner, Family Favorite',
      ingredients: [
        { name: 'Ground Beef', amount: '2', unit: 'pounds', raw_text: '2 pounds Ground Beef' },
        { name: 'Ground Pork', amount: '1', unit: 'pound', raw_text: '1 pound Ground Pork' },
        { name: 'Sour Dough Bread, no crust', amount: '2 1/2', unit: 'cups', raw_text: '2 ½ cups Sour Dough Bread, no crust' },
        { name: 'Beef Broth', amount: '1/2', unit: 'cup', raw_text: '½ cup Beef Broth' },
        { name: 'Mushrooms, diced', amount: '1', unit: 'cup', raw_text: '1 cup Mushrooms, diced' },
        { name: 'Onion', amount: '1', unit: '', raw_text: '1 Onion' },
        { name: 'Eggs', amount: '2', unit: '', raw_text: '2 Eggs' },
        { name: 'Montreal Steak Seasoning', amount: '1/2', unit: 'tablespoon', raw_text: '½ tablespoon Montreal Steak Seasoning' },
        { name: 'Ketchup', amount: '1 1/2', unit: 'cups', raw_text: '1 ½ cups Ketchup' },
        { name: 'Deli Mustard', amount: '1/4', unit: 'cup', raw_text: '¼ cup Deli Mustard' },
        { name: 'Worcestershire Sauce', amount: '1', unit: 'tablespoon', raw_text: '1 tablespoon Worcestershire Sauce' },
        { name: 'Brown Sugar', amount: '2', unit: 'tablespoons', raw_text: '2 tablespoons Brown Sugar' }
      ],
      instructions: [
        'Preheat oven to 350 degrees.',
        'Soak the bread in beef broth (or whole milk). The bread should be wet and sticky.',
        'Sauté the mushrooms and onions, drain and set off to the side to cool.',
        'Combine beef, pork, bread, mushrooms and onions. Once mixed through, add the seasoning and the eggs, then mix. Shape the mixture into a loaf and bake on a foil lined cookie sheet for one hour.',
        'Make the glaze while the meat is in the oven: Add all of the glaze ingredients (ketchup, deli mustard, Worcestershire, brown sugar) to a bowl and whisk together. Set aside.',
        'After baking the meat for an hour, check the internal temperature and drain the juices. Add the glaze and bake for another 15-20 minutes until cooked through.'
      ]
    },
    {
      title: 'Moussaka',
      description: 'Traditional layered Greek casserole with seasoned meat sauce, tender fried eggplant, zucchini, and golden baked bechamel cream.',
      prep_time: 30,
      cook_time: 100,
      servings: 8,
      tags: 'Beef, Greek, Mediterranean, Casserole, Dinner',
      ingredients: [
        { name: 'Greek Ground Meat Sauce', amount: '1', unit: 'serving', raw_text: '1 serving Greek Ground Meat Sauce (see recipe)' },
        { name: 'Bechamel Sauce', amount: '1', unit: 'serving', raw_text: '1 serving Bechamel Sauce (see recipe)' },
        { name: 'Russet Potatoes', amount: '2', unit: 'pounds', raw_text: '2 pounds Russet Potatoes' },
        { name: 'Eggplant', amount: '1.5', unit: 'pounds', raw_text: '1.5 pounds Eggplant' },
        { name: 'Zucchini', amount: '1', unit: 'pound', raw_text: '1 pound Zucchini' },
        { name: 'Salt', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Salt' },
        { name: 'Pepper', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Pepper' },
        { name: 'Vegetable Oil', amount: '', unit: '', raw_text: 'Vegetable Oil' }
      ],
      instructions: [
        'Make the Greek Ground Meat Sauce and Bechamel Sauce.',
        'Slice the eggplant lengthwise. Add them to a bowl with cold water to soak for a few minutes.',
        'Slice the zucchini the same way. Season with ½ teaspoon salt and ¼ teaspoon pepper.',
        'Peel and cut potatoes. Season with ½ teaspoon salt and ¼ teaspoon pepper.',
        'Preheat oven to 390 degrees.',
        'Heat vegetable oil in a sauté pan (covering at least 1/3 of the pan). Deep fry the potatoes, zucchini and eggplant, draining on paper towels.',
        'Lay potato slices in a 9x13-inch baking dish. Layer the eggplant slices on top of the potatoes. Lay zucchini over the eggplant. Spread the Greek Ground Meat Sauce on top. Top with the bechamel cream.',
        'Bake for 30 minutes or until the cream is golden brown.',
        'Cool for 30 minutes and serve.'
      ]
    },
    {
      title: 'Pot Roast',
      description: 'Melt-in-your-mouth slow cooker pot roast with tender red potatoes, carrots, and rich savory homemade beef gravy.',
      prep_time: 15,
      cook_time: 480,
      servings: 6,
      tags: 'Beef, Slow Cooker, Comfort Food, Dinner',
      ingredients: [
        { name: 'Rump Roast', amount: '2', unit: 'pounds', raw_text: '2 pounds Rump Roast' },
        { name: 'Red Potatoes', amount: '1 1/2', unit: 'pounds', raw_text: '1 ½ pounds Red Potatoes' },
        { name: 'Carrots, chopped into 1-inch pieces', amount: '1', unit: 'pound', raw_text: '1 pound Carrots, chopped into 1-inch pieces' },
        { name: 'Onion, chopped', amount: '1/2', unit: '', raw_text: '½ Onion, chopped' },
        { name: 'Beef Stock', amount: '4', unit: 'cups', raw_text: '4 cups Beef Stock' },
        { name: 'Garlic, minced', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Garlic, minced' },
        { name: 'Italian Seasoning', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Italian Seasoning' },
        { name: 'Salt', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Salt' },
        { name: 'Pepper', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Pepper' },
        { name: 'Water', amount: '1/4', unit: 'cup', raw_text: '¼ cup Water' },
        { name: 'Corn Starch', amount: '2', unit: 'tablespoons', raw_text: '2 tablespoons Corn Starch' }
      ],
      instructions: [
        'Add your roast to the crock pot and then place the vegetables around it.',
        'Add all of the seasonings and beef stock.',
        'Cover and cook on low for 8 hours or on high for five hours. Shred the beef once cooked through.',
        '15 minutes before the meat is done, make the gravy: In a small bowl, whisk together the ¼ cup of water and the corn starch. Remove two cups of liquid from the crock pot and place it in a saucepan. Whisk in the water and corn starch mixture into the beef juice.',
        'Bring to a boil, stirring frequently for 3-5 minutes until it begins to thicken.',
        'Serve the pot roast covered in the gravy.'
      ]
    },
    {
      title: 'Stir-Fried Steak and Vegetables',
      description: 'Quick and colorful sirloin steak stir fry with crisp vegetables and savory sweet ginger-soy glaze over brown rice.',
      prep_time: 5,
      cook_time: 20,
      servings: 4,
      tags: 'Beef, Asian, Quick Meals, Dinner, Healthy',
      ingredients: [
        { name: 'Brown Rice', amount: '1 1/2', unit: 'cups', raw_text: '1 ½ cups Brown Rice' },
        { name: 'Corn Starch', amount: '1', unit: 'tablespoon', raw_text: '1 tablespoon Corn Starch' },
        { name: 'Brown Sugar', amount: '1', unit: 'tablespoon', raw_text: '1 tablespoon Brown Sugar' },
        { name: 'Ground Ginger', amount: '3/4', unit: 'teaspoon', raw_text: '¾ teaspoon Ground Ginger' },
        { name: 'Chili Powder', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Chili Powder' },
        { name: 'Garlic Powder', amount: '1/4', unit: 'teaspoon', raw_text: '¼ teaspoon Garlic Powder' },
        { name: 'Pepper', amount: '1/4', unit: 'teaspoon', raw_text: '¼ teaspoon Pepper' },
        { name: 'Water', amount: '1/2', unit: 'cup', raw_text: '½ cup Water' },
        { name: 'Soy Sauce', amount: '1/4', unit: 'cup', raw_text: '¼ cup Soy Sauce' },
        { name: 'Beef Top Sirloin Steak, cut 1/2-inch cubes', amount: '1', unit: 'pound', raw_text: '1 pound Beef Top Sirloin Steak, cut ½-inch cubes' },
        { name: 'Canola Oil', amount: '2', unit: 'tablespoons', raw_text: '2 tablespoons Canola Oil' },
        { name: 'Frozen Stir-Fry Vegetable Blend, thawed', amount: '1', unit: 'package (16 oz)', raw_text: '1 package (16 ounces) Frozen Stir-Fry Vegetable Blend, thawed' }
      ],
      instructions: [
        'Cook rice according to package directions.',
        'In a small bowl, combine corn starch, brown sugar, seasonings, water and soy sauce until smooth.',
        'Add corn starch mixture to a pan and bring to a boil. Cook and stir for two minutes or until the sauce is thickened. Set aside.',
        'In a large nonstick skillet or wok, stir-fry beef in one tablespoon oil until no longer pink. Remove and keep warm.',
        'Stir fry vegetables in the remaining oil until crisp tender. Add the cooked beef and heat through.',
        'Serve over rice and top with the sauce.'
      ]
    },
    {
      title: 'Swedish Meatballs',
      description: 'Tender spiced beef and pork meatballs with hints of nutmeg and allspice, baked and served with rich creamy gravy.',
      prep_time: 30,
      cook_time: 35,
      servings: 4,
      tags: 'Beef, Pork, Swedish, Scandinavian, Meatballs, Comfort Food, Dinner',
      ingredients: [
        { name: 'Butter', amount: '2', unit: 'tablespoons', raw_text: '2 tablespoons Butter' },
        { name: 'Onion, chopped', amount: '1/2', unit: '', raw_text: '½ Onion, chopped' },
        { name: 'Salt', amount: '1 1/2', unit: 'teaspoons', raw_text: '1 ½ teaspoons Salt' },
        { name: 'Milk', amount: '1/4', unit: 'cup', raw_text: '¼ cup Milk' },
        { name: 'Eggs', amount: '2', unit: '', raw_text: '2 Eggs' },
        { name: 'Breadcrumbs', amount: '1/3', unit: 'cup', raw_text: '1/3 cup breadcrumbs' },
        { name: 'Pepper', amount: '3/4', unit: 'teaspoon', raw_text: '¾ teaspoon Pepper' },
        { name: 'Ground Nutmeg', amount: '1/4', unit: 'teaspoon', raw_text: '¼ teaspoon Ground Nutmeg' },
        { name: 'Ground Allspice', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Ground Allspice' },
        { name: 'Cayenne Pepper', amount: '1', unit: 'pinch', raw_text: '1 pinch Cayenne Pepper' },
        { name: 'Ground Beef', amount: '1', unit: 'pound', raw_text: '1 pound Ground Beef' },
        { name: 'Ground Pork', amount: '1', unit: 'pound', raw_text: '1 pound Ground Pork' },
        { name: 'Swedish Meatball Gravy', amount: '1', unit: 'serving', raw_text: '1 serving Swedish Meatball Gravy (see recipe)' },
        { name: 'Cooking Spray', amount: '', unit: '', raw_text: 'Cooking Spray' }
      ],
      instructions: [
        'Melt butter in a large skillet over medium heat. Stir in onion and cook until translucent.',
        'Transfer onions to a large bowl. Stir in milk, eggs, breadcrumbs, and seasonings.',
        'Mix beef and pork into the breadcrumb mixture. Cover with plastic wrap and refrigerate for 1 hour.',
        'Cook one serving of Swedish Meatball Gravy 20 minutes before taking the meat out of the refrigerator.',
        'Preheat oven to 425 degrees. Line a baking sheet with foil and lightly coat with cooking spray.',
        'Roll mixture into two-inch meatballs. Place them on the prepared baking sheet.',
        'Bake in the oven for 20 minutes.',
        'Serve meatballs and gravy.'
      ]
    },
    {
      title: 'Unstuffed Cabbage Rolls',
      description: 'Easy slow cooker unstuffed cabbage rolls with browned ground beef, onions, herbs, diced tomatoes, and tender cabbage.',
      prep_time: 10,
      cook_time: 495,
      servings: 8,
      tags: 'Beef, Slow Cooker, Low Carb, Dinner, Comfort Food',
      ingredients: [
        { name: 'Ground Beef', amount: '1', unit: 'pound', raw_text: '1 pound Ground Beef' },
        { name: 'Onion, diced', amount: '1', unit: '', raw_text: '1 Onion, diced' },
        { name: 'Thyme', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Thyme' },
        { name: 'Parsley', amount: '2', unit: 'teaspoons', raw_text: '2 teaspoons Parsley' },
        { name: 'Red Pepper Flakes', amount: '1/4', unit: 'teaspoon', raw_text: '¼ teaspoon Red Pepper Flakes' },
        { name: 'Salt', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Salt' },
        { name: 'Green Cabbage', amount: '1', unit: 'head', raw_text: '1 head Green Cabbage' },
        { name: 'Petite Diced Tomatoes', amount: '1', unit: 'can (14 oz)', raw_text: '1 can (14 ounces) Petite Diced Tomatoes' },
        { name: 'Tomato Paste', amount: '1', unit: 'can (6 oz)', raw_text: '1 can (6 ounces) Tomato Paste' },
        { name: 'Worcestershire Sauce', amount: '2', unit: 'tablespoons', raw_text: '2 tablespoons Worcestershire Sauce' },
        { name: 'Water', amount: '1/2', unit: 'cup', raw_text: '½ cup Water' }
      ],
      instructions: [
        'In a skillet over medium-high heat, brown beef. Drain if needed. Add the diced onion, thyme, parsley, red pepper flakes and salt to the skillet. Continue to cook everything together for 3-5 minutes until onions are translucent. Add the skillet mixture to the crockpot.',
        'Chop the cabbage into pieces about an inch in size. Add the chopped cabbage to the crockpot.',
        'In a mixing bowl mix together the petite diced tomatoes, tomato paste, Worcestershire sauce and water. Add the sauce to the crockpot. Carefully mix all parts together.',
        'Cook on low 6-8 hours. Stir halfway through cooking.'
      ]
    },
    {
      title: 'Blueberry Muffins',
      description: 'Delicious homemade blueberry muffins with fresh blueberries and a crunchy sanding sugar topping.',
      prep_time: 5,
      cook_time: 35,
      servings: 12,
      tags: 'Bread, Pastries, Breakfast, Baking, Muffins, Blueberries',
      ingredients: [
        { name: 'Butter', amount: '1/2', unit: 'cup', raw_text: '½ cup Butter' },
        { name: 'Sugar', amount: '1 1/4', unit: 'cups', raw_text: '1 ¼ cups Sugar' },
        { name: 'Eggs', amount: '2', unit: '', raw_text: '2 Eggs' },
        { name: 'Vanilla Extract', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Vanilla Extract' },
        { name: 'Lemon Juice', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Lemon Juice' },
        { name: 'Buttermilk', amount: '1/2', unit: 'cup', raw_text: '½ cup Buttermilk' },
        { name: 'Flour', amount: '2', unit: 'cups', raw_text: '2 cups Flour' },
        { name: 'Salt', amount: '1 1/2', unit: 'teaspoons', raw_text: '1 ½ teaspoons Salt' },
        { name: 'Baking Powder', amount: '2', unit: 'teaspoons', raw_text: '2 teaspoons Baking Powder' },
        { name: 'Blueberries', amount: '2', unit: 'cups', raw_text: '2 cups Blueberries' },
        { name: 'Sanding Sugar', amount: '3', unit: 'teaspoons', raw_text: '3 teaspoons Sanding Sugar' }
      ],
      instructions: [
        'Preheat oven to 400 degrees.',
        'Coat half of the blueberries in 1 tablespoon of flour.',
        'Cream together the butter and sugar until it becomes light and fluffy. Add in eggs, one by one. Mix in vanilla, lemon juice, and buttermilk. Sift in flour, salt and baking powder.',
        'In a bowl, lightly mash the non-floured half of the blueberries with the back of a spoon and then stir them into the batter. Fold the flour coated blueberries into the batter.',
        'Line a muffin tin with cupcake liners. Fill about 1/3 of the liner with batter.',
        'Sprinkle sanding sugar over the top of the muffins, reduce oven heat to 375 degrees for 30-35 minutes.',
        'Remove muffins from the tin and cool for 30 minutes.'
      ]
    },
    {
      title: 'Chocolate Chip Muffins',
      description: 'Classic bakery-style chocolate chip muffins with buttermilk and semi-sweet chocolate chips.',
      prep_time: 5,
      cook_time: 30,
      servings: 12,
      tags: 'Bread, Pastries, Breakfast, Baking, Muffins, Chocolate',
      ingredients: [
        { name: 'Flour', amount: '2 1/2', unit: 'cups', raw_text: '2 ½ cups Flour' },
        { name: 'Baking Powder', amount: '1', unit: 'tablespoon', raw_text: '1 tablespoon Baking Powder' },
        { name: 'Baking Soda', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Baking Soda' },
        { name: 'Salt', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Salt' },
        { name: 'Butter, melted and cooled', amount: '1/2', unit: 'cup', raw_text: '½ cup Butter, melted and cooled' },
        { name: 'Sugar', amount: '1', unit: 'cup', raw_text: '1 cup Sugar' },
        { name: 'Eggs', amount: '2', unit: '', raw_text: '2 Eggs' },
        { name: 'Buttermilk', amount: '1', unit: 'cup', raw_text: '1 cup Buttermilk' },
        { name: 'Vanilla Extract', amount: '1', unit: 'tablespoon', raw_text: '1 tablespoon Vanilla Extract' },
        { name: 'Semi-Sweet Chocolate Chips', amount: '1 1/2', unit: 'cups', raw_text: '1 ½ cups Semi-Sweet Chocolate Chips' }
      ],
      instructions: [
        'Preheat oven to 425 degrees. Spray a 12 cups muffin tray with non-stick cooking spray and line with paper liners.',
        'In a large bowl, toss together the flour, baking powder, baking soda, salt and chocolate chips. Set aside.',
        'In a medium bowl, whisk together the melted butter, sugar, eggs, buttermilk and vanilla. Slowly mix into the dry ingredients.',
        'Fill the prepared muffin tray with the batter and bake for 5 minutes. Reduce the oven temperature to 375 degrees and bake for an additional 12-15 minutes.',
        'Let cool for 10 minutes and serve.'
      ]
    },
    {
      title: 'Ham and Swiss Crescent Rolls',
      description: 'Warm and savory crescent rolls stuffed with ham and Swiss cheese, brushed with seasoned Dijon poppy seed butter.',
      prep_time: 10,
      cook_time: 14,
      servings: 8,
      tags: 'Bread, Pastries, Appetizers, Ham, Cheese, Quick',
      ingredients: [
        { name: 'Pillsbury Crescent Roll Dough', amount: '1', unit: 'can', raw_text: '1 can Pillsbury Crescent Roll Dough' },
        { name: 'Ham', amount: '16', unit: 'slices', raw_text: '16 slices Ham' },
        { name: 'Swiss Cheese', amount: '8', unit: 'slices', raw_text: '8 slices Swiss Cheese' },
        { name: 'Butter, melted', amount: '1/4', unit: 'cup', raw_text: '¼ cup Butter, melted' },
        { name: 'Dijon Mustard', amount: '1/2', unit: 'tablespoon', raw_text: '½ tablespoon Dijon Mustard' },
        { name: 'Worcestershire Sauce', amount: '1/2', unit: 'tablespoon', raw_text: '½ tablespoon Worcestershire Sauce' },
        { name: 'Poppy Seeds', amount: '1/2', unit: 'tablespoon', raw_text: '½ tablespoon Poppy Seeds' },
        { name: 'Dried Minced Onions', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Dried Minced Onions' },
        { name: 'Garlic Powder', amount: '1/4', unit: 'teaspoon', raw_text: '¼ teaspoon Garlic Powder' },
        { name: 'Salt', amount: '1/4', unit: 'teaspoon', raw_text: '¼ teaspoon Salt' },
        { name: 'Pepper', amount: '1/4', unit: 'teaspoon', raw_text: '¼ teaspoon Pepper' }
      ],
      instructions: [
        'Preheat oven to 375 degrees.',
        'Unroll the crescent roll dough and separate each of the eight triangles. Place two slices of ham and one slice of Swiss cheese on each triangle.',
        'Roll up each crescent roll around the ham and cheese. Place them on a foil lined baking sheet. Bake them in the oven for 7 minutes.',
        'While the rolls are in the oven prepare the seasoned butter. Add remaining ingredients to a bowl and whisk to combine.',
        'Remove the rolls from the oven and brush them with the seasoned butter. Return them to the oven and bake for an additional 7-9 minutes until golden brown.'
      ]
    },
    {
      title: 'Pie Crust',
      description: 'Flaky, buttery all-purpose homemade pie crust suitable for sweet or savory pies.',
      prep_time: 15,
      cook_time: 240,
      servings: 8,
      tags: 'Bread, Pastries, Baking, Pie, Crust, Basics',
      ingredients: [
        { name: 'Flour', amount: '1 1/4', unit: 'cups', raw_text: '1 ¼ cups Flour' },
        { name: 'Salt', amount: '1/4', unit: 'teaspoon', raw_text: '¼ teaspoon Salt' },
        { name: 'Butter, diced and chilled', amount: '1/2', unit: 'cup', raw_text: '½ cup Butter, diced and chilled' },
        { name: 'Ice Cold Water', amount: '1/4', unit: 'cup', raw_text: '¼ cup Ice Cold Water' }
      ],
      instructions: [
        'Combine flour and salt in a large bowl. Use a pastry blender to cut in the butter until the mixture resembles coarse crumbs.',
        'Add 1 tablespoon cold water at a time, mixing with a spatula or your hands until the dough comes together. Shape dough into a disc and wrap it in plastic wrap. Refrigerate for at least 4 hours.',
        'Place dough on a generously floured surface and roll out to an 11-inch circle, adding more flour to your rolling pin as needed. Carefully roll the dough onto the rolling pin, then unroll over a 9-inch pie dish. Press the dough evenly into the bottom and sides of the dish. Trim any excess dough and flute the edges.',
        'Blind bake or fill and bake as directed in your pie recipe.'
      ]
    },
    {
      title: 'Pistachio Muffins',
      description: 'Tender pistachio pudding muffins dipped in melted butter and sugar and finished with chopped pistachios.',
      prep_time: 10,
      cook_time: 18,
      servings: 12,
      tags: 'Bread, Pastries, Breakfast, Baking, Muffins, Pistachio',
      ingredients: [
        { name: 'Salted Butter, melted', amount: '1/2', unit: 'cup', raw_text: '½ cup Salted Butter, melted' },
        { name: 'Sugar', amount: '3/4', unit: 'cup', raw_text: '¾ cup Sugar' },
        { name: 'Eggs, room temperature', amount: '2', unit: '', raw_text: '2 Eggs, room temperature' },
        { name: 'Vanilla Extract', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Vanilla Extract' },
        { name: 'Almond Extract', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Almond Extract' },
        { name: 'Pistachio Instant Pudding Mix', amount: '1', unit: 'box (3.4 oz)', raw_text: '1 box (3.4 ounces) Pistachio Instant Pudding Mix' },
        { name: 'Baking Powder', amount: '2', unit: 'teaspoons', raw_text: '2 teaspoon Baking Powder' },
        { name: 'Salt', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Salt' },
        { name: 'Milk, room temperature', amount: '1/2', unit: 'cup', raw_text: '½ cup Milk, room temperature' },
        { name: 'Flour', amount: '1 3/4', unit: 'cups', raw_text: '1 ¾ cups Flour' },
        { name: 'Sugar (for Buttery Topping)', amount: '1/2', unit: 'cup', raw_text: '½ cup Sugar' },
        { name: 'Salted Butter, melted (for Buttery Topping)', amount: '1/2', unit: 'cup', raw_text: '½ cup Salted Butter, melted' },
        { name: 'Pistachios, finely chopped', amount: '1/2', unit: 'cup', raw_text: '½ cup Pistachios, finely chopped' }
      ],
      instructions: [
        'Preheat oven to 425 degrees. Prepare a muffin tin with cupcake liners.',
        'In a large bowl, cream together sugar and melted butter. Add eggs and extracts.',
        'Mix in the pistachio pudding mix and milk. Add flour, baking powder and salt until flour has just barely been incorporated. Fill the prepared muffin tin with the batter. Top with pistachios.',
        'Bake for 7 minutes. Reduce the heat down to 350 degrees but do not open the oven. Bake for an additional 8-10 minutes.',
        'Remove muffins from the oven and let cool for 10 minutes.',
        'In two small bowls, add ½ cup melted butter to one and ½ cup sugar to the other. While the muffins are still slightly warm, dip the top of the muffin in the butter and then the sugar.'
      ]
    },
    {
      title: 'Pumpkin Bread',
      description: 'Moist, spiced homemade pumpkin bread made with pumpkin puree, cinnamon, and olive oil.',
      prep_time: 10,
      cook_time: 55,
      servings: 16,
      tags: 'Bread, Pastries, Baking, Pumpkin, Fall, Breakfast',
      ingredients: [
        { name: 'Flour', amount: '2', unit: 'cups', raw_text: '2 cups Flour' },
        { name: 'Sugar', amount: '1 1/2', unit: 'cups', raw_text: '1 ½ cups Sugar' },
        { name: 'Baking Soda', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Baking Soda' },
        { name: 'Baking Powder', amount: '2', unit: 'teaspoons', raw_text: '2 teaspoons Baking Powder' },
        { name: 'Cinnamon', amount: '2', unit: 'teaspoons', raw_text: '2 teaspoons Cinnamon' },
        { name: 'Salt', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Salt' },
        { name: 'Eggs, room temperature', amount: '2', unit: '', raw_text: '2 Eggs, room temperature' },
        { name: 'Olive Oil', amount: '1', unit: 'cup', raw_text: '1 cup Olive Oil' },
        { name: 'Pumpkin Puree', amount: '1', unit: 'can (15 oz)', raw_text: '1 can (15 ounces) Pumpkin Puree' }
      ],
      instructions: [
        'Preheat oven to 350 degrees. Butter and lightly dust with flour, two 8 ½” x 4 ½” bread pans.',
        'In a large mixing bowl, whisk together the dry ingredients.',
        'In a second medium mixing bowl, whisk together the wet ingredients.',
        'Pour wet ingredients into the dry ingredients and whisk together until smooth.',
        'Divide evenly between the two prepared bread pans. Bake for 45-55 minutes. Let cool in the pans for 10-15 minutes then transfer to a wire rack to fully cool.'
      ]
    },
    {
      title: 'Pumpkin Filled Crescent Rolls',
      description: 'Flaky crescent rolls filled with spiced sweetened pumpkin puree, brushed with egg wash and dusted with powdered sugar.',
      prep_time: 20,
      cook_time: 10,
      servings: 32,
      tags: 'Bread, Pastries, Baking, Pumpkin, Crescent Rolls, Dessert, Finger Food',
      ingredients: [
        { name: 'Crescent Rolls Dough', amount: '2', unit: 'tubes', raw_text: '2 tubes Crescent Rolls Dough' },
        { name: 'Pumpkin Puree', amount: '1', unit: 'cup', raw_text: '1 cup Pumpkin Puree' },
        { name: 'Brown Sugar', amount: '2', unit: 'tablespoons', raw_text: '2 tablespoons Brown Sugar' },
        { name: 'Sugar', amount: '1', unit: 'tablespoon', raw_text: '1 tablespoon Sugar' },
        { name: 'Pumpkin Pie Spice', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Pumpkin Pie Spice' },
        { name: 'Egg Yolks', amount: '2', unit: '', raw_text: '2 Egg Yolks' },
        { name: 'Egg White', amount: '1', unit: '', raw_text: '1 Egg White' },
        { name: 'Water', amount: '1', unit: 'tablespoon', raw_text: '1 tablespoon Water' },
        { name: 'Vanilla Extract', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Vanilla Extract' },
        { name: 'Powdered Sugar', amount: '1/4', unit: 'cup', raw_text: '¼ cup Powdered Sugar' }
      ],
      instructions: [
        'Preheat oven to 375 degrees. Line a baking sheet with parchment paper and set aside.',
        'In a bowl, whisk together the pumpkin puree, sugars, pumpkin pie spice, vanilla and egg yolks.',
        'Open both tubes of crescent roll dough. Unroll and separate the dough into triangles. Lay each triangle flat on a cutting board.',
        'Using a sharp knife, cut each triangle in half. Spread 1 tablespoon of the pumpkin mixture on top of each triangle.',
        'Starting on the widest end, roll up the crescent rolls tucking the ends under to seal.',
        'Place the crescent rolls on the baking sheet. Mix together egg white and 1 tablespoon water. Brush each roll with the mixture.',
        'Bake for 10-12 minutes until the crescents turn golden brown.',
        'Remove from oven and cool completely.',
        'Dust the tops with powdered sugar and serve.'
      ]
    },
    {
      title: 'Baked Eggs in Ramekins',
      description: 'Individual ramekins filled with sautéed baby bella mushrooms, yellow peppers, green onions, and whole baked eggs topped with parmesan cheese.',
      prep_time: 10,
      cook_time: 20,
      servings: 2,
      tags: 'Breakfast, Eggs, Vegetarian, Quick, Brunch',
      ingredients: [
        { name: 'Eggs', amount: '2', unit: '', raw_text: '2 Eggs' },
        { name: 'Yellow Pepper, chopped', amount: '1/2', unit: 'cup', raw_text: '½ cup Yellow Pepper, chopped' },
        { name: 'Baby Bella Mushrooms, chopped', amount: '1 1/2', unit: '', raw_text: '1 ½ Baby Bella Mushrooms, chopped' },
        { name: 'Green Onion, chopped', amount: '4', unit: 'tablespoons', raw_text: '4 tablespoons Green Onion, chopped' },
        { name: 'Butter', amount: '2', unit: 'tablespoons', raw_text: '2 tablespoons Butter' },
        { name: 'Salt', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Salt' },
        { name: 'Pepper', amount: '1/4', unit: 'teaspoon', raw_text: '¼ teaspoon Pepper' },
        { name: 'Parmesan Cheese', amount: '2', unit: 'tablespoons', raw_text: '2 tablespoons Parmesan Cheese' }
      ],
      instructions: [
        'Preheat oven to 350 degrees. Butter ramekins.',
        'Heat butter in a skillet. Sauté mushrooms, peppers and green onions until water from the mushrooms disappear. Season with salt and pepper.',
        'Transfer vegetables to two ramekins. Crack eggs on top.',
        'Bake eggs for about 20 minutes or until completely cooked. The egg whites should be completely white.',
        'Top with parmesan cheese.'
      ]
    },
    {
      title: 'Beer Pancakes',
      description: 'Fluffy golden pancakes made with beer for a light, airy texture and deep flavor.',
      prep_time: 5,
      cook_time: 15,
      servings: 4,
      tags: 'Breakfast, Pancakes, Brunch',
      ingredients: [
        { name: 'Flour', amount: '1 1/4', unit: 'cups', raw_text: '1 ¼ cups Flour' },
        { name: 'Sugar', amount: '2', unit: 'tablespoons', raw_text: '2 tablespoons Sugar' },
        { name: 'Brown Sugar', amount: '2', unit: 'tablespoons', raw_text: '2 tablespoons Brown Sugar' },
        { name: 'Baking Powder', amount: '3/4', unit: 'teaspoon', raw_text: '¾ teaspoon Baking Powder' },
        { name: 'Salt', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Salt' },
        { name: 'Butter, melted', amount: '2', unit: 'tablespoons', raw_text: '2 tablespoons Butter, melted' },
        { name: 'Egg', amount: '1', unit: '', raw_text: '1 Egg' },
        { name: 'Beer', amount: '1', unit: 'cup', raw_text: '1 cup Beer' },
        { name: 'Cooking Spray', amount: '', unit: '', raw_text: 'Cooking Spray' }
      ],
      instructions: [
        'In a large bowl, stir together the flour, sugar, brown sugar, baking powder and salt.',
        'Add melted butter, egg and beer.',
        'Heat a skillet over medium heat.',
        'Coat pan with cooking spray.',
        'Pour about ¼ cup of batter onto the hot skillet.',
        'When bubbles appear on the top, flip and cook until lightly brown on both sides.'
      ]
    },
    {
      title: 'French Toast',
      description: 'Golden, cinnamon-infused French toast made with thick slices of rich brioche or challah bread.',
      prep_time: 5,
      cook_time: 5,
      servings: 4,
      tags: 'Breakfast, French Toast, Classic, Quick, Brunch',
      ingredients: [
        { name: 'Eggs', amount: '4', unit: '', raw_text: '4 Eggs' },
        { name: 'Milk', amount: '1', unit: 'cup', raw_text: '1 cup Milk' },
        { name: 'Vanilla Extract', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Vanilla Extract' },
        { name: 'Butter', amount: '1', unit: 'tablespoon', raw_text: '1 tablespoon Butter' },
        { name: 'Sugar', amount: '2', unit: 'tablespoons', raw_text: '2 tablespoons Sugar' },
        { name: 'Cinnamon', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Cinnamon' },
        { name: 'Challah or Brioche Bread', amount: '8', unit: 'slices', raw_text: '8 slices Challah or Brioche Bread' }
      ],
      instructions: [
        'Whisk milk, eggs and vanilla extract together in a big bowl.',
        'Heat a pan over medium heat and melt butter in pan.',
        'Dip bread slices in egg mixture for about 5 seconds each.',
        'Place bread in the pan and cook until golden brown on both sides.'
      ]
    },
    {
      title: 'McGriddle Bites',
      description: 'Bite-sized breakfast muffin cups packed with savory breakfast sausage, melted cheddar cheese, pancake batter, and sweet maple syrup.',
      prep_time: 5,
      cook_time: 15,
      servings: 12,
      tags: 'Breakfast, Sausage, Cheese, Muffins, Quick, Finger Food',
      ingredients: [
        { name: 'Pancake Mix, mixed per package directions', amount: '2', unit: 'cups', raw_text: '2 cups Pancake Mix, mixed per package directions' },
        { name: 'Ground Breakfast Sausage', amount: '1', unit: 'pound', raw_text: '1 pound Ground Breakfast Sausage' },
        { name: 'Cheddar cheese, shredded', amount: '1', unit: 'cup', raw_text: '1 cup Cheddar cheese, shredded' },
        { name: 'Maple Syrup', amount: '1/4', unit: 'cup', raw_text: '¼ cup Maple Syrup' }
      ],
      instructions: [
        'Preheat oven to 400 degrees.',
        'Brown breakfast sausage in a skillet over medium-high heat. Drain grease and set aside.',
        'Mix pancake batter, cooked sausage, cheese and syrup.',
        'Pour into a greased muffin pan. Bake at 400 degrees for 12-15 minutes.',
        'Serve with maple syrup.'
      ]
    },
    {
      title: 'Almond Raspberry Swirl Cake',
      description: 'An elegant 3-layer almond cake swirled with raspberry puree, filled with seedless raspberry jam and whipped cream, and frosted with rich cream cheese frosting.',
      prep_time: 60,
      cook_time: 30,
      servings: 12,
      tags: 'Desserts, Cake, Raspberry, Almond, Baking, Celebration',
      ingredients: [
        { name: 'Cream Cheese, softened', amount: '8', unit: 'ounces', raw_text: '8 ounces Cream Cheese, softened' },
        { name: 'Butter, softened', amount: '1 1/2', unit: 'sticks', raw_text: '1 ½ sticks Butter, softened' },
        { name: 'Sugar', amount: '2', unit: 'cups', raw_text: '2 cups Sugar' },
        { name: 'Eggs, room temperature', amount: '4', unit: '', raw_text: '4 Eggs, room temperature' },
        { name: 'Cake Flour', amount: '3', unit: 'cups', raw_text: '3 cups Cake Flour' },
        { name: 'Baking Powder', amount: '2', unit: 'teaspoons', raw_text: '2 teaspoons Baking Powder' },
        { name: 'Baking Soda', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Baking Soda' },
        { name: 'Salt', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Salt' },
        { name: 'Buttermilk', amount: '1', unit: 'cup', raw_text: '1 cup Buttermilk' },
        { name: 'Vegetable Oil', amount: '1/4', unit: 'cup', raw_text: '¼ cup Vegetable Oil' },
        { name: 'Almond Extract', amount: '1', unit: 'tablespoon', raw_text: '1 tablespoon Almond Extract' },
        { name: 'Seedless Raspberry Jam, plus additional', amount: '1/3', unit: 'cup', raw_text: '1/3 cup Seedless, Raspberry Jam, plus additional' },
        { name: 'Raspberry Extract', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Raspberry Extract' },
        { name: 'Whipped Cream', amount: '1', unit: 'recipe', raw_text: 'Whipped Cream (See Recipe)' },
        { name: 'Cream Cheese Frosting', amount: '1', unit: 'recipe', raw_text: 'Cream Cheese Frosting (See Recipe)' },
        { name: 'Fresh Raspberries (for garnish)', amount: '', unit: '', raw_text: 'Fresh Raspberries (for garnish)' }
      ],
      instructions: [
        'Prepare Whipped Cream and Cream Cheese Frosting (see recipes).',
        'Preheat oven to 325 degrees. Grease and flour three 8-inch pans adding a circle of parchment paper to the bottom of each pan.',
        'In a medium bowl, whisk together flour, baking powder, baking soda and salt. Set aside.',
        'In another bowl, mix together buttermilk, oil and almond extract. Set aside.',
        'In the bowl of your mixer add butter and cream cheese and mix at medium speed until smooth.',
        'Gradually add the sugar and mix on medium speed for 2-3 minutes.',
        'Add eggs one at a time and mix until well incorporated.',
        'With the mixer on low speed, alternate adding the flour mixture and the milk mixture, beginning and ending with the flour mixture.',
        'Remove 1 cup of cake batter and put it in a separate small bowl. Add raspberry jam and raspberry extract and stir together.',
        'Spread about one cup plain cake batter into each of the prepared pans. Then divide most of the raspberry batter between the three pans.',
        'Add the remaining plain batter to each of the pans and the remaining raspberry batter. Tap each of the pans on the counter to level out the batter. Run a knife through the batter to create a swirl effect.',
        'Bake for 28-30 minutes. Let cool for 5-10 minutes in the pans on a wire rack before turning out.',
        'Place the first cake layer on the cake plate. Pipe a dam of cream cheese frosting around the edge of the layer.',
        'Spread a thin layer of jam on the cake layer, then top with a layer of whipped cream filling.',
        'Place the second layer on top and repeat steps 13 and 14. Place the third cake layer on top and pipe frosting into any gaps between the cake layers. Frost the cake with a thin layer of frosting.',
        'Chill the cake for 10-15 minutes in the freezer. Add the final coat of frosting.',
        'Pipe a large shell border around the top of the cake using a large 1M piping tip, and top with fresh raspberries.'
      ]
    },
    {
      title: 'Avocado Chocolate Pudding',
      description: 'Rich, velvety, and naturally sweetened chocolate pudding made with fresh ripe avocados, unsweetened cocoa powder, and pure maple syrup.',
      prep_time: 5,
      cook_time: 5,
      servings: 4,
      tags: 'Desserts, Pudding, Chocolate, Healthy, Vegan, Gluten-Free, No Bake',
      ingredients: [
        { name: 'Ripe Avocados, peeled, chopped', amount: '2', unit: '', raw_text: '2 Ripe Avocados, peeled, chopped' },
        { name: 'Unsweetened Cocoa Powder', amount: '1/3', unit: 'cup', raw_text: '1/3 cup Unsweetened Cocoa Powder' },
        { name: 'Maple Syrup', amount: '1/4', unit: 'cup', raw_text: '¼ cup Maple Syrup' },
        { name: 'Milk', amount: '1/2', unit: 'cup', raw_text: '½ cup Milk' },
        { name: 'Vanilla Extract', amount: '1 1/2', unit: 'teaspoons', raw_text: '1 ½ teaspoons Vanilla Extract' }
      ],
      instructions: [
        'Blend all ingredients together in a blender.',
        'Chill in the refrigerator for 2 hours before serving.'
      ]
    },
    {
      title: 'Banana Pudding',
      description: 'Classic southern-style layered banana pudding with vanilla wafers, fresh banana slices, sweetened condensed milk, and whipped topping.',
      prep_time: 5,
      cook_time: 15,
      servings: 12,
      tags: 'Desserts, Pudding, Banana, No Bake, Southern, Classic',
      ingredients: [
        { name: 'Milk', amount: '2', unit: 'cups', raw_text: '2 cups Milk' },
        { name: 'Instant Banana Pudding Mix', amount: '1', unit: 'package (5 oz)', raw_text: '1 package (5 ounces) Instant Banana Pudding Mix' },
        { name: 'Sweetened Condensed Milk', amount: '1', unit: 'can (14 oz)', raw_text: '1 can (14 ounces) Sweetened Condensed Milk' },
        { name: 'Vanilla Extract', amount: '1', unit: 'tablespoon', raw_text: '1 tablespoon Vanilla Extract' },
        { name: 'Frozen whipped topping, thawed', amount: '1', unit: 'container (12 oz)', raw_text: '1 container (12 ounces) Frozen whipped topping, thawed' },
        { name: 'Vanilla Wafers', amount: '1', unit: 'package (16 oz)', raw_text: '1 package (16 ounces) Vanilla Wafers' },
        { name: 'Bananas, sliced', amount: '14', unit: '', raw_text: '14 Bananas, sliced' }
      ],
      instructions: [
        'Mix milk and pudding mix in a large bowl. Blend in sweetened condensed milk until smooth. Stir in vanilla and fold in the whipped topping.',
        'Layer wafers, banana slices and pudding mixture in a glass serving bowl.',
        'Chill for 1 hour before serving.'
      ]
    },
    {
      title: 'Caramel Apple Crisp',
      description: 'Warm spiced Granny Smith apples drizzled with melted caramel and topped with a crispy brown sugar and rolled oat crumble.',
      prep_time: 25,
      cook_time: 45,
      servings: 8,
      tags: 'Desserts, Apple, Crisp, Caramel, Fall, Baking',
      ingredients: [
        { name: 'Granny Smith Apples, peeled and thinly sliced', amount: '6', unit: '', raw_text: '6 Granny Smith Apples, peeled and thinly sliced' },
        { name: 'Sugar', amount: '2', unit: 'tablespoons', raw_text: '2 tablespoons Sugar' },
        { name: 'Flour', amount: '1', unit: 'tablespoon', raw_text: '1 tablespoon Flour' },
        { name: 'Cinnamon', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Cinnamon' },
        { name: 'Caramel Morsels', amount: '14', unit: 'ounces', raw_text: '14 ounces Caramel Morsels' },
        { name: 'Milk', amount: '6', unit: 'tablespoons', raw_text: '6 tablespoons Milk' },
        { name: 'Flour (for Topping)', amount: '1 1/4', unit: 'cup', raw_text: '1 ¼ cup Flour' },
        { name: 'Brown Sugar', amount: '1', unit: 'cup', raw_text: '1 cup Brown Sugar' },
        { name: 'Rolled Oats', amount: '1', unit: 'cup', raw_text: '1 cup Rolled Oats' },
        { name: 'Butter, softened', amount: '3/4', unit: 'cup', raw_text: '¾ cup Butter, softened' },
        { name: 'Vanilla Extract', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Vanilla Extract' }
      ],
      instructions: [
        'Preheat oven to 350 degrees. Grease a 9x13-inch pan.',
        'Toss apples with sugar, flour and cinnamon. Pour into the 9x13-inch pan and set aside.',
        'Mix caramels and milk in a microwave safe bowl. Microwave until melted, stirring occasionally. Drizzle about half of the caramel sauce over the apples.',
        'Combine topping ingredients in a bowl till crumbly and spread evenly over apples and caramel.',
        'Bake for about 45 minutes or until topping is golden brown and apples are tender.',
        'Serve with vanilla ice cream and remaining caramel sauce.'
      ]
    },
    {
      title: 'Carrot Cake Bars',
      description: 'Spiced brown sugar carrot cake bars swirled with a rich cheesecake layer and baked until golden and tender.',
      prep_time: 20,
      cook_time: 40,
      servings: 9,
      tags: 'Desserts, Bars, Carrot Cake, Cheesecake, Baking',
      ingredients: [
        { name: 'Butter, melted', amount: '1/2', unit: 'cup', raw_text: '½ cup Butter, melted' },
        { name: 'Light Brown Sugar, packed', amount: '1', unit: 'cup', raw_text: '1 cup Light Brown Sugar, packed' },
        { name: 'Egg', amount: '1', unit: '', raw_text: '1 Egg' },
        { name: 'Vanilla Extract', amount: '1', unit: 'tablespoon', raw_text: '1 tablespoon Vanilla Extract' },
        { name: 'Flour', amount: '1', unit: 'cup', raw_text: '1 cup Flour' },
        { name: 'Cinnamon', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Cinnamon' },
        { name: 'Baking Powder', amount: '1/4', unit: 'teaspoon', raw_text: '¼ teaspoon Baking Powder' },
        { name: 'Salt', amount: '1/4', unit: 'teaspoon', raw_text: '¼ teaspoon Salt' },
        { name: 'Carrots, shredded', amount: '1', unit: 'cup', raw_text: '1 cup Carrots, shredded' },
        { name: 'Cream Cheese, room temperature', amount: '4', unit: 'ounces', raw_text: '4 ounces Cream Cheese, room temperature' },
        { name: 'Sugar', amount: '1/4', unit: 'cup', raw_text: '¼ cup Sugar' },
        { name: 'Egg Yolk', amount: '1', unit: '', raw_text: '1 Egg Yolk' },
        { name: 'Vanilla Extract', amount: '3/4', unit: 'teaspoon', raw_text: '¾ teaspoon Vanilla Extract' }
      ],
      instructions: [
        'Preheat oven to 350 degrees. Spray an 8x8-inch dish with non-stick spray and set aside.',
        'In a medium bowl, mix together the melted butter and brown sugar.',
        'Stir in the egg and vanilla extract.',
        'Stir in flour, cinnamon, baking powder and salt.',
        'Fold in shredded carrots and set aside.',
        'In a medium bowl, cream together the cream cheese and sugar.',
        'Beat in the egg yolk and vanilla extract.',
        'Add about half of the carrot cake batter into the pan and spread evenly.',
        'Dollop half the cheesecake batter on top of the carrot cake batter.',
        'Add the remaining carrot cake batter on top of the cheesecake batter.',
        'Dollop the remaining cheesecake batter on top of the carrot cake batter.',
        'Using a knife, swirl the batters together.',
        'Bake for 35-40 minutes. The center will still be jiggly.',
        'Cool completely before cutting. Store in an airtight container in the refrigerator.'
      ]
    },
    {
      title: 'Cream Cheese Frosting',
      description: 'Creamy, pipeable cream cheese frosting made with real butter, cream cheese, vanilla, and powdered sugar.',
      prep_time: 10,
      cook_time: 0,
      servings: 12,
      tags: 'Desserts, Frosting, Basics, Cakes',
      ingredients: [
        { name: 'Butter, slightly softened', amount: '2', unit: 'sticks', raw_text: '2 sticks, Butter, slightly softened' },
        { name: 'Cream cheese softened', amount: '16', unit: 'ounces', raw_text: '16 ounces Cream cheese softened' },
        { name: 'Vanilla', amount: '2', unit: 'teaspoons', raw_text: '2 teaspoons Vanilla' },
        { name: 'Salt', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Salt' },
        { name: 'Powdered Sugar', amount: '6', unit: 'cups', raw_text: '6 cups Powdered Sugar' }
      ],
      instructions: [
        'Cut butter into slices and add to the bowl of your mixture. Beat on low to medium speed until the butter is softened.',
        'Cut the cream cheese into pieces and add to the butter, beating on low to medium speed until incorporated.',
        'Add vanilla. Gradually add the powdered sugar beating on low speed until blended.',
        'Increase mixing speed and beat until fluffy.'
      ]
    },
    {
      title: 'Dirt Pudding',
      description: 'Fun and nostalgic chilled layered dessert with crushed Oreo cookies, creamy chocolate pudding, cream cheese, whipped topping, and gummy worms.',
      prep_time: 30,
      cook_time: 0,
      servings: 12,
      tags: 'Desserts, Pudding, Chocolate, Cookies, Kids, No Bake, Fun',
      ingredients: [
        { name: 'Oreos', amount: '1 1/2', unit: 'packages (14 oz)', raw_text: '1 ½ packages (14 ounces) Oreos' },
        { name: 'Butter, melted', amount: '6', unit: 'tablespoons', raw_text: '6 tablespoons Butter, melted' },
        { name: 'Milk', amount: '3 1/2', unit: 'cups', raw_text: '3 ½ cups Milk' },
        { name: 'Chocolate Instant Pudding', amount: '2', unit: 'boxes', raw_text: '2 boxes Chocolate Instant Pudding' },
        { name: 'Cream Cheese, room temperature', amount: '8', unit: 'ounces', raw_text: '8 ounces Cream Cheese, room temperature' },
        { name: 'Powdered Sugar', amount: '1', unit: 'cup', raw_text: '1 cup Powdered Sugar' },
        { name: 'Whipped Topping, thawed', amount: '12', unit: 'ounces', raw_text: '12 ounces Whipped Topping, thawed' },
        { name: 'Gummy Worms (for garnish)', amount: '', unit: '', raw_text: 'Garnish Gummy Worms' }
      ],
      instructions: [
        'Place Oreos in a large Ziplock bag and seal. Use a rolling pin to crush Oreos. Pour melted butter in the bag and shake to combine.',
        'In a bowl, whisk together the milk and pudding mix together until it starts to thicken. Set aside.',
        'Add the cream cheese and sugar to the bowl of an electric mixer. Beat on medium-high speed until smooth.',
        'Fold the pudding in and beat on low speed. Stir in whipped topping.',
        'Place a layer of Oreos at the bottom of a 9x13-inch dish. Add a layer of the pudding mixture over the Oreos. Repeat until both mixtures are gone, ending with the Oreos. Arrange Gummy Worms on top. Refrigerate for at least 3 hours or overnight.'
      ]
    },
    {
      title: 'Pecan Meltaways',
      description: 'Buttery, tender pecan shortbread cookies that melt in your mouth, rolled in powdered sugar.',
      prep_time: 30,
      cook_time: 20,
      servings: 24,
      tags: 'Desserts, Cookies, Pecans, Holiday, Baking, Shortbread',
      ingredients: [
        { name: 'Salted Butter, room temperature', amount: '1/2', unit: 'cup', raw_text: '½ cup Salted Butter, room temperature' },
        { name: 'Sugar', amount: '2 1/2', unit: 'tablespoons', raw_text: '2 ½ tablespoons Sugar' },
        { name: 'Water', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Water' },
        { name: 'Vanilla Extract', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Vanilla Extract' },
        { name: 'Flour', amount: '1', unit: 'cup', raw_text: '1 cup Flour' },
        { name: 'Pecans, toasted, cooled and finely chopped', amount: '1/2', unit: 'cup', raw_text: '½ cup Pecans, toasted, cooled and finely chopped' },
        { name: 'Powdered Sugar', amount: '1', unit: 'cup', raw_text: '1 cup Powdered Sugar' }
      ],
      instructions: [
        'Preheat oven to 325 degrees. Line a large baking sheet with parchment paper.',
        'In a large bowl, cream butter with the sugar until light and fluffy. Mix in water and vanilla. Gradually add in the flour. Stir in pecans.',
        'Shape dough into 1-inch balls and place on a baking sheet. Place the baking sheet in the refrigerator uncovered and chill for 15-30 minutes.',
        'Bake for 20 minutes.',
        'Remove from the oven and let stand for 1 minute. Roll warm cookies in the powdered sugar and place on a wire rack.'
      ]
    },
    {
      title: 'Pumpkin Pie',
      description: 'Classic homemade spiced pumpkin pie with cinnamon, ginger, cloves, and evaporated milk in a flaky pie crust.',
      prep_time: 5,
      cook_time: 55,
      servings: 8,
      tags: 'Desserts, Pie, Pumpkin, Holiday, Thanksgiving, Fall, Baking',
      ingredients: [
        { name: 'Pie Crust (see recipe)', amount: '1', unit: 'recipe', raw_text: '1 recipe Pie Crust (see recipe)' },
        { name: 'Sugar', amount: '3/4', unit: 'cup', raw_text: '¾ cup Sugar' },
        { name: 'Salt', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Salt' },
        { name: 'Cinnamon', amount: '2', unit: 'teaspoons', raw_text: '2 teaspoons Cinnamon' },
        { name: 'Ginger', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Ginger' },
        { name: 'Cloves', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Cloves' },
        { name: 'Eggs', amount: '2', unit: '', raw_text: '2 Eggs' },
        { name: 'Pumpkin Puree', amount: '1', unit: 'can (15 oz)', raw_text: '1 can (15 ounces) Pumpkin Puree' },
        { name: 'Evaporated Milk', amount: '1', unit: 'can (12 oz)', raw_text: '1 can (12 ounces) Evaporated Milk' }
      ],
      instructions: [
        'Preheat oven to 425 degrees.',
        'Press pie crust into 9-inch pie plate and flute the edges.',
        'In a mixing bowl, combine sugar, salt, cinnamon, ginger, cloves, eggs, pumpkin and evaporated milk. Pour into the pie crust.',
        'Bake for 15 minutes. Remove from oven, cover the pie crust edges with foil and lower the oven temperature to 350 degrees. Bake an additional 40-45 minutes or until a toothpick comes out clean.',
        'Remove from the oven and cool. Refrigerate until ready to serve.'
      ]
    },
    {
      title: 'Tiramisu',
      description: 'Authentic Italian chilled dessert layered with espresso-dipped ladyfingers and whipped amaretto mascarpone cream, dusted with cocoa.',
      prep_time: 20,
      cook_time: 0,
      servings: 6,
      tags: 'Desserts, Italian, Coffee, Tiramisu, No Bake',
      ingredients: [
        { name: 'Heavy Cream', amount: '1', unit: 'cup', raw_text: '1 cup Heavy Cream' },
        { name: 'Mascarpone Cheese', amount: '1', unit: 'cup', raw_text: '1 cup Mascarpone Cheese' },
        { name: 'Sugar', amount: '3', unit: 'tablespoons', raw_text: '3 tablespoons Sugar' },
        { name: 'Vanilla Extract', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Vanilla Extract' },
        { name: 'Amaretto', amount: '1', unit: 'tablespoon', raw_text: '1 tablespoon Amaretto' },
        { name: 'Strong Cold Coffee', amount: '2 1/2', unit: 'cups', raw_text: '2 ½ cups Strong Cold Coffee' },
        { name: 'Ladyfingers', amount: '7', unit: 'ounces', raw_text: '7 ounces Ladyfingers' },
        { name: 'Cocoa Powder (for dusting)', amount: '', unit: '', raw_text: 'Cocoa' }
      ],
      instructions: [
        'Whip cream, sugar and vanilla until it forms soft peaks. Fold in Mascarpone cheese and amaretto.',
        'Pour coffee into a shallow dish. Dip lady fingers in the coffee and place them at the bottom of an 8x8-inch dish. Add part of the cream mixture and level out. Repeat one or two times ending with the cream mixture.',
        'Cover and refrigerate for at least 2 hours. Dust with cocoa before serving.'
      ]
    },
    {
      title: 'Whipped Cream',
      description: 'Light, fluffy homemade whipped cream made with heavy cream, powdered sugar, and vanilla extract.',
      prep_time: 15,
      cook_time: 0,
      servings: 8,
      tags: 'Desserts, Basics, Whipped Cream, Topping',
      ingredients: [
        { name: 'Heavy Cream', amount: '1', unit: 'cup', raw_text: '1 cup Heavy Cream' },
        { name: 'Powdered Sugar', amount: '1/4', unit: 'cup', raw_text: '¼ cup Powdered Sugar' },
        { name: 'Vanilla Extract', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Vanilla Extract' }
      ],
      instructions: [
        'Chill the mixing bowl in the freezer for 10 minutes.',
        'Pour the heavy cream, sugar and vanilla into the bowl and begin beating a low speed, gradually increasing to medium high speed.',
        'Beat on medium high speed until the whipped cream forms soft peaks.'
      ]
    },
    {
      title: 'White Chocolate Macadamia Nut Cookies',
      description: 'Chewy, buttery cookies loaded with sweet white chocolate chips and crunchy roasted macadamia nuts.',
      prep_time: 15,
      cook_time: 10,
      servings: 24,
      tags: 'Desserts, Cookies, White Chocolate, Macadamia, Baking',
      ingredients: [
        { name: 'Butter, room temperature', amount: '1/2', unit: 'cup', raw_text: '½ cup Butter, room temperature' },
        { name: 'Light Brown Sugar, packed', amount: '1/2', unit: 'cup', raw_text: '½ cup Light Brown Sugar, packed' },
        { name: 'Sugar', amount: '1/3', unit: 'cup', raw_text: '1/3 cup Sugar' },
        { name: 'Egg', amount: '1', unit: '', raw_text: '1 Egg' },
        { name: 'Vanilla Extract', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Vanilla Extract' },
        { name: 'Flour', amount: '1 3/4', unit: 'cups', raw_text: '1 ¾ cups Flour' },
        { name: 'Baking Soda', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Baking Soda' },
        { name: 'Salt', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Salt' },
        { name: 'White Chocolate Chips', amount: '1', unit: 'cup', raw_text: '1 cup White Chocolate Chips' },
        { name: 'Salted Macadamia Nuts, roasted and chopped', amount: '1/2', unit: 'cup', raw_text: '½ cup Salted Macadamia Nuts, roasted and chopped' }
      ],
      instructions: [
        'Preheat oven to 375 degrees. Line a baking sheet with parchment paper.',
        'In a large mixing bowl, cream together the butter and sugars.',
        'Mix in egg and vanilla.',
        'Stir in white chocolate chips and nuts.',
        'Roll dough into 1-inch balls and place on the prepared baking sheet, cover with plastic wrap and chill in the refrigerator for 30 minutes.',
        'Bake for 10-12 minutes.',
        'Cool on a wire rack for 5-10 minutes.'
      ]
    },
    {
      title: 'Cinnamon Date Smoothie',
      description: 'Naturally sweetened wholesome smoothie with Medjool dates, ground rolled oats, cinnamon, vanilla, and milk.',
      prep_time: 5,
      cook_time: 0,
      servings: 1,
      tags: 'Drinks, Smoothie, Breakfast, Oats, Dates, Healthy, Quick',
      ingredients: [
        { name: 'Rolled Oats', amount: '1/2', unit: 'cup', raw_text: '½ cup Rolled Oats' },
        { name: 'Medjool Dates', amount: '3', unit: '', raw_text: '3 Medjool Dates' },
        { name: 'Milk', amount: '1 1/2', unit: 'cups', raw_text: '1 ½ cups Milk' },
        { name: 'Vanilla Extract', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Vanilla Extract' },
        { name: 'Cinnamon', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Cinnamon' },
        { name: 'Ice Cubes', amount: '4', unit: '', raw_text: '4 Ice Cubes' }
      ],
      instructions: [
        'Remove the pits from the dates. Soak them in the milk for 10-15 minutes.',
        'Blend the rolled oats until powdery.',
        'Add dates, milk, vanilla extract and cinnamon to blender and blend again.',
        'Add ice to the blender and blend again.'
      ]
    },
    {
      title: 'Mango Protein Smoothie',
      description: 'Tropical protein smoothie loaded with frozen mango, Greek yogurt, protein powder, and a touch of honey.',
      prep_time: 5,
      cook_time: 0,
      servings: 1,
      tags: 'Drinks, Smoothie, Protein, Mango, Healthy, Breakfast, Quick',
      ingredients: [
        { name: 'Frozen Mango', amount: '1 1/2', unit: 'cups', raw_text: '1 ½ cups Frozen Mango' },
        { name: 'Protein Powder', amount: '1', unit: 'scoop', raw_text: '1 scoop Protein Powder' },
        { name: 'Milk', amount: '1', unit: 'cup', raw_text: '1 cup Milk' },
        { name: 'Greek Yogurt', amount: '1/2', unit: 'cup', raw_text: '½ cup Greek Yogurt' },
        { name: 'Honey', amount: '1', unit: 'tablespoon', raw_text: '1 tablespoon Honey' },
        { name: 'Vanilla Extract', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Vanilla Extract' },
        { name: 'Ice Cubes', amount: '6', unit: '', raw_text: '6 Ice Cubes' }
      ],
      instructions: [
        'Combine mango, protein powder, milk, yogurt, honey, vanilla extract and ice.',
        'Blend ingredients until smooth. Add ice and blend again.',
        'Serve.'
      ]
    },
    {
      title: 'Nutella Protein Shake',
      description: 'Decadent chocolate hazelnut protein shake made with Nutella, blended rolled oats, protein powder, and cold milk.',
      prep_time: 5,
      cook_time: 0,
      servings: 1,
      tags: 'Drinks, Shake, Protein, Nutella, Chocolate, Hazelnut, Quick',
      ingredients: [
        { name: 'Rolled Oats', amount: '1/2', unit: 'cup', raw_text: '½ cup Rolled Oats' },
        { name: 'Milk', amount: '3/4', unit: 'cup', raw_text: '¾ cup Milk' },
        { name: 'Nutella', amount: '2', unit: 'tablespoons', raw_text: '2 tablespoons Nutella' },
        { name: 'Protein Powder', amount: '1', unit: 'scoop', raw_text: '1 scoop Protein Powder' },
        { name: 'Ice Cubes', amount: '6', unit: '', raw_text: '6 Ice Cubes' }
      ],
      instructions: [
        'In a blender, add oats and pulse until finely ground.',
        'Add the ingredients together and blend until smooth.',
        'Serve.'
      ]
    },
    {
      title: 'Peanut Butter and Banana Protein Shake',
      description: 'Classic energizing protein shake made with creamy peanut butter, fresh banana, chia seeds, cinnamon, and protein powder.',
      prep_time: 5,
      cook_time: 0,
      servings: 1,
      tags: 'Drinks, Shake, Protein, Peanut Butter, Banana, Healthy, Quick',
      ingredients: [
        { name: 'Ice Cubes', amount: '4', unit: '', raw_text: '4 Ice Cubes' },
        { name: 'Milk', amount: '3/4', unit: 'cup', raw_text: '¾ cup Milk' },
        { name: 'Banana', amount: '1', unit: '', raw_text: '1 Banana' },
        { name: 'Protein Powder', amount: '2', unit: 'scoops', raw_text: '2 scoops Protein Powder' },
        { name: 'Vanilla Extract', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Vanilla Extract' },
        { name: 'Chia Seeds', amount: '1/4', unit: 'teaspoon', raw_text: '¼ teaspoon Chia Seeds' },
        { name: 'Cinnamon', amount: '1/4', unit: 'teaspoon', raw_text: '¼ teaspoon Cinnamon' },
        { name: 'Peanut Butter', amount: '2', unit: 'tablespoons', raw_text: '2 tablespoons Peanut Butter' }
      ],
      instructions: [
        'Add all ingredients to a blender and blend.',
        'Serve.'
      ]
    },
    {
      title: 'Strawberry Cheesecake Protein Shake',
      description: 'Creamy dessert-inspired protein shake made with frozen strawberries, vanilla Greek yogurt, cream cheese, rolled oats, and protein powder.',
      prep_time: 7,
      cook_time: 0,
      servings: 1,
      tags: 'Drinks, Shake, Protein, Strawberry, Cheesecake, Healthy, Quick',
      ingredients: [
        { name: 'Frozen Strawberries', amount: '1 1/2', unit: 'cups', raw_text: '1 ½ cups Frozen Strawberries' },
        { name: 'Milk', amount: '1', unit: 'cup', raw_text: '1 cup Milk' },
        { name: 'Vanilla Greek Yogurt', amount: '1/2', unit: 'cup', raw_text: '½ cup Vanilla Greek Yogurt' },
        { name: 'Protein Powder', amount: '1', unit: 'scoop', raw_text: '1 scoop Protein Powder' },
        { name: 'Cream Cheese', amount: '2', unit: 'tablespoons', raw_text: '2 tablespoons Cream Cheese' },
        { name: 'Ice Cubes', amount: '4', unit: '', raw_text: '4 ice cubes' },
        { name: 'Rolled Oats', amount: '1/4', unit: 'cup', raw_text: '¼ cup Rolled Oats' }
      ],
      instructions: [
        'Add oats to the blender and pulse until finely ground.',
        'Add all ingredients to a blender. Blend.',
        'Serve.'
      ]
    },
    {
      title: 'American Goulash',
      description: 'Hearty one-pot macaroni dish with seasoned ground beef, tomato sauce, diced tomatoes, Worcestershire sauce, and melted cheddar cheese.',
      prep_time: 5,
      cook_time: 30,
      servings: 4,
      tags: 'Pasta, Beef, One Pot, Comfort Food, Dinner',
      ingredients: [
        { name: 'Olive Oil', amount: '1', unit: 'tablespoon', raw_text: '1 tablespoon Olive Oil' },
        { name: 'Onion, chopped', amount: '1/2', unit: '', raw_text: '½ Onion, chopped' },
        { name: 'Green Bell Pepper, chopped', amount: '1/2', unit: '', raw_text: '½ Green Bell Pepper, chopped' },
        { name: 'Ground Beef', amount: '1', unit: 'pound', raw_text: '1 pound Ground Beef' },
        { name: 'Garlic, minced', amount: '1 1/2', unit: 'teaspoons', raw_text: '1 ½ teaspoons Garlic, minced' },
        { name: 'Tomato Sauce', amount: '1', unit: 'can (15 oz)', raw_text: '1 can (15 ounces) Tomato Sauce' },
        { name: 'Petite Dice Tomatoes', amount: '1', unit: 'can (15 oz)', raw_text: '1 can (15 ounces) Petite Dice Tomatoes' },
        { name: 'Beef Broth', amount: '1 1/2', unit: 'cups', raw_text: '1 ½ cups Beef Broth' },
        { name: 'Worcestershire Sauce', amount: '1 1/2', unit: 'tablespoons', raw_text: '1 ½ tablespoons Worcestershire Sauce' },
        { name: 'Salt', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Salt' },
        { name: 'Italian Seasoning', amount: '1', unit: 'tablespoon', raw_text: '1 tablespoon Italian Seasoning' },
        { name: 'Bay Leaves', amount: '3', unit: '', raw_text: '3 Bay Leaves' },
        { name: 'Macaroni, uncooked', amount: '1', unit: 'cup', raw_text: '1 cup Macaroni, uncooked' },
        { name: 'Cheddar Cheese, shredded', amount: '1/2', unit: 'cup', raw_text: '½ cup Cheddar Cheese, shredded' }
      ],
      instructions: [
        'Heat olive oil over medium-high heat in a skillet. Add onion, bell pepper and ground beef. Cook until no longer pink. Drain the fat, add garlic and cook for another 30 seconds.',
        'Stir in tomato sauce, diced tomatoes, Worcestershire sauce, salt, Italian seasoning, bay leaves, and uncooked macaroni. Bring mixture to a boil and stir occasionally until the pasta is tender, approximately 20 minutes.',
        'Remove bay leaves and stir in cheddar cheese just before serving.'
      ]
    },
    {
      title: 'Baked Ziti',
      description: 'Classic comforting baked ziti layered with rich homemade red sauce, parmesan, and bubbly melted mozzarella cheese.',
      prep_time: 5,
      cook_time: 30,
      servings: 6,
      tags: 'Pasta, Italian, Baked, Cheese, Casserole, Dinner',
      ingredients: [
        { name: 'Ziti', amount: '1', unit: 'box (16 oz)', raw_text: '1 box Ziti' },
        { name: 'Red Sauce', amount: '1', unit: 'serving', raw_text: '1 serving Red Sauce (see recipe)' },
        { name: 'Parmesan cheese, shredded', amount: '1', unit: 'cup', raw_text: '1 cup Parmesan cheese, shredded' },
        { name: 'Mozzarella cheese, shredded', amount: '1', unit: 'cup', raw_text: '1 cup Mozzarella cheese, shredded' }
      ],
      instructions: [
        'Preheat oven to 350 degrees.',
        'In a deep 9x13-inch casserole dish, layer sauce, ziti, parmesan and mozzarella. Starting with sauce and ending with cheese.',
        'Bake for 20 minutes, covered with foil. Remove the foil and bake for an additional 10 minutes. Broil on low to brown cheese if needed.'
      ]
    },
    {
      title: 'Cajun Chicken Alfredo Pasta',
      description: 'Creamy and zesty Cajun chicken pasta with farfalle bowtie noodles, fresh red bell peppers, baby spinach, parmesan, and cream cheese sauce.',
      prep_time: 10,
      cook_time: 25,
      servings: 4,
      tags: 'Pasta, Chicken, Cajun, Alfredo, Spicy, Dinner',
      ingredients: [
        { name: 'Farfalle Pasta', amount: '8', unit: 'ounces', raw_text: '8 ounces Farfalle Pasta' },
        { name: 'Butter', amount: '2', unit: 'tablespoons', raw_text: '2 tablespoons Butter' },
        { name: 'Garlic, minced', amount: '1 1/2', unit: 'teaspoons', raw_text: '1 ½ Garlic, minced' },
        { name: 'Boneless, Skinless Chicken Breasts', amount: '1', unit: 'pound', raw_text: '1 pound Boneless, Skinless Chicken Breasts, cut into 1-inch pieces' },
        { name: 'Cajun Seasoning', amount: '2', unit: 'teaspoons', raw_text: '2 teaspoons Cajun Seasoning' },
        { name: 'Cream Cheese, softened', amount: '4', unit: 'ounces', raw_text: '4 ounces Cream Cheese, softened and cut into small pieces' },
        { name: 'Milk', amount: '1', unit: 'cup', raw_text: '1 cup Milk' },
        { name: 'Corn Starch', amount: '1', unit: 'tablespoon', raw_text: '1 tablespoon Corn Starch' },
        { name: 'Parmesan Cheese, grated', amount: '3/4', unit: 'cup', raw_text: '¾ cup Parmesan Cheese, grated' },
        { name: 'Spinach', amount: '10', unit: 'ounces', raw_text: '10 ounces Spinach' },
        { name: 'Red Bell Pepper, chopped', amount: '1', unit: '', raw_text: '1 Red Bell Pepper, chopped' },
        { name: 'Salt', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Salt' },
        { name: 'Pepper', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Pepper' }
      ],
      instructions: [
        'Cook pasta according to package directions. Set aside.',
        'In a large pot, melt butter over medium heat. Sauté bell pepper. Add the garlic and cook for 30 seconds.',
        'Add the chicken with Cajun Seasoning, salt and pepper to pot. Cook for 3-4 minutes, until chicken is nearly cooked through.',
        'Heat milk in a microwave for 25 seconds; whisk in corn starch. Pour milk mixture and cream cheese to the pot. Gradually add parmesan cheese to the pot as well. Stir well until cheese is melted.',
        'Stir in pasta. Set heat to low and simmer for 10 minutes.',
        'Gradually stir in spinach, coating completely in the cream mixture.'
      ]
    },
    {
      title: 'Chicken Alfredo',
      description: 'Classic Italian-American dinner featuring roasted sliced oregano-seasoned chicken breast tossed with fettuccine pasta and creamy homemade Alfredo sauce.',
      prep_time: 10,
      cook_time: 20,
      servings: 6,
      tags: 'Pasta, Chicken, Alfredo, Italian, Classic, Dinner',
      ingredients: [
        { name: 'Fettuccine', amount: '16', unit: 'ounces', raw_text: '16 ounces Fettuccine' },
        { name: 'Chicken breast', amount: '1 1/2', unit: 'pounds', raw_text: '1 ½ pounds Chicken breast' },
        { name: 'Parmesan Cheese, grated', amount: '1/2', unit: 'cup', raw_text: '½ cup Parmesan Cheese, grated' },
        { name: 'Oregano', amount: '2 1/2', unit: 'teaspoons', raw_text: '2 ½ teaspoons Oregano' },
        { name: 'Salt', amount: '1/4', unit: 'teaspoon', raw_text: '¼ teaspoon Salt' },
        { name: 'Pepper', amount: '1/4', unit: 'teaspoon', raw_text: '¼ teaspoon Pepper' },
        { name: 'Alfredo Sauce', amount: '1', unit: 'serving', raw_text: 'One Serving Alfredo Sauce (See Recipe)' },
        { name: 'Olive Oil', amount: '1', unit: 'tablespoon', raw_text: 'Olive Oil' }
      ],
      instructions: [
        'Cook fettuccine according to package directions. Set aside in the pot used to cook the pasta.',
        'Preheat oven to 450 degrees. And grease a baking sheet. Coat chicken with olive oil. Season chicken with oregano, salt and pepper. Bake for 15-20 minutes. Rest chicken on a cutting board for 5 minutes. Slice chicken and set aside.',
        'Make Alfredo Sauce (see recipe).',
        'In the pot used to cook the pasta mix together the fettuccine, chicken and sauce.'
      ]
    },
    {
      title: 'Lemon Ricotta Pasta with Spinach',
      description: 'Bright and refreshing pasta tossed in a creamy lemon ricotta sauce with fresh baby spinach and grated parmesan cheese.',
      prep_time: 15,
      cook_time: 15,
      servings: 4,
      tags: 'Pasta, Vegetarian, Lemon, Ricotta, Spinach, Quick, Dinner',
      ingredients: [
        { name: 'Pasta', amount: '1/2', unit: 'pound', raw_text: '½ pound Pasta' },
        { name: 'Ricotta Cheese', amount: '1', unit: 'cup', raw_text: '1 cup Ricotta Cheese' },
        { name: 'Water', amount: '1/4', unit: 'cup', raw_text: '¼ cup Water' },
        { name: 'Corn Starch', amount: '1/2', unit: 'tablespoon', raw_text: '½ tablespoon Corn Starch' },
        { name: 'Spinach', amount: '8', unit: 'ounces', raw_text: '8 ounces Spinach' },
        { name: 'Parmesan Cheese, grated', amount: '1/3', unit: 'cup', raw_text: '1/3 cup Parmesan Cheese, grated' },
        { name: 'Lemon, zest and juice', amount: '1', unit: '', raw_text: '1 Lemon, zest and juice' },
        { name: 'Olive Oil', amount: '1', unit: 'tablespoon', raw_text: '1 tablespoon Olive Oil' },
        { name: 'Garlic, minced', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Garlic, minced' },
        { name: 'Salt', amount: '1/4', unit: 'teaspoon', raw_text: '¼ teaspoon Salt' },
        { name: 'Pepper', amount: '1/4', unit: 'teaspoon', raw_text: '¼ teaspoon Pepper' }
      ],
      instructions: [
        'In a large pot, cook pasta according to package directions. Drain the pasta once it is done and add it back into the pot. Stir in the spinach and cook until wilted.',
        'In a medium bowl, combine ricotta, olive oil, parmesan cheese, garlic, salt, lemon zest, lemon juice, salt and pepper.',
        'Add the ricotta sauce, water and corn starch. Add more water and corn starch as needed. Stir the sauce in with the pasta and spinach.'
      ]
    },
    {
      title: 'Macaroni and Cheese',
      description: 'Ultimate baked macaroni and cheese made with a rich homemade cheese sauce, topped with buttered crispy Panko breadcrumbs.',
      prep_time: 20,
      cook_time: 45,
      servings: 6,
      tags: 'Pasta, Cheese, Baked, Comfort Food, Dinner, Sides',
      ingredients: [
        { name: 'Macaroni', amount: '1/2', unit: 'pound', raw_text: '½ pound Macaroni' },
        { name: 'Cheese Sauce', amount: '1', unit: 'serving', raw_text: 'One Serving Cheese Sauce (See Recipe)' },
        { name: 'Butter, melted', amount: '3', unit: 'tablespoons', raw_text: '3 tablespoons Butter, melted' },
        { name: 'Panko Breadcrumbs', amount: '1', unit: 'cup', raw_text: '1 cup Panko Breadcrumbs' }
      ],
      instructions: [
        'Preheat oven to 350 degrees.',
        'Cook pasta according to package directions.',
        'Make one serving cheese sauce (see recipe).',
        'Fold macaroni into the cheese sauce and pour into a casserole dish.',
        'Top the macaroni with the remaining cheese. Toss the breadcrumbs with the melted butter to coat. Sprinkle the macaroni with the breadcrumb mixture.',
        'Bake for 30 minutes. Remove from the oven and rest for 5 minutes before serving.'
      ]
    },
    {
      title: 'Meatball Pasta Bake',
      description: 'Cheesy baked pasta casserole with medium shells, meatballs, savory pasta sauce, dollops of ricotta, and melted mozzarella and parmesan.',
      prep_time: 10,
      cook_time: 40,
      servings: 6,
      tags: 'Pasta, Meatballs, Italian, Casserole, Baked, Dinner',
      ingredients: [
        { name: 'Medium Shell Pasta', amount: '16', unit: 'ounces', raw_text: '16 ounces Medium Shell Pasta' },
        { name: 'Pasta Sauce', amount: '24', unit: 'ounces', raw_text: '24 ounces Pasta Sauce' },
        { name: 'Frozen Meatballs', amount: '24', unit: 'ounces', raw_text: '24 ounces Frozen Meatballs' },
        { name: 'Ricotta Cheese', amount: '12', unit: 'ounces', raw_text: '12 ounces Ricotta Cheese' },
        { name: 'Red Bell Pepper, diced', amount: '1', unit: '', raw_text: '1 Red Bell Pepper, diced' },
        { name: 'Mozzarella Cheese, shredded', amount: '2', unit: 'cups', raw_text: '2 cups Mozzarella Cheese, shredded' },
        { name: 'Parmesan Cheese, shredded', amount: '1', unit: 'cup', raw_text: '1 cup Parmesan Cheese, shredded' }
      ],
      instructions: [
        'Cook pasta according to package directions.',
        'Preheat oven to 350 degrees.',
        'Add ¼ of the sauce to the bottom of a casserole dish and spread meatballs across the dish.',
        'Add red peppers and dollops of ricotta evenly across the casserole dish.',
        'Sprinkle half of the mozzarella and parmesan cheese evenly across the top of the meatballs.',
        'Mix the pasta and the rest of the sauce together. Add them to the casserole dish over the meatballs.',
        'Spread the rest of the mozzarella and parmesan over the top of the pasta and sauce.',
        'Cover with foil and bake for 35-40 minutes.'
      ]
    },
    {
      title: 'Pastitsio',
      description: 'Traditional Greek baked pasta dish with seasoned spiced ground beef, ziti mixed with egg and cheese, and a creamy golden Béchamel topping.',
      prep_time: 40,
      cook_time: 45,
      servings: 8,
      tags: 'Pasta, Greek, Beef, Bechamel, Casserole, Baked, Dinner',
      ingredients: [
        { name: 'Bechamel Sauce', amount: '1', unit: 'serving', raw_text: 'One Serving Bechamel Sauce (See Recipe)' },
        { name: 'Butter', amount: '4', unit: 'tablespoons', raw_text: '4 tablespoons Butter' },
        { name: 'Onions, chopped', amount: '2', unit: '', raw_text: '2 Onions, chopped' },
        { name: 'Ground Beef', amount: '2', unit: 'pounds', raw_text: '2 pounds Ground Beef' },
        { name: 'Nutmeg', amount: '1/4', unit: 'teaspoon', raw_text: '¼ teaspoon Nutmeg' },
        { name: 'Pepper', amount: '1/4', unit: 'teaspoon', raw_text: '¼ teaspoon Pepper' },
        { name: 'Salt', amount: '2 1/2', unit: 'teaspoons', raw_text: '2 ½ teaspoons Salt' },
        { name: 'Water', amount: '1/2', unit: 'cup', raw_text: '½ cup Water' },
        { name: 'Tomato Paste', amount: '2', unit: 'tablespoons', raw_text: '2 tablespoons Tomato Paste' },
        { name: 'Ziti', amount: '1', unit: 'pound', raw_text: '1 pound Ziti' },
        { name: 'Eggs, beaten', amount: '2', unit: '', raw_text: '2 Eggs, beaten' },
        { name: 'Kasseri or Kefalotyri Cheese, grated', amount: '16', unit: 'ounces', raw_text: '16 ounces Kasseri or Kefalotyri Cheese, grated' },
        { name: 'Cooking Spray', amount: '', unit: '', raw_text: 'Cooking Spray' }
      ],
      instructions: [
        'Prepare the Bechamel Sauce (See Recipe).',
        'Preheat oven to 350 degrees.',
        'Melt butter in a large skillet over medium heat. Sauté onion until translucent, add beef and cook until browned. Stir in nutmeg, 1 teaspoon salt, pepper, water and tomato paste and simmer for 5 minutes. Set aside.',
        'Cook Ziti according to package directions. Drain and rinse with cool water. When pasta is cooled down, stir in the beaten eggs and 1 ½ teaspoons salt.',
        'Spray a deep 9x13-inch casserole dish with cooking spray. Spread half of the pasta into the bottom of the dish. Sprinkle with cheese. Spread the meat mixture over the pasta. Sprinkle with another layer of cheese. Add the remaining pasta to the top of the meat and sprinkle with another layer of cheese. Top with the Bechamel Sauce and sprinkle with the remaining cheese.',
        'Bake 45 minutes. Rest for 20 minutes before serving.'
      ]
    },
    {
      title: 'Penne Alla Vodka',
      description: 'Rich and velvety Penne alla Vodka in a luscious tomato-cream vodka sauce seasoned with garlic, basil, red pepper flakes, and parmesan.',
      prep_time: 5,
      cook_time: 35,
      servings: 6,
      tags: 'Pasta, Vodka Sauce, Italian, Classic, Dinner',
      ingredients: [
        { name: 'Penne', amount: '16', unit: 'ounces', raw_text: '16 ounces Penne' },
        { name: 'Olive Oil', amount: '3', unit: 'tablespoons', raw_text: '3 tablespoons Olive Oil' },
        { name: 'Yellow Onion, diced', amount: '1', unit: 'cup', raw_text: '1 cup Yellow Onion, diced' },
        { name: 'Garlic, minced', amount: '1', unit: 'tablespoon', raw_text: '1 tablespoon Garlic, minced' },
        { name: 'Salt', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Salt' },
        { name: 'Pepper', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Pepper' },
        { name: 'Red Pepper Flakes', amount: '1/4', unit: 'teaspoon', raw_text: '¼ teaspoon Red Pepper Flakes' },
        { name: 'Chicken Broth', amount: '1/2', unit: 'cup', raw_text: '½ cup Chicken Broth' },
        { name: 'Vodka', amount: '1/2', unit: 'cup', raw_text: '½ cup Vodka' },
        { name: 'Crushed Tomatoes', amount: '1', unit: 'can (28 oz)', raw_text: '1 can (28 ounces) Crushed Tomatoes' },
        { name: 'Tomato Sauce', amount: '1', unit: 'can (16 oz)', raw_text: '1 can (16 ounces) Tomato Sauce' },
        { name: 'Basil', amount: '1', unit: 'tablespoon', raw_text: '1 tablespoon Basil' },
        { name: 'Heavy Cream', amount: '2', unit: 'cups', raw_text: '2 cups Heavy Cream' },
        { name: 'Parmesan cheese, grated', amount: '1 3/4', unit: 'cups', raw_text: '1 ¾ Parmesan cheese, grated' }
      ],
      instructions: [
        'Cook penne according to package directions.',
        'In a pot, on medium heat, sauté diced onions, garlic, and seasonings in olive oil until translucent.',
        'Add chicken broth and vodka and deglaze the pan.',
        'Turn heat down to medium-low and add the crushed tomatoes, tomato sauce, and basil. Let simmer for 20 minutes, stirring occasionally.',
        'Turn heat down to low and add heavy cream and parmesan cheese. Simmer for another 5 minutes, stirring often.',
        'Add the pasta to the sauce. Stir to coat and simmer for another 5 minutes. Remove from heat and let rest for 10 minutes.',
        'Serve.'
      ]
    },
    {
      title: 'Smoked Sausage Alfredo Bake',
      description: 'Hearty rigatoni pasta baked in a rich garlic Alfredo sauce with savory smoked sausage slices and bubbly melted mozzarella.',
      prep_time: 5,
      cook_time: 20,
      servings: 6,
      tags: 'Pasta, Sausage, Alfredo, Casserole, Baked, Dinner',
      ingredients: [
        { name: 'Rigatoni', amount: '16', unit: 'ounces', raw_text: '16 ounces Rigatoni' },
        { name: 'Butter', amount: '3', unit: 'tablespoons', raw_text: '3 tablespoons Butter' },
        { name: 'Garlic, minced', amount: '1 1/2', unit: 'teaspoons', raw_text: '1 ½ teaspoons Garlic, minced' },
        { name: 'Flour', amount: '3', unit: 'tablespoons', raw_text: '3 tablespoons Flour' },
        { name: 'Chicken Broth', amount: '1', unit: 'cup', raw_text: '1 cup Chicken Broth' },
        { name: 'Heavy Cream', amount: '2', unit: 'cups', raw_text: '2 cups Heavy Cream' },
        { name: 'Salt', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Salt' },
        { name: 'Pepper', amount: '1/4', unit: 'teaspoon', raw_text: '¼ teaspoon Pepper' },
        { name: 'Cayenne Pepper', amount: '1/4', unit: 'teaspoon', raw_text: '¼ teaspoon Cayenne Pepper' },
        { name: 'Parmesan Cheese, grated', amount: '1/2', unit: 'cup', raw_text: '½ cup Parmesan Cheese, grated' },
        { name: 'Mozzarella Cheese, grated', amount: '2', unit: 'cups', raw_text: '2 cups Mozzarella Cheese, grated' },
        { name: 'Cooked Smoked Sausage, sliced', amount: '1', unit: 'package (12 oz)', raw_text: '1 (12 ounce) package Cooked Smoked Sausage, sliced' }
      ],
      instructions: [
        'Cook pasta according to package directions.',
        'Melt butter in a pot over medium heat. Sauté garlic. Stir in flour.',
        'Whisk in chicken broth and then stir in heavy whipping cream.',
        'Add spices and simmer until sauce is thickened.',
        'Stir in parmesan cheese and 1 cup mozzarella cheese until melted.',
        'Add smoked sausages and pasta to sauce.',
        'Preheat broiler. Pour the pasta mixture into a lightly greased casserole dish. Top with remaining mozzarella cheese. Broil for 3 minutes.',
        'Serve.'
      ]
    },
    {
      title: 'Stuffed Shells',
      description: 'Jumbo pasta shells stuffed with seasoned ricotta, egg, herbs, and cheeses, baked in rich marinara sauce with melted mozzarella.',
      prep_time: 15,
      cook_time: 35,
      servings: 6,
      tags: 'Pasta, Italian, Vegetarian, Ricotta, Baked, Dinner',
      ingredients: [
        { name: 'Marinara Sauce', amount: '3', unit: 'cups', raw_text: '3 cups Marinara Sauce' },
        { name: 'Olive Oil', amount: '1', unit: 'tablespoon', raw_text: '1 tablespoon Olive OIl' },
        { name: 'Jumbo Shells', amount: '8', unit: 'ounces', raw_text: '8 ounces Jumbo Shells (Half a Box)' },
        { name: 'Salt', amount: '1/4', unit: 'teaspoon', raw_text: '¼ teaspoon Salt' },
        { name: 'Pepper', amount: '1/4', unit: 'teaspoon', raw_text: '¼ teaspoon Pepper' },
        { name: 'Garlic Powder', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Garlic Powder' },
        { name: 'Ricotta Cheese', amount: '15', unit: 'ounces', raw_text: '15 ounces Ricotta Cheese' },
        { name: 'Mozzarella Cheese, shredded', amount: '2', unit: 'cups', raw_text: '2 cups Mozzarella Cheese, shredded' },
        { name: 'Parmesan Cheese, grated', amount: '1/2', unit: 'cup', raw_text: '½ cup Parmesan Cheese, grated' },
        { name: 'Egg', amount: '1', unit: '', raw_text: '1 Egg' },
        { name: 'Parsley', amount: '1', unit: 'tablespoon', raw_text: '1 tablespoon Parsley' },
        { name: 'Basil', amount: '1', unit: 'tablespoon', raw_text: '1 tablespoon Basil' },
        { name: 'Oregano', amount: '1 1/2', unit: 'teaspoons', raw_text: '1 ½ teaspoons Oregano' },
        { name: 'Garlic, minced', amount: '1 1/2', unit: 'teaspoons', raw_text: '1 ½ teaspoons Garlic, minced' }
      ],
      instructions: [
        'Preheat oven to 350 degrees and lightly grease a casserole dish.',
        'Cook pasta according to package directions. Toss with 1 tablespoon olive oil. Set aside until cool enough to handle.',
        'Combine ricotta cheese, egg, herbs, garlic, parmesan cheese, 1 ¾ cups mozzarella cheese, and seasonings in a mixing bowl.',
        'Spread 3 cups of marinara sauce over the bottom of the casserole dish evenly.',
        'Fill each shell with 2 tablespoons of ricotta filling and place in the dish.',
        'Sprinkle the remaining mozzarella cheese over each shell and bake for 20-25 minutes.'
      ]
    },
    {
      title: 'Tortellini Bake',
      description: 'Simple 4-ingredient baked cheese tortellini coated in rich marinara sauce, oregano, and melted gooey mozzarella cheese.',
      prep_time: 5,
      cook_time: 30,
      servings: 4,
      tags: 'Pasta, Tortellini, Italian, Baked, Quick, Easy, Dinner',
      ingredients: [
        { name: 'Frozen Cheese Tortellini', amount: '1', unit: 'package (12 oz)', raw_text: '1 package (12 ounces) Frozen Cheese Tortellini' },
        { name: 'Marinara Sauce', amount: '3', unit: 'cups', raw_text: '3 cups Marinara Sauce' },
        { name: 'Oregano', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Oregano' },
        { name: 'Mozzarella Cheese, shredded', amount: '2', unit: 'cups', raw_text: '2 cups Mozzarella Cheese, shredded' }
      ],
      instructions: [
        'Preheat oven to 375 degrees.',
        'Cook tortellini according to package directions.',
        'Add marinara sauce, oregano and half the mozzarella cheese to the tortellini and coat evenly.',
        'Add mixture to a casserole dish and top with the remaining mozzarella cheese. Bake for 20 minutes.',
        'Let rest for 10 minutes.',
        'Serve.'
      ]
    },
    {
      title: 'Tortellini with Tomato Cream Sauce',
      description: 'Cheese tortellini in a rich and savory tomato cream sauce with diced tomatoes, baby spinach, garlic, basil, and parmesan.',
      prep_time: 5,
      cook_time: 20,
      servings: 4,
      tags: 'Pasta, Tortellini, Tomato Cream, Spinach, Quick, Dinner',
      ingredients: [
        { name: 'Frozen Cheese Tortellini', amount: '1', unit: 'package (16 oz)', raw_text: '1 package (16 ounces) Frozen Cheese Tortellini' },
        { name: 'Onion, chopped', amount: '1', unit: '', raw_text: '1 Onion, chopped' },
        { name: 'Olive Oil', amount: '1', unit: 'tablespoon', raw_text: '1 tablespoon Olive Oil' },
        { name: 'Garlic, minced', amount: '1 1/2', unit: 'teaspoons', raw_text: '1 ½ teaspoon Garlic, minced' },
        { name: 'Diced Tomatoes, undrained', amount: '1', unit: 'can (14 oz)', raw_text: '1 can (14 ounces) Diced Tomatoes, undrained' },
        { name: 'Spinach', amount: '1', unit: 'package (10 oz)', raw_text: '1 package (10 ounces) Spinach' },
        { name: 'Basil', amount: '1 1/2', unit: 'teaspoons', raw_text: '1 ½ teaspoons Basil' },
        { name: 'Salt', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Salt' },
        { name: 'Pepper', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Pepper' },
        { name: 'Heavy Whipping Cream', amount: '1 1/2', unit: 'cups', raw_text: '1 ½ cups Heavy Whipping Cream' },
        { name: 'Parmesan Cheese, grated', amount: '1/2', unit: 'cup', raw_text: '½ cup Parmesan Cheese, grated' }
      ],
      instructions: [
        'Cook tortellini according to package directions.',
        'Heat olive oil in a skillet of medium heat. Sauté onion until translucent. Add garlic, diced tomatoes, spinach, basil, salt and pepper to the skillet. Cook until the liquid is absorbed.',
        'Stir in heavy whipping cream and parmesan cheese. Bring to a boil. Reduce heat and simmer uncovered for 8-10 minutes or until thickened.',
        'Toss tortellini with sauce and serve.'
      ]
    },
    {
      title: 'Tuscan Ravioli',
      description: 'Tender cheese ravioli coated in a rich Tuscan garlic cream sauce with sun-dried tomatoes, wilted baby spinach, and fresh parmesan.',
      prep_time: 5,
      cook_time: 25,
      servings: 4,
      tags: 'Pasta, Ravioli, Tuscan, Sun Dried Tomatoes, Spinach, Cream Sauce, Dinner',
      ingredients: [
        { name: 'Butter', amount: '2', unit: 'tablespoons', raw_text: '2 tablespoons Butter' },
        { name: 'Garlic, minced', amount: '2', unit: 'teaspoons', raw_text: '2 teaspoons Garlic, minced' },
        { name: 'Onion Powder', amount: '1/2', unit: 'teaspoon', raw_text: '½ teaspoon Onion Powder' },
        { name: 'Italian Seasoning', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Italian Seasoning' },
        { name: 'Lemon Juice', amount: '1', unit: 'tablespoon', raw_text: '1 tablespoon Lemon Juice' },
        { name: 'Chicken Broth', amount: '1/4', unit: 'cup', raw_text: '¼ cup Chicken Broth' },
        { name: 'Heavy Cream', amount: '1', unit: 'cup', raw_text: '1 cup Heavy Cream' },
        { name: 'Baby Spinach', amount: '1', unit: 'cup', raw_text: '1 cup Baby Spinach' },
        { name: 'Ravioli', amount: '2', unit: 'packages', raw_text: '2 packages Ravioli' },
        { name: 'Sundried tomatoes, packed in oil', amount: '1/3', unit: 'cup', raw_text: '1/3 cup Sundried tomatoes, packed in oil' },
        { name: 'Olive Oil', amount: '1', unit: 'tablespoon', raw_text: '1 tablespoon Olive Oil' },
        { name: 'Parmesan Cheese, grated', amount: '1/2', unit: 'cup', raw_text: '½ cup Parmesan Cheese, grated' },
        { name: 'Basil', amount: '1', unit: 'teaspoon', raw_text: '1 teaspoon Basil' }
      ],
      instructions: [
        'Cook pasta according to package directions.',
        'Add butter and olive oil in a skillet and heat over medium heat. Add garlic and cook for 30 seconds. Add onion powder, Italian seasoning, lemon juice, chicken broth, heavy cream, and sun-dried tomatoes to skillet and heat through.',
        'Add sauce to pasta and stir to combine. Top with spinach and cover the skillet until it is wilted. Stir to combine.',
        'Top with parmesan cheese and basil.'
      ]
    }
  ];

  for (const r of recipes) {
    const existing = await db.get('SELECT id FROM recipes WHERE title = ?', [r.title]);
    if (existing) continue;

    const res = await db.run(`
      INSERT INTO recipes (title, description, prep_time, cook_time, servings, image_path, source_url, favorite, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [r.title, r.description, r.prep_time, r.cook_time, r.servings, '', '', 0, r.tags]);
    
    const recipeId = res.lastID;

    for (const ing of r.ingredients) {
      await db.run(`
        INSERT INTO ingredients (recipe_id, name, amount, unit, raw_text)
        VALUES (?, ?, ?, ?, ?)
      `, [recipeId, ing.name, ing.amount, ing.unit, ing.raw_text]);
    }

    for (let i = 0; i < r.instructions.length; i++) {
      await db.run(`
        INSERT INTO instructions (recipe_id, step_number, instruction_text)
        VALUES (?, ?, ?)
      `, [recipeId, i + 1, r.instructions[i]]);
    }

    const tags = r.tags.split(',').map(t => t.trim());
    for (const tag of tags) {
      await db.run('INSERT OR IGNORE INTO reusable_tags (name) VALUES (?)', [tag]);
    }
  }
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
    SELECT u.id, u.username, u.role_id, u.display_name, u.auth_provider, u.timezone, u.created_at, r.name as role_name 
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    ORDER BY u.username ASC
  `);
}

export async function createUser(username, password, roleId, displayName = null, authProvider = 'local') {
  const db = await getDb();
  const hashedPassword = hashPassword(password);
  const result = await db.run(
    "INSERT INTO users (username, password, role_id, display_name, auth_provider) VALUES (?, ?, ?, ?, ?)",
    [username, hashedPassword, roleId || null, displayName, authProvider]
  );
  return result.lastID;
}

export async function updateUser(id, username, password, roleId) {
  const db = await getDb();
  if (password && password.trim()) {
    const hashedPassword = hashPassword(password);
    await db.run(
      "UPDATE users SET username = ?, password = ?, role_id = ? WHERE id = ?",
      [username, hashedPassword, roleId || null, id]
    );
  } else {
    await db.run(
      "UPDATE users SET username = ?, role_id = ? WHERE id = ?",
      [username, roleId || null, id]
    );
  }
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
