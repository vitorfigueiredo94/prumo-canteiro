"use client";

import { useState, useCallback, useActionState, useTransition, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Plus, BookOpen, Trash2, AlertCircle, Check, Search, Printer, Camera } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { criarEntrada, excluirEntrada } from "./actions";
import { fmtDate } from "@/lib/format";
import type { DiarioFormState } from "./actions";

interface ObraLite { id: string; nome: string; }
interface Entrada {
  id: string; data: string | null; conteudo: string; autor: string | null;
  clima: string | null; equipePresente: number | null; fotoUrl: string | null;
  obra: ObraLite;
}

const fs: React.CSSProperties = {
  height: 40, padding: "0 12px", border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)", background: "var(--bg-surface)",
  color: "var(--fg-primary)", fontFamily: "var(--font-sans)", fontSize: 14.5, width: "100%", outline: "none",
};
const lbl = (text: string) => (
  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-secondary)", fontFamily: "var(--font-sans)" }}>{text}</span>
);
const fv = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.target.style.borderColor = "var(--border-focus)"; e.target.style.boxShadow = "var(--shadow-focus)"; };
const fb = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.target.style.borderColor = "var(--border-default)"; e.target.style.boxShadow = "none"; };

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} style={{ height: 40, padding: "0 20px", background: "var(--navy-700)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, cursor: pending ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 7, opacity: pending ? 0.7 : 1 }}>
      {pending ? <span style={{ width: 15, height: 15, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block" }} /> : <Check size={15} />}
      {pending ? "Salvando…" : "Registrar"}
    </button>
  );
}

function NovaEntradaModal({ obras, onClose }: { obras: ObraLite[]; onClose: () => void }) {
  const [state, formAction] = useActionState(async (prev: DiarioFormState, fd: FormData) => {
    const r = await criarEntrada(prev, fd);
    if (!r) onClose();
    return r;
  }, null);
  const [preview, setPreview] = useState<string | null>(null);
  const fotoRef = useRef<HTMLInputElement>(null);

  const obraOpts = obras.map((o) => ({ value: o.id, label: o.nome }));

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setPreview(URL.createObjectURL(f));
    else setPreview(null);
  };

  return (
    <Modal title="Nova entrada no diário" subtitle="Registre o progresso da obra no dia." onClose={onClose}>
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Select label="Obra *" name="obraId" options={obraOpts} placeholder="Selecione a obra" fullWidth required />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>{lbl("Data")}<input name="data" type="date" style={fs} onFocus={fv} onBlur={fb} /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>{lbl("Clima")}<input name="clima" placeholder="Ensolarado" style={fs} onFocus={fv} onBlur={fb} /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>{lbl("Equipe presente")}<input name="equipePresente" type="number" min="0" placeholder="8" style={fs} onFocus={fv} onBlur={fb} /></div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {lbl("Relato do dia *")}
          <textarea name="conteudo" required placeholder="Descreva o que foi realizado hoje…" rows={5} style={{ ...fs, height: "auto", padding: "10px 12px", resize: "vertical" }} onFocus={fv} onBlur={fb} />
        </div>
        {/* Foto */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {lbl("Foto da obra (opcional)")}
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 36, padding: "0 14px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--ink-50)", cursor: "pointer", fontSize: 13.5, color: "var(--fg-secondary)", width: "fit-content" }}>
            <Camera size={15} /> {preview ? "Trocar foto" : "Selecionar foto"}
            <input ref={fotoRef} type="file" name="foto" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: "none" }} onChange={handleFoto} />
          </label>
          {preview && (
            <div style={{ position: "relative", width: "100%", maxHeight: 200, borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border-subtle)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Prévia" style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }} />
              <button type="button" onClick={() => { setPreview(null); if (fotoRef.current) fotoRef.current.value = ""; }} style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>
          )}
        </div>
        {state?.error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--danger-500)", background: "var(--danger-50)", border: "1px solid rgba(181,54,60,0.25)", borderRadius: "var(--radius-md)", padding: "9px 12px" }}>
            <AlertCircle size={15} />{state.error}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 16, borderTop: "1px solid var(--border-subtle)", marginTop: 4 }}>
          <button type="button" onClick={onClose} style={{ height: 40, padding: "0 16px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "transparent", color: "var(--fg-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14 }}>Cancelar</button>
          <SubmitBtn />
        </div>
      </form>
    </Modal>
  );
}

export function DiarioView({ entradas, obras }: { entradas: Entrada[]; obras: ObraLite[] }) {
  const [showNew, setShowNew] = useState(false);
  const [busca, setBusca] = useState("");
  const [obraFiltro, setObraFiltro] = useState("todas");
  const [isPending, startTransition] = useTransition();
  const closeNew = useCallback(() => setShowNew(false), []);

  const filtered = entradas
    .filter((e) => obraFiltro === "todas" || e.obra.id === obraFiltro)
    .filter((e) => !busca.trim() || e.conteudo.toLowerCase().includes(busca.toLowerCase()) || e.obra.nome.toLowerCase().includes(busca.toLowerCase()));

  const handleExcluir = (id: string) => startTransition(() => excluirEntrada(id));

  return (
    <>
      <div style={{ padding: "22px 32px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500, color: "var(--fg-primary)", letterSpacing: "-0.015em" }}>Diário de Obra</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--fg-tertiary)" }}>{entradas.length} {entradas.length === 1 ? "entrada" : "entradas"} registradas</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => window.print()} style={{ height: 40, padding: "0 14px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", color: "var(--fg-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13.5, display: "inline-flex", alignItems: "center", gap: 6 }}><Printer size={14} /> Imprimir</button>
          <button onClick={() => setShowNew(true)} style={{ height: 40, padding: "0 16px", background: "var(--navy-700)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}><Plus size={16} /> Nova entrada</button>
        </div>
      </div>

      <div style={{ padding: "12px 32px", background: "var(--bg-surface)", borderBottom: "1px solid var(--border-subtle)", display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setObraFiltro("todas")} style={{ height: 34, padding: "0 12px", borderRadius: "var(--radius-full)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", border: `1px solid ${obraFiltro === "todas" ? "var(--navy-600)" : "var(--border-default)"}`, background: obraFiltro === "todas" ? "var(--navy-700)" : "var(--bg-surface)", color: obraFiltro === "todas" ? "#fff" : "var(--fg-secondary)" }}>Todas</button>
          {obras.map((o) => (
            <button key={o.id} onClick={() => setObraFiltro(o.id)} style={{ height: 34, padding: "0 12px", borderRadius: "var(--radius-full)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", border: `1px solid ${obraFiltro === o.id ? "var(--navy-600)" : "var(--border-default)"}`, background: obraFiltro === o.id ? "var(--navy-700)" : "var(--bg-surface)", color: obraFiltro === o.id ? "#fff" : "var(--fg-secondary)" }}>{o.nome}</button>
          ))}
        </div>
        <div style={{ position: "relative" }}>
          <Search size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--fg-muted)", pointerEvents: "none" }} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar no diário…" style={{ height: 36, padding: "0 12px 0 34px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", color: "var(--fg-primary)", fontFamily: "var(--font-sans)", fontSize: 14, width: 240, outline: "none" }} onFocus={(e) => { e.target.style.borderColor = "var(--border-focus)"; }} onBlur={(e) => { e.target.style.borderColor = "var(--border-default)"; }} />
        </div>
      </div>

      <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <BookOpen size={40} style={{ color: "var(--fg-muted)", marginBottom: 12 }} />
            <p style={{ color: "var(--fg-tertiary)", fontSize: 15 }}>Nenhuma entrada encontrada.</p>
          </div>
        ) : filtered.map((e) => (
          <div key={e.id} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)", background: "var(--ink-50)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 500, color: "var(--fg-primary)" }}>{fmtDate(e.data)}</span>
                <span style={{ fontSize: 13, color: "var(--navy-700)", fontWeight: 600 }}>{e.obra.nome}</span>
                {e.clima && <span style={{ fontSize: 13, color: "var(--fg-tertiary)" }}>☀ {e.clima}</span>}
                {e.equipePresente != null && <span style={{ fontSize: 13, color: "var(--fg-tertiary)" }}>👷 {e.equipePresente} pessoas</span>}
                {e.autor && <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>por {e.autor}</span>}
              </div>
              <button disabled={isPending} onClick={() => handleExcluir(e.id)} style={{ width: 30, height: 30, border: "1px solid rgba(181,54,60,0.3)", borderRadius: "var(--radius-md)", background: "var(--danger-50)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--danger-500)" }}>
                <Trash2 size={13} />
              </button>
            </div>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ margin: 0, fontSize: 14.5, color: "var(--fg-primary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{e.conteudo}</p>
              {e.fotoUrl && (
                <a href={e.fotoUrl} target="_blank" rel="noreferrer" style={{ display: "block", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border-subtle)", maxWidth: 480 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={e.fotoUrl} alt="Foto da obra" style={{ width: "100%", maxHeight: 300, objectFit: "cover", display: "block" }} />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {showNew && <NovaEntradaModal obras={obras} onClose={closeNew} />}
    </>
  );
}
