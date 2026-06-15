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

// Migration: obras.terrenoId NOT NULL → nullable (SQLite não suporta ALTER COLUMN)
const obrasInfo = db.prepare("PRAGMA table_info('obras')").all();
const terrenoCol = obrasInfo.find(c => c.name === 'terrenoId');
if (terrenoCol && terrenoCol.notnull === 1) {
  db.exec(`
    PRAGMA foreign_keys = OFF;
    BEGIN TRANSACTION;
    CREATE TABLE "obras_new" (
      "id"          TEXT    NOT NULL PRIMARY KEY,
      "empresaId"   TEXT    NOT NULL,
      "terrenoId"   TEXT,
      "nome"        TEXT    NOT NULL,
      "status"      TEXT    NOT NULL DEFAULT 'planejamento',
      "orcamento"   DECIMAL NOT NULL,
      "inicio"      DATETIME,
      "prazo"       DATETIME,
      "progresso"   INTEGER NOT NULL DEFAULT 0,
      "responsavel" TEXT,
      "criadoEm"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "atualizadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "obras_new_empresaId_fkey"
        FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
    INSERT INTO "obras_new" SELECT * FROM "obras";
    DROP TABLE "obras";
    ALTER TABLE "obras_new" RENAME TO "obras";
    CREATE INDEX IF NOT EXISTS "obras_empresaId_idx" ON "obras"("empresaId");
    COMMIT;
    PRAGMA foreign_keys = ON;
  `);
  console.log('[prumo] Migração aplicada: obras.terrenoId agora nullable.');
}

db.close();
