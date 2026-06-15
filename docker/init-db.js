const Database = require('./node_modules/better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbUrl = process.env.DATABASE_URL || 'file:/app/data/prumo.db';
const dbPath = dbUrl.replace(/^file:/, '');
const dir = path.dirname(dbPath);

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(dbPath);
const { n } = db
  .prepare("SELECT count(*) as n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
  .get();

if (n === 0) {
  const sql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
  db.exec(sql);
  console.log('[prumo] Schema aplicado — tabelas criadas.');
} else {
  console.log('[prumo] DB existente: ' + n + ' tabelas.');
}

// Aplica migrations incrementais (IF NOT EXISTS — seguro para toda execução)
const migratePath = path.join(__dirname, 'migrate.sql');
if (fs.existsSync(migratePath)) {
  const migrateSql = fs.readFileSync(migratePath, 'utf8');
  db.exec(migrateSql);
  console.log('[prumo] Migrations incrementais aplicadas.');
}

db.close();
