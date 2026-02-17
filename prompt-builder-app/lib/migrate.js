import { existsSync, readFileSync, renameSync } from 'fs';
import { join } from 'path';
import db from './db.js';

export function migrateJsonPrompts(dataDir) {
  const jsonFile = join(dataDir, 'prompts.json');
  if (!existsSync(jsonFile)) return;

  const count = db.prepare('SELECT COUNT(*) as c FROM prompts').get().c;
  if (count > 0) return; // already has data

  let prompts;
  try {
    const raw = readFileSync(jsonFile, 'utf-8');
    prompts = JSON.parse(raw);
  } catch {
    return;
  }

  if (!Array.isArray(prompts) || prompts.length === 0) return;

  // Assign to first registered user, or skip if no users yet
  const firstUser = db.prepare('SELECT id FROM users ORDER BY id LIMIT 1').get();
  if (!firstUser) {
    console.log('Skipping prompt migration: no users registered yet. Will retry on next startup.');
    return;
  }

  const insert = db.prepare(
    'INSERT INTO prompts (user_id, description, form_data, created_at) VALUES (?, ?, ?, ?)'
  );

  const tx = db.transaction(() => {
    for (const p of prompts) {
      insert.run(
        firstUser.id,
        p.description || 'Imported prompt',
        JSON.stringify(p.formData || p),
        p.createdAt || new Date().toISOString()
      );
    }
  });
  tx();

  renameSync(jsonFile, jsonFile + '.migrated');
  console.log(`Migrated ${prompts.length} prompts from JSON to SQLite (assigned to user #${firstUser.id})`);
}
