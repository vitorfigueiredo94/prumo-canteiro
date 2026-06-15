-- Migration: Checklist Automatizado
-- Aplica IF NOT EXISTS — seguro para DBs existentes

CREATE TABLE IF NOT EXISTS "checklist_templates" (
  "id"       TEXT     NOT NULL PRIMARY KEY,
  "tipo"     TEXT     NOT NULL,
  "nome"     TEXT     NOT NULL,
  "ordem"    INTEGER  NOT NULL DEFAULT 0,
  "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "checklist_templates_tipo_key" UNIQUE ("tipo")
);

CREATE TABLE IF NOT EXISTS "checklist_template_itens" (
  "id"          TEXT     NOT NULL PRIMARY KEY,
  "templateId"  TEXT     NOT NULL,
  "descricao"   TEXT     NOT NULL,
  "obrigatorio" BOOLEAN  NOT NULL DEFAULT 1,
  "ordem"       INTEGER  NOT NULL DEFAULT 0,
  "criadoEm"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "checklist_template_itens_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "checklist_templates" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "checklist_template_itens_templateId_idx"
  ON "checklist_template_itens"("templateId");

CREATE TABLE IF NOT EXISTS "checklists" (
  "id"          TEXT     NOT NULL PRIMARY KEY,
  "empresaId"   TEXT     NOT NULL,
  "ownerType"   TEXT     NOT NULL,
  "obraId"      TEXT,
  "terrenoId"   TEXT,
  "templateId"  TEXT     NOT NULL,
  "fase"        TEXT     NOT NULL,
  "status"      TEXT     NOT NULL DEFAULT 'ativo',
  "criadoEm"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "checklists_empresaId_idx" ON "checklists"("empresaId");
CREATE INDEX IF NOT EXISTS "checklists_obraId_idx"    ON "checklists"("obraId");
CREATE INDEX IF NOT EXISTS "checklists_terrenoId_idx" ON "checklists"("terrenoId");

CREATE TABLE IF NOT EXISTS "checklist_itens" (
  "id"             TEXT     NOT NULL PRIMARY KEY,
  "checklistId"    TEXT     NOT NULL,
  "templateItemId" TEXT     NOT NULL,
  "descricao"      TEXT     NOT NULL,
  "concluido"      BOOLEAN  NOT NULL DEFAULT 0,
  "concluidoEm"   DATETIME,
  "observacao"     TEXT,
  "criadoEm"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "checklist_itens_checklistId_fkey"
    FOREIGN KEY ("checklistId") REFERENCES "checklists" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "checklist_itens_checklistId_idx"
  ON "checklist_itens"("checklistId");

-- Migration: fotoUrl no Diário de Obra
ALTER TABLE "diario_obras" ADD COLUMN IF NOT EXISTS "fotoUrl" TEXT;
