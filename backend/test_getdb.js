import { getDb } from './db.js';

async function test() {
  console.log('Running test()...');
  const db = await getDb();
  console.log('Database opened.');
  const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
  console.log('Tables returned by getDb():', tables.map(t => t.name));
}

test().catch(console.error);
