"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Download, X, CheckCircle2, AlertCircle, FileSpreadsheet } from "lucide-react";

type Entity = "terrenos" | "vendas" | "compradores";

const CONFIG: Record<Entity, { title: string; description: string; templateName: string }> = {
  terrenos: {
    title: "Importar terrenos",
    description: "Importe múltiplos terrenos de uma planilha Excel. Campos obrigatórios: nome, cidade, área.",
    templateName: "template-terrenos.xlsx",
  },
  vendas: {
    title: "Importar vendas",
    description: "Importe contratos de venda. O terreno deve existir no sistema (pelo nome exato). Campos obrigatórios: nomeTerreno, nomeComprador, valorTotal.",
    templateName: "template-vendas.xlsx",
  },
  compradores: {
    title: "Atualizar dados de compradores",
    description: "Atualize telefone, e-mail e nome dos compradores existentes. O sistema identifica pelo CPF/CNPJ.",
    templateName: "template-compradores.xlsx",
  },
};

interface ImportResult {
  importados: number;
  erros: string[];
}

interface ImportModalProps {
  entity: Entity;
  onClose: () => void;
}

export function ImportModal({ entity, onClose }: ImportModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const cfg = CONFIG[entity];

  async function handleSubmit() {
    if (!file) return;
    setStatus("loading");
    setResult(null);
    setErrorMsg("");

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch(`/api/v1/import/${entity}`, { method: "POST", body: fd });
      const json = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(json.error ?? "Erro ao importar.");
        return;
      }

      setResult(json as ImportResult);
      setStatus("done");
      if (json.importados > 0) router.refresh();
    } catch {
      setStatus("error");
      setErrorMsg("Erro de conexão. Tente novamente.");
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "var(--bg-surface)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg,0 20px 60px rgba(0,0,0,0.2))",
          width: "100%",
          maxWidth: 520,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FileSpreadsheet size={20} style={{ color: "var(--navy-600)" }} />
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, fontFamily: "var(--font-sans)", color: "var(--fg-primary)" }}>
              {cfg.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--fg-muted)", display: "flex", padding: 4, borderRadius: 6 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>
          <p style={{ margin: "0 0 18px", fontSize: 14, color: "var(--fg-tertiary)", lineHeight: 1.5 }}>
            {cfg.description}
          </p>

          {/* Step 1: Download template */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Passo 1 — Baixe o modelo
            </div>
            <a
              href={`/api/v1/import/${entity}`}
              download={cfg.templateName}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                height: 36,
                padding: "0 14px",
                background: "var(--bg-canvas,#f8f9fa)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                color: "var(--fg-secondary)",
                fontSize: 13.5,
                fontWeight: 600,
                textDecoration: "none",
                fontFamily: "var(--font-sans)",
              }}
            >
              <Download size={15} />
              Baixar modelo Excel
            </a>
          </div>

          {/* Step 2: Upload file */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Passo 2 — Selecione o arquivo preenchido
            </div>
            <div
              onClick={() => inputRef.current?.click()}
              style={{
                border: `2px dashed ${file ? "var(--navy-400,#4a6fa5)" : "var(--border-default)"}`,
                borderRadius: "var(--radius-md)",
                padding: "20px 16px",
                textAlign: "center",
                cursor: "pointer",
                background: file ? "var(--navy-50,#f0f4f8)" : "var(--bg-canvas,#f8f9fa)",
                transition: "all 0.15s",
              }}
            >
              <Upload size={24} style={{ color: file ? "var(--navy-600)" : "var(--fg-muted)", marginBottom: 6 }} />
              <div style={{ fontSize: 13.5, color: file ? "var(--navy-700)" : "var(--fg-secondary)", fontWeight: file ? 600 : 400 }}>
                {file ? file.name : "Clique para selecionar (.xlsx)"}
              </div>
              {file && (
                <div style={{ fontSize: 12, color: "var(--fg-tertiary)", marginTop: 4 }}>
                  {(file.size / 1024).toFixed(1)} KB
                </div>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                setStatus("idle");
                setResult(null);
                setErrorMsg("");
              }}
            />
          </div>

          {/* Result */}
          {status === "done" && result && (
            <div style={{ marginBottom: 16, borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border-subtle)" }}>
              <div style={{ padding: "10px 14px", background: result.importados > 0 ? "#dcfce7" : "#fef3c7", display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={16} style={{ color: result.importados > 0 ? "#16a34a" : "#d97706" }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: result.importados > 0 ? "#15803d" : "#b45309" }}>
                  {result.importados} {result.importados === 1 ? "registro importado" : "registros importados"}
                  {result.erros.length > 0 && ` · ${result.erros.length} erro${result.erros.length !== 1 ? "s" : ""}`}
                </span>
              </div>
              {result.erros.length > 0 && (
                <div style={{ maxHeight: 160, overflowY: "auto", padding: "10px 14px", background: "var(--bg-canvas)" }}>
                  {result.erros.map((e, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 7, alignItems: "flex-start", fontSize: 12.5, color: "var(--danger-600,#dc2626)", marginBottom: 4 }}>
                      <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                      {e}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {status === "error" && (
            <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: "var(--radius-md)", background: "#fee2e2", border: "1px solid #fecaca", display: "flex", gap: 8, alignItems: "center" }}>
              <AlertCircle size={15} style={{ color: "#dc2626", flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, color: "#dc2626" }}>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{ height: 38, padding: "0 16px", background: "transparent", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--fg-secondary)", cursor: "pointer" }}
          >
            {status === "done" ? "Fechar" : "Cancelar"}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || status === "loading"}
            style={{
              height: 38,
              padding: "0 18px",
              background: !file || status === "loading" ? "var(--navy-400,#4a6fa5)" : "var(--navy-700)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-md)",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              fontWeight: 600,
              cursor: !file || status === "loading" ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            {status === "loading" ? (
              <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
            ) : (
              <Upload size={15} />
            )}
            {status === "loading" ? "Importando…" : "Importar"}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
