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

// Migration: diario_obras.fotoUrl
const diarioInfo = db.prepare("PRAGMA table_info('diario_obras')").all();
if (!diarioInfo.find(c => c.name === 'fotoUrl')) {
  db.exec('ALTER TABLE "diario_obras" ADD COLUMN "fotoUrl" TEXT;');
  console.log('[prumo] Migração aplicada: diario_obras.fotoUrl adicionado.');
}

// Migration: diario_obras.fotosJson (multi-foto — v2.0)
if (!diarioInfo.find(c => c.name === 'fotosJson')) {
  db.exec('ALTER TABLE "diario_obras" ADD COLUMN "fotosJson" TEXT;');
  console.log('[prumo] Migração aplicada: diario_obras.fotosJson adicionado.');
}

// Migration: chamados_assistencia.dataVistoria (agendamento — v2.0)
const chamadosAssistInfo = db.prepare("PRAGMA table_info('chamados_assistencia')").all();
if (!chamadosAssistInfo.find(c => c.name === 'dataVistoria')) {
  db.exec('ALTER TABLE "chamados_assistencia" ADD COLUMN "dataVistoria" DATETIME;');
  console.log('[prumo] Migração aplicada: chamados_assistencia.dataVistoria adicionado.');
}

// Migration: obras.cronogramaJson (cronograma por fase — v2.2)
const obrasInfoV2 = db.prepare("PRAGMA table_info('obras')").all();
if (!obrasInfoV2.find(c => c.name === 'cronogramaJson')) {
  db.exec('ALTER TABLE "obras" ADD COLUMN "cronogramaJson" TEXT;');
  console.log('[prumo] Migração aplicada: obras.cronogramaJson adicionado.');
}

// Migration: terrenos.lat/lng (mapa de terrenos — v2.3)
const terrenosGeoInfo = db.prepare("PRAGMA table_info('terrenos')").all();
if (!terrenosGeoInfo.find(c => c.name === 'lat')) {
  db.exec('ALTER TABLE "terrenos" ADD COLUMN "lat" REAL;');
  console.log('[prumo] Migração aplicada: terrenos.lat adicionado.');
}
if (!terrenosGeoInfo.find(c => c.name === 'lng')) {
  db.exec('ALTER TABLE "terrenos" ADD COLUMN "lng" REAL;');
  console.log('[prumo] Migração aplicada: terrenos.lng adicionado.');
}
if (!terrenosGeoInfo.find(c => c.name === 'cep')) {
  db.exec('ALTER TABLE "terrenos" ADD COLUMN "cep" TEXT;');
  console.log('[prumo] Migração aplicada: terrenos.cep adicionado.');
}

// Migration: obras.endereco/cidade/cep (endereço para envio a funcionários — v2.9)
const obrasEnderecoInfo = db.prepare("PRAGMA table_info('obras')").all();
if (!obrasEnderecoInfo.find(c => c.name === 'endereco')) {
  db.exec('ALTER TABLE "obras" ADD COLUMN "endereco" TEXT;');
  console.log('[prumo] Migração aplicada: obras.endereco adicionado.');
}
if (!obrasEnderecoInfo.find(c => c.name === 'cidade')) {
  db.exec('ALTER TABLE "obras" ADD COLUMN "cidade" TEXT;');
  console.log('[prumo] Migração aplicada: obras.cidade adicionado.');
}
if (!obrasEnderecoInfo.find(c => c.name === 'cep')) {
  db.exec('ALTER TABLE "obras" ADD COLUMN "cep" TEXT;');
  console.log('[prumo] Migração aplicada: obras.cep adicionado.');
}

// Migration: usuarios.bloqueado (Super Admin — v0.9)
const usuariosInfo = db.prepare("PRAGMA table_info('usuarios')").all();
if (!usuariosInfo.find(c => c.name === 'bloqueado')) {
  db.exec('ALTER TABLE "usuarios" ADD COLUMN "bloqueado" INTEGER NOT NULL DEFAULT 0;');
  console.log('[prumo] Migração aplicada: usuarios.bloqueado adicionado.');
}

// Migration: usuarios.cargo (RBAC — v1.5)
if (!usuariosInfo.find(c => c.name === 'cargo')) {
  db.exec('ALTER TABLE "usuarios" ADD COLUMN "cargo" TEXT NOT NULL DEFAULT \'admin\';');
  console.log('[prumo] Migração aplicada: usuarios.cargo adicionado.');
}

// Migration: empresas.telefoneGestor (notificações WhatsApp)
const empresasInfo = db.prepare("PRAGMA table_info('empresas')").all();
if (!empresasInfo.find(c => c.name === 'telefoneGestor')) {
  db.exec('ALTER TABLE "empresas" ADD COLUMN "telefoneGestor" TEXT;');
  console.log('[prumo] Migração aplicada: empresas.telefoneGestor adicionado.');
}

// Migration: empresas.logoEmpresa (logo da empresa nos contratos)
if (!empresasInfo.find(c => c.name === 'logoEmpresa')) {
  db.exec('ALTER TABLE "empresas" ADD COLUMN "logoEmpresa" TEXT;');
  console.log('[prumo] Migração aplicada: empresas.logoEmpresa adicionado.');
}

// Migration: vendas.contratoAssinadoEm (assinatura digital)
const vendasInfo = db.prepare("PRAGMA table_info('vendas')").all();
if (!vendasInfo.find(c => c.name === 'contratoAssinadoEm')) {
  db.exec('ALTER TABLE "vendas" ADD COLUMN "contratoAssinadoEm" DATETIME;');
  console.log('[prumo] Migração aplicada: vendas.contratoAssinadoEm adicionado.');
}

// Retenção de audit logs: apaga registros com mais de 90 dias (LGPD art. 15)
try {
  const auditTableExists = db
    .prepare("SELECT count(*) as n FROM sqlite_master WHERE type='table' AND name='security_audit_logs'")
    .get();
  if (auditTableExists && auditTableExists.n > 0) {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const deleted = db.prepare('DELETE FROM "security_audit_logs" WHERE "criadoEm" < ?').run(cutoff);
    if (deleted.changes > 0) {
      console.log('[prumo] Audit logs antigos removidos: ' + deleted.changes + ' registros (>90 dias).');
    }
  }
} catch (e) {
  console.warn('[prumo] Retenção audit log ignorada:', e.message);
}

db.close();
