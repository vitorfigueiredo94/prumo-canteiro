"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Upload, Trash2, FileText, Image, File, ExternalLink } from "lucide-react";

interface Documento {
  id: string; nome: string; tipo: string; tamanho: number; url: string; criadoEm: string;
}

interface Props {
  ownerType: "obra" | "terreno" | "venda";
  ownerId: string;
}

function fmtSize(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function DocIcon({ tipo }: { tipo: string }) {
  if (tipo.startsWith("image/")) return <Image size={18} style={{ color: "var(--navy-500)", flexShrink: 0 }} />;
  if (tipo === "application/pdf") return <FileText size={18} style={{ color: "var(--danger-500)", flexShrink: 0 }} />;
  return <File size={18} style={{ color: "var(--fg-tertiary)", flexShrink: 0 }} />;
}

export function DocumentosTab({ ownerType, ownerId }: Props) {
  const [docs, setDocs] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/v1/documentos?ownerType=${ownerType}&ownerId=${ownerId}`);
    const json = await res.json();
    setDocs(json.documentos ?? []);
    setLoading(false);
  }, [ownerType, ownerId]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("ownerType", ownerType);
    fd.set("ownerId", ownerId);
    const res = await fetch("/api/v1/documentos", { method: "POST", body: fd });
    if (res.ok) {
      await refresh();
    } else {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Erro ao fazer upload.");
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este documento permanentemente?")) return;
    setDeleting(id);
    await fetch(`/api/v1/documentos/${id}`, { method: "DELETE" });
    await refresh();
    setDeleting(null);
  };

  return (
    <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Upload */}
      <div style={{ border: "2px dashed var(--border-default)", borderRadius: "var(--radius-lg)", background: "var(--ink-50)", padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
        <span style={{ width: 44, height: 44, borderRadius: "var(--radius-lg)", background: "var(--navy-50)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--navy-600)" }}>
          <Upload size={22} />
        </span>
        <div>
          <p style={{ margin: "0 0 2px", fontSize: 14.5, fontWeight: 600, color: "var(--fg-primary)" }}>Adicionar documento</p>
          <p style={{ margin: 0, fontSize: 13, color: "var(--fg-tertiary)" }}>PDF, imagens, Word, Excel · máx. 10 MB</p>
        </div>
        {error && <p style={{ margin: 0, fontSize: 13, color: "var(--danger-500)" }}>{error}</p>}
        <label style={{ height: 36, padding: "0 16px", background: uploading ? "var(--fg-muted)" : "var(--navy-700)", color: "#fff", borderRadius: "var(--radius-md)", fontSize: 13.5, fontWeight: 600, cursor: uploading ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}>
          {uploading ? "Enviando…" : "Selecionar arquivo"}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt,.xml"
            style={{ display: "none" }}
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {/* List */}
      {loading ? (
        <p style={{ fontSize: 14, color: "var(--fg-tertiary)", textAlign: "center", padding: "16px 0" }}>Carregando…</p>
      ) : docs.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--fg-tertiary)", textAlign: "center", padding: "16px 0" }}>Nenhum documento ainda.</p>
      ) : (
        <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          {docs.map((doc, idx) => (
            <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderBottom: idx < docs.length - 1 ? "1px solid var(--border-subtle)" : "none", background: "var(--bg-surface)" }}>
              <DocIcon tipo={doc.tipo} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--fg-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.nome}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--fg-tertiary)" }}>{fmtSize(doc.tamanho)} · {new Date(doc.criadoEm).toLocaleDateString("pt-BR")}</p>
              </div>
              <a href={doc.url} target="_blank" rel="noopener" style={{ height: 30, padding: "0 10px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", color: "var(--fg-secondary)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, textDecoration: "none", background: "var(--bg-surface)", flexShrink: 0 }}>
                <ExternalLink size={13} /> Abrir
              </a>
              <button onClick={() => handleDelete(doc.id)} disabled={deleting === doc.id} style={{ height: 30, padding: "0 10px", border: "1px solid rgba(181,54,60,0.3)", borderRadius: "var(--radius-md)", background: "var(--danger-50)", color: "var(--danger-500)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, flexShrink: 0 }}>
                <Trash2 size={13} /> {deleting === doc.id ? "…" : "Remover"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
