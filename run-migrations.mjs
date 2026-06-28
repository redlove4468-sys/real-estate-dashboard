import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connection = await mysql.createConnection({
  host: 'reseau.proxy.rlwy.net',
  port: 12338,
  user: 'root',
  password: 'LLZvDIHXEsqCrKRSnItylwGjouqWySwo',
  database: 'railway',
  multipleStatements: true,
});

console.log('Connected to Railway MySQL');

// drizzle migrations journal
const journalPath = path.join(__dirname, 'drizzle', 'meta', '_journal.json');
let migrationFiles = [];

if (fs.existsSync(journalPath)) {
  const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
  migrationFiles = journal.entries.map(e => e.tag + '.sql');
} else {
  // fallback: sort sql files numerically
  migrationFiles = fs.readdirSync(path.join(__dirname, 'drizzle'))
    .filter(f => f.endsWith('.sql'))
    .sort();
}

// Create migrations tracking table
await connection.execute(`
  CREATE TABLE IF NOT EXISTS __drizzle_migrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hash TEXT NOT NULL,
    created_at BIGINT
  )
`);

const [applied] = await connection.execute('SELECT hash FROM __drizzle_migrations');
const appliedHashes = new Set(applied.map(r => r.hash));

for (const file of migrationFiles) {
  const filePath = path.join(__dirname, 'drizzle', file);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file} (not found)`);
    continue;
  }

  const hash = file.replace('.sql', '');
  if (appliedHashes.has(hash)) {
    console.log(`Already applied: ${file}`);
    continue;
  }

  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`Running: ${file}`);
  try {
    await connection.query(sql);
    await connection.execute(
      'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
      [hash, Date.now()]
    );
    console.log(`  ✓ Done`);
  } catch (err) {
    console.error(`  ✗ Error: ${err.message}`);
    process.exit(1);
  }
}

console.log('\nAll migrations complete!');
await connection.end();
