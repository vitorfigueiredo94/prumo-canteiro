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

-- Migration: fotoUrl no Diário de Obra (aplicada via init-db.js com PRAGMA check)

-- Migration: Assistência Técnica Pós-Obra (v0.8)
CREATE TABLE IF NOT EXISTS "garantia_componentes" (
  "id"                TEXT     NOT NULL PRIMARY KEY,
  "empresaId"         TEXT     NOT NULL,
  "codigo"            TEXT     NOT NULL,
  "nome"              TEXT     NOT NULL,
  "prazoLegalMeses"   INTEGER  NOT NULL,
  "prazoContratMeses" INTEGER  NOT NULL,
  "marcoInicial"      TEXT     NOT NULL DEFAULT 'entrega_chaves',
  "baseLegal"         TEXT,
  "ativo"             BOOLEAN  NOT NULL DEFAULT 1,
  "criadoEm"         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "garantia_componentes_empresaId_codigo_key" UNIQUE ("empresaId", "codigo")
);
CREATE INDEX IF NOT EXISTS "garantia_componentes_empresaId_idx" ON "garantia_componentes"("empresaId");

CREATE TABLE IF NOT EXISTS "chamados_assistencia" (
  "id"                TEXT     NOT NULL PRIMARY KEY,
  "empresaId"         TEXT     NOT NULL,
  "vendaId"           TEXT     NOT NULL,
  "componenteId"      TEXT     NOT NULL,
  "descricao"         TEXT     NOT NULL,
  "status"            TEXT     NOT NULL DEFAULT 'aberto',
  "dataEntregaChaves" DATETIME,
  "parecerStatus"     TEXT,
  "parecerTexto"      TEXT,
  "parecerGeradoEm"  DATETIME,
  "criadoEm"         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "chamados_assistencia_empresaId_idx" ON "chamados_assistencia"("empresaId");
CREATE INDEX IF NOT EXISTS "chamados_assistencia_vendaId_idx"   ON "chamados_assistencia"("vendaId");

-- Migration: Robô de Cobrança (v0.8)
CREATE TABLE IF NOT EXISTS "cobranca_logs" (
  "id"        TEXT     NOT NULL PRIMARY KEY,
  "empresaId" TEXT     NOT NULL,
  "parcelaId" TEXT     NOT NULL,
  "tipo"      TEXT     NOT NULL,
  "canal"     TEXT     NOT NULL DEFAULT 'whatsapp',
  "status"    TEXT     NOT NULL DEFAULT 'pendente',
  "payload"   TEXT,
  "resposta"  TEXT,
  "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "cobranca_logs_empresaId_idx" ON "cobranca_logs"("empresaId");
CREATE INDEX IF NOT EXISTS "cobranca_logs_parcelaId_idx" ON "cobranca_logs"("parcelaId");

-- Migration: Super Admin — Faturas de Assinatura SaaS (v0.9)
CREATE TABLE IF NOT EXISTS "faturas" (
  "id"          TEXT     NOT NULL PRIMARY KEY,
  "empresaId"   TEXT     NOT NULL,
  "competencia" TEXT     NOT NULL,
  "valor"       DECIMAL  NOT NULL,
  "vencimento"  DATETIME NOT NULL,
  "status"      TEXT     NOT NULL DEFAULT 'pendente',
  "pagaEm"      DATETIME,
  "criadoEm"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "faturas_empresaId_idx"   ON "faturas"("empresaId");
CREATE INDEX IF NOT EXISTS "faturas_competencia_idx" ON "faturas"("competencia");

-- Migration: Planos e Assinaturas SaaS (v1.0)
CREATE TABLE IF NOT EXISTS "planos" (
  "id"              TEXT     NOT NULL PRIMARY KEY,
  "nome"            TEXT     NOT NULL,
  "preco"           DECIMAL  NOT NULL,
  "limiteObras"     INTEGER,
  "limiteUsuarios"  INTEGER,
  "recursos"        TEXT     NOT NULL DEFAULT '[]',
  "destaque"        BOOLEAN  NOT NULL DEFAULT 0,
  "criadoEm"        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "assinaturas" (
  "id"               TEXT     NOT NULL PRIMARY KEY,
  "empresaId"        TEXT     NOT NULL,
  "planoId"          TEXT     NOT NULL,
  "status"           TEXT     NOT NULL DEFAULT 'trial',
  "desde"            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "proximaCobranca"  DATETIME,
  "criadoEm"         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assinaturas_empresaId_key" UNIQUE ("empresaId"),
  CONSTRAINT "assinaturas_empresaId_fkey"
    FOREIGN KEY ("empresaId") REFERENCES "empresas"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "assinaturas_planoId_fkey"
    FOREIGN KEY ("planoId") REFERENCES "planos"("id")
    ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "assinaturas_empresaId_idx" ON "assinaturas"("empresaId");

-- Migration: Audit Log de Segurança — LGPD art. 15 (v1.5)
CREATE TABLE IF NOT EXISTS "security_audit_logs" (
  "id"           TEXT     NOT NULL PRIMARY KEY,
  "empresaId"    TEXT     NOT NULL,
  "userId"       TEXT     NOT NULL,
  "action"       TEXT     NOT NULL,
  "resourceType" TEXT     NOT NULL,
  "resourceId"   TEXT,
  "result"       TEXT     NOT NULL DEFAULT 'allowed',
  "ipHash"       TEXT,
  "criadoEm"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "security_audit_logs_empresaId_idx" ON "security_audit_logs"("empresaId");
CREATE INDEX IF NOT EXISTS "security_audit_logs_criadoEm_idx"  ON "security_audit_logs"("criadoEm");

-- Migration: Materiais por obra (v2.5)
CREATE TABLE IF NOT EXISTS "materiais_obra" (
  "id"           TEXT     NOT NULL PRIMARY KEY,
  "empresaId"    TEXT     NOT NULL,
  "obraId"       TEXT     NOT NULL,
  "nome"         TEXT     NOT NULL,
  "quantidade"   DECIMAL  NOT NULL,
  "unidade"      TEXT     NOT NULL DEFAULT 'un',
  "valorUnit"    DECIMAL  NOT NULL,
  "fornecedor"   TEXT,
  "data"         DATETIME,
  "obs"          TEXT,
  "criadoEm"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "materiais_obra_obraId_idx"    ON "materiais_obra"("obraId");
CREATE INDEX IF NOT EXISTS "materiais_obra_empresaId_idx" ON "materiais_obra"("empresaId");

-- Migration: Orçamento detalhado por obra (v2.7)
CREATE TABLE IF NOT EXISTS "orcamento_itens" (
  "id"           TEXT     NOT NULL PRIMARY KEY,
  "empresaId"    TEXT     NOT NULL,
  "obraId"       TEXT     NOT NULL,
  "categoria"    TEXT     NOT NULL DEFAULT 'outros',
  "descricao"    TEXT     NOT NULL,
  "unidade"      TEXT     NOT NULL DEFAULT 'un',
  "quantidade"   DECIMAL  NOT NULL DEFAULT 1,
  "valorUnit"    DECIMAL  NOT NULL DEFAULT 0,
  "ordem"        INTEGER  NOT NULL DEFAULT 0,
  "criadoEm"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "orcamento_itens_obraId_idx"    ON "orcamento_itens"("obraId");
CREATE INDEX IF NOT EXISTS "orcamento_itens_empresaId_idx" ON "orcamento_itens"("empresaId");

-- Migration: Boletim de Medição (v2.7-B)
CREATE TABLE IF NOT EXISTS "bol_servicos" (
  "id"             TEXT     NOT NULL PRIMARY KEY,
  "empresaId"      TEXT     NOT NULL,
  "obraId"         TEXT     NOT NULL,
  "descricao"      TEXT     NOT NULL,
  "unidade"        TEXT     NOT NULL DEFAULT 'un',
  "qtdeContratada" DECIMAL  NOT NULL,
  "valorUnit"      DECIMAL  NOT NULL DEFAULT 0,
  "ordem"          INTEGER  NOT NULL DEFAULT 0,
  "criadoEm"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "bol_servicos_obraId_idx"    ON "bol_servicos"("obraId");
CREATE INDEX IF NOT EXISTS "bol_servicos_empresaId_idx" ON "bol_servicos"("empresaId");

CREATE TABLE IF NOT EXISTS "medicoes" (
  "id"        TEXT     NOT NULL PRIMARY KEY,
  "empresaId" TEXT     NOT NULL,
  "obraId"    TEXT     NOT NULL,
  "numero"    INTEGER  NOT NULL,
  "data"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "obs"       TEXT,
  "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "medicoes_obraId_idx"    ON "medicoes"("obraId");
CREATE INDEX IF NOT EXISTS "medicoes_empresaId_idx" ON "medicoes"("empresaId");

CREATE TABLE IF NOT EXISTS "medicao_linhas" (
  "id"         TEXT     NOT NULL PRIMARY KEY,
  "medicaoId"  TEXT     NOT NULL,
  "servicoId"  TEXT     NOT NULL,
  "qtdeMedida" DECIMAL  NOT NULL,
  "criadoEm"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "medicao_linhas_medicaoId_idx" ON "medicao_linhas"("medicaoId");
CREATE INDEX IF NOT EXISTS "medicao_linhas_servicoId_idx" ON "medicao_linhas"("servicoId");

-- Migration: Quadro Kanban de tarefas por obra (v3.1)
CREATE TABLE IF NOT EXISTS "tarefas_obra" (
  "id"           TEXT     NOT NULL PRIMARY KEY,
  "empresaId"    TEXT     NOT NULL,
  "obraId"       TEXT     NOT NULL,
  "titulo"       TEXT     NOT NULL,
  "categoria"    TEXT,
  "status"       TEXT     NOT NULL DEFAULT 'a_fazer',
  "responsavel"  TEXT,
  "custo"        DECIMAL,
  "ordem"        INTEGER  NOT NULL DEFAULT 0,
  "criadoEm"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "tarefas_obra_obraId_idx"    ON "tarefas_obra"("obraId");
CREATE INDEX IF NOT EXISTS "tarefas_obra_empresaId_idx" ON "tarefas_obra"("empresaId");
