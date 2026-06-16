"use client";

import { useState, useActionState, useTransition } from "react";
import { Plus, FileText, CheckCircle, XCircle, Clock, AlertTriangle, Wrench, ExternalLink, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { fmtDate } from "@/lib/format";
import {
  criarChamado, gerarParecer, atualizarStatusChamado,
  excluirChamado, inicializarGarantiasPadrao, criarComponente,
  type AssistenciaFormState,
} from "./actions";
import { useFormStatus } from "react-dom";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Chamado {
  id: string; vendaId: string; componenteId: string;
  descricao: string; status: string; parecerStatus: string | null;
  parecerTexto: string | null; parecerGeradoEm: string | null;
  dataEntregaChaves: string | null; criadoEm: string;
  nomeComprador: string; nomeComponente: string;
}
interface Componente { id: string; codigo: string; nome: string; prazoLegalMeses: number; prazoContratMeses: number; baseLegal: string | null; }
interface VendaLite  { id: string; nomeComprador: string; }

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  aberto:      { label: "Aberto",      color: "#0369a1", bg: "#e0f2fe", Icon: Clock },
  em_analise:  { label: "Em análise",  color: "#b45309", bg: "#fef3c7", Icon: AlertTriangle },
  aceito:      { label: "Aceito",      color: "#047857", bg: "#d1fae5", Icon: CheckCircle },
  negado:      { label: "Negado",      color: "#b91c1c", bg: "#fee2e2", Icon: XCircle },
  resolvido:   { label: "Resolvido",   color: "#6d28d9", bg: "#ede9fe", Icon: CheckCircle },
};

const PARECER_LABEL: Record<string, string> = {
  no_prazo:           "✅ Dentro da garantia legal",
  somente_contratual: "⚠️ Só garantia contratual",
  fora_garantia:      "❌ Fora de garantia",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} style={{ height: 40, padding: "0 20px", background: "var(--navy-700)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, cursor: pending ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 7, opacity: pending ? 0.7 : 1 }}>
      {pending ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
      {pending ? "Salvando…" : label}
    </button>
  );
}

const fs: React.CSSProperties = { height: 40, padding: "0 12px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", color: "var(--fg-primary)", fontFamily: "var(--font-sans)", fontSize: 14.5, width: "100%", outline: "none" };
const lbl = (t: string) => <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-secondary)", fontFamily: "var(--font-sans)" }}>{t}</span>;
const fv = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { (e.target as HTMLElement).style.borderColor = "var(--border-focus)"; (e.target as HTMLElement).style.boxShadow = "var(--shadow-focus)"; };
const fb = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { (e.target as HTMLElement).style.borderColor = "var(--border-default)"; (e.target as HTMLElement).style.boxShadow = "none"; };

// ─── Main View ────────────────────────────────────────────────────────────────

export function AssistenciaView({ chamados, componentes, vendas }: {
  chamados: Chamado[]; componentes: Componente[]; vendas: VendaLite[];
}) {
  const [tab, setTab] = useState<"chamados" | "garantias">("chamados");
  const [showNovoChamado, setShowNovoChamado] = useState(false);
  const [showNovoComp, setShowNovoComp]       = useState(false);
  const [parecerModal, setParecerModal]       = useState<Chamado | null>(null);
  const [filtroStatus, setFiltroStatus]       = useState("todos");
  const [isPending, startTransition]          = useTransition();
  const [gerandoId, setGerandoId]             = useState<string | null>(null);
  const [erroGerar, setErroGerar]             = useState<string | null>(null);
  const [msgInit, setMsgInit]                 = useState<string | null>(null);

  const [stateChamado, actionChamado] = useActionState(
    async (prev: AssistenciaFormState, fd: FormData) => {
      const r = await criarChamado(prev, fd);
      if (!r) setShowNovoChamado(false);
      return r;
    }, null
  );

  const [stateComp, actionComp] = useActionState(
    async (prev: AssistenciaFormState, fd: FormData) => {
      const r = await criarComponente(prev, fd);
      if (!r) setShowNovoComp(false);
      return r;
    }, null
  );

  // Computed
  const filtrados = filtroStatus === "todos" ? chamados : chamados.filter(c => c.status === filtroStatus);
  const kpis = [
    { label: "Total de chamados",  value: String(chamados.length),                       sub: "todos os períodos",        tone: "" },
    { label: "Em aberto",         value: String(chamados.filter(c=>c.status==="aberto").length), sub: "aguardando análise", tone: "" },
    { label: "Aceitos",           value: String(chamados.filter(c=>c.status==="aceito").length), sub: "dentro da garantia",  tone: "success" },
    { label: "Negados",           value: String(chamados.filter(c=>c.status==="negado").length), sub: "fora da garantia",    tone: chamados.some(c=>c.status==="negado") ? "danger" : "" },
  ];

  const cardStyle: React.CSSProperties = { background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xs)" };

  function handleGerarParecer(chamado: Chamado) {
    setGerandoId(chamado.id);
    setErroGerar(null);
    startTransition(async () => {
      const r = await gerarParecer(chamado.id);
      setGerandoId(null);
      if (r.error) setErroGerar(r.error);
    });
  }

  function handleInicializar() {
    startTransition(async () => {
      const r = await inicializarGarantiasPadrao();
      setMsgInit(`✅ ${r.criados} componente(s) padrão inicializados com sucesso.`);
    });
  }

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "22px 32px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500, color: "var(--fg-primary)", letterSpacing: "-0.015em" }}>Assistência Técnica</h1>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--fg-tertiary)" }}>Chamados pós-obra, garantias legais e pareceres jurídicos automáticos</p>
          </div>
          <button onClick={() => setShowNovoChamado(true)} style={{ height: 40, padding: "0 16px", background: "var(--navy-700)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}>
            <Plus size={15} /> Novo Chamado
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginTop: 18, marginBottom: -23, borderBottom: "1px solid var(--border-subtle)" }}>
          {([["chamados", "Chamados"], ["garantias", "Configurar Garantias"]] as const).map(([k, l]) => {
            const on = tab === k;
            return <button key={k} onClick={() => setTab(k)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 16px", background: "transparent", border: "none", borderBottom: `2px solid ${on ? "var(--navy-700)" : "transparent"}`, color: on ? "var(--fg-primary)" : "var(--fg-tertiary)", fontSize: 14.5, fontWeight: on ? 700 : 500, cursor: "pointer", fontFamily: "var(--font-sans)", marginBottom: -1 }}>{l}</button>;
          })}
        </div>
      </div>

      <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── Tab: Chamados ── */}
        {tab === "chamados" && (
          <>
            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 14 }}>
              {kpis.map(({ label, value, sub, tone }) => {
                const c = tone === "danger" ? "var(--danger-500)" : tone === "success" ? "var(--success-700)" : "var(--fg-primary)";
                return (
                  <div key={label} style={cardStyle}>
                    <div style={{ padding: "16px 20px" }}>
                      <div style={{ fontSize: 11.5, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>{label}</div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 400, color: c, letterSpacing: "-0.02em" }}>{value}</div>
                      <div style={{ fontSize: 12.5, color: "var(--fg-tertiary)", marginTop: 3 }}>{sub}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Filtro de status */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[["todos", "Todos"], ["aberto", "Aberto"], ["em_analise", "Em análise"], ["aceito", "Aceito"], ["negado", "Negado"], ["resolvido", "Resolvido"]].map(([k, l]) => (
                <button key={k} onClick={() => setFiltroStatus(k)} style={{ height: 32, padding: "0 14px", borderRadius: "var(--radius-full)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", border: `1px solid ${filtroStatus === k ? "var(--navy-600)" : "var(--border-default)"}`, background: filtroStatus === k ? "var(--navy-700)" : "var(--bg-surface)", color: filtroStatus === k ? "#fff" : "var(--fg-secondary)" }}>{l}</button>
              ))}
            </div>

            {erroGerar && (
              <div style={{ background: "var(--danger-50)", border: "1px solid rgba(185,28,28,0.25)", borderRadius: "var(--radius-md)", padding: "10px 14px", fontSize: 13.5, color: "var(--danger-600)" }}>{erroGerar}</div>
            )}

            {/* Tabela */}
            <div style={{ ...cardStyle, overflow: "hidden" }}>
              {filtrados.length === 0 ? (
                <div style={{ padding: "48px 24px", textAlign: "center" }}>
                  <Wrench size={32} style={{ color: "var(--fg-muted)", marginBottom: 10 }} />
                  <p style={{ margin: 0, fontSize: 15, color: "var(--fg-tertiary)" }}>Nenhum chamado encontrado.</p>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--fg-muted)" }}>Clique em "Novo Chamado" para registrar.</p>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-muted)" }}>
                      {["Comprador", "Componente", "Abertura", "Garantia", "Status", "Ações"].map(h => (
                        <th key={h} style={{ padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left", whiteSpace: "nowrap", borderBottom: "1px solid var(--border-subtle)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((c, i) => {
                      const st = STATUS_CFG[c.status] ?? STATUS_CFG.aberto;
                      const Icon = st.Icon;
                      const isGerando = gerandoId === c.id;
                      return (
                        <tr key={c.id} style={{ borderBottom: i < filtrados.length-1 ? "1px solid var(--border-subtle)" : "none" }}>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ fontWeight: 600, color: "var(--fg-primary)", fontSize: 14 }}>{c.nomeComprador}</div>
                            <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.descricao}</div>
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: 13.5, color: "var(--fg-secondary)", whiteSpace: "nowrap" }}>{c.nomeComponente}</td>
                          <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--fg-tertiary)", whiteSpace: "nowrap" }}>{fmtDate(c.criadoEm)}</td>
                          <td style={{ padding: "12px 16px" }}>
                            {c.parecerStatus ? (
                              <span style={{ fontSize: 12.5, color: "var(--fg-secondary)" }}>{PARECER_LABEL[c.parecerStatus]}</span>
                            ) : (
                              <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>Não calculado</span>
                            )}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: "var(--radius-full)", background: st.bg, color: st.color, fontSize: 12, fontWeight: 600 }}>
                              <Icon size={12} />{st.label}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", gap: 6, flexWrap: "nowrap" }}>
                              <button
                                onClick={() => handleGerarParecer(c)}
                                disabled={isGerando || isPending}
                                title="Gerar parecer jurídico via IA"
                                style={{ height: 32, padding: "0 10px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", color: "var(--fg-secondary)", cursor: isGerando ? "not-allowed" : "pointer", fontFamily: "var(--font-sans)", fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 5, opacity: isGerando ? 0.6 : 1 }}
                              >
                                {isGerando ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <FileText size={12} />}
                                {isGerando ? "Gerando…" : "Parecer IA"}
                              </button>
                              {c.parecerTexto && (
                                <button onClick={() => setParecerModal(c)} style={{ height: 32, padding: "0 10px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", color: "var(--navy-700)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 5 }}>
                                  <FileText size={12} /> Ver
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ── Tab: Garantias ── */}
        {tab === "garantias" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <p style={{ margin: 0, fontSize: 14, color: "var(--fg-tertiary)" }}>
                Componentes e prazos de garantia (Código Civil · CDC · NBR 15575)
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleInicializar} disabled={isPending} style={{ height: 38, padding: "0 14px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", color: "var(--fg-secondary)", cursor: isPending ? "not-allowed" : "pointer", fontFamily: "var(--font-sans)", fontSize: 13.5, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {isPending ? <Loader2 size={13} /> : <Wrench size={13} />} Inicializar padrões NBR/CDC
                </button>
                <button onClick={() => setShowNovoComp(true)} style={{ height: 38, padding: "0 14px", background: "var(--navy-700)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Plus size={13} /> Novo Componente
                </button>
              </div>
            </div>

            {msgInit && (
              <div style={{ background: "var(--success-50)", border: "1px solid var(--success-200,#a7f3d0)", borderRadius: "var(--radius-md)", padding: "10px 14px", fontSize: 13.5, color: "var(--success-700)" }}>{msgInit}</div>
            )}

            <div style={{ ...cardStyle, overflow: "hidden" }}>
              {componentes.length === 0 ? (
                <div style={{ padding: "40px 24px", textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: 15, color: "var(--fg-tertiary)" }}>Nenhum componente cadastrado.</p>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--fg-muted)" }}>Clique em "Inicializar padrões" para carregar os 11 componentes da NBR 15575 / CDC.</p>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-muted)" }}>
                      {["Componente", "Base Legal", "Prazo Legal", "Prazo Contratual", "Marco"].map(h => (
                        <th key={h} style={{ padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left", borderBottom: "1px solid var(--border-subtle)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {componentes.map((c, i) => (
                      <tr key={c.id} style={{ borderBottom: i < componentes.length-1 ? "1px solid var(--border-subtle)" : "none" }}>
                        <td style={{ padding: "11px 16px" }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: "var(--fg-primary)" }}>{c.nome}</div>
                          <div style={{ fontSize: 11.5, color: "var(--fg-muted)", marginTop: 1 }}>{c.codigo}</div>
                        </td>
                        <td style={{ padding: "11px 16px", fontSize: 13, color: "var(--fg-secondary)" }}>{c.baseLegal ?? "—"}</td>
                        <td style={{ padding: "11px 16px" }}>
                          <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "var(--radius-full)", background: "var(--success-50,#d1fae5)", color: "var(--success-700)", fontSize: 12.5, fontWeight: 600 }}>{c.prazoLegalMeses} meses</span>
                        </td>
                        <td style={{ padding: "11px 16px" }}>
                          <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "var(--radius-full)", background: "#ede9fe", color: "#6d28d9", fontSize: 12.5, fontWeight: 600 }}>{c.prazoContratMeses} meses</span>
                        </td>
                        <td style={{ padding: "11px 16px", fontSize: 13, color: "var(--fg-tertiary)" }}>
                          {c.codigo === "entrega_chaves" ? "Entrega das chaves" : "Entrega das chaves"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Modal Novo Chamado ── */}
      {showNovoChamado && (
        <Modal title="Novo Chamado de Assistência" subtitle="Registre o defeito e calcule automaticamente a garantia." onClose={() => setShowNovoChamado(false)}
          footer={<><button type="button" onClick={() => setShowNovoChamado(false)} style={{ height: 40, padding: "0 16px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "transparent", color: "var(--fg-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14 }}>Cancelar</button><SubmitBtn label="Abrir chamado" /></>}
        >
          <form action={actionChamado} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {lbl("Comprador / Venda *")}
              <select name="vendaId" required style={fs} onFocus={fv} onBlur={fb}>
                <option value="">Selecione</option>
                {vendas.map(v => <option key={v.id} value={v.id}>{v.nomeComprador}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {lbl("Componente / Sistema *")}
              <select name="componenteId" required style={fs} onFocus={fv} onBlur={fb}>
                <option value="">Selecione</option>
                {componentes.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.prazoLegalMeses}m legal)</option>)}
              </select>
              {componentes.length === 0 && <span style={{ fontSize: 12, color: "var(--danger-500)" }}>Inicialize os componentes na aba "Configurar Garantias".</span>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {lbl("Data de entrega das chaves *")}
              <input name="dataEntregaChaves" type="date" required style={fs} onFocus={fv} onBlur={fb} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {lbl("Descrição do defeito *")}
              <textarea name="descricao" required rows={4} placeholder="Descreva o defeito observado pelo comprador..." style={{ ...fs, height: "auto", padding: "10px 12px", resize: "vertical" }} onFocus={fv} onBlur={fb} />
            </div>
            {stateChamado?.error && <div style={{ fontSize: 13, color: "var(--danger-500)", background: "var(--danger-50)", border: "1px solid rgba(185,28,28,0.2)", borderRadius: "var(--radius-md)", padding: "8px 12px" }}>{stateChamado.error}</div>}
          </form>
        </Modal>
      )}

      {/* ── Modal Novo Componente ── */}
      {showNovoComp && (
        <Modal title="Novo Componente de Garantia" subtitle="Defina o prazo legal e contratual." onClose={() => setShowNovoComp(false)}
          footer={<><button type="button" onClick={() => setShowNovoComp(false)} style={{ height: 40, padding: "0 16px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "transparent", color: "var(--fg-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14 }}>Cancelar</button><SubmitBtn label="Salvar" /></>}
        >
          <form action={actionComp} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {lbl("Código *")} <input name="codigo" placeholder="ex: fachada" style={fs} onFocus={fv} onBlur={fb} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {lbl("Base legal")} <input name="baseLegal" placeholder="CC art. 618" style={fs} onFocus={fv} onBlur={fb} />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {lbl("Nome *")} <input name="nome" placeholder="Ex: Revestimento de Fachada" required style={fs} onFocus={fv} onBlur={fb} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {lbl("Prazo legal (meses) *")} <input name="prazoLegalMeses" type="number" min="1" defaultValue="12" required style={fs} onFocus={fv} onBlur={fb} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {lbl("Prazo contratual (meses) *")} <input name="prazoContratMeses" type="number" min="1" defaultValue="24" required style={fs} onFocus={fv} onBlur={fb} />
              </div>
            </div>
            {stateComp?.error && <div style={{ fontSize: 13, color: "var(--danger-500)", background: "var(--danger-50)", border: "1px solid rgba(185,28,28,0.2)", borderRadius: "var(--radius-md)", padding: "8px 12px" }}>{stateComp.error}</div>}
          </form>
        </Modal>
      )}

      {/* ── Modal Parecer ── */}
      {parecerModal && (
        <Modal title="Parecer Técnico-Jurídico" subtitle={`Chamado — ${parecerModal.nomeComprador} / ${parecerModal.nomeComponente}`} onClose={() => setParecerModal(null)}
          footer={<button onClick={() => setParecerModal(null)} style={{ height: 40, padding: "0 20px", background: "var(--navy-700)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Fechar</button>}
        >
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              {parecerModal.parecerStatus && (
                <span style={{ padding: "4px 12px", borderRadius: "var(--radius-full)", background: parecerModal.parecerStatus === "no_prazo" ? "#d1fae5" : parecerModal.parecerStatus === "somente_contratual" ? "#fef3c7" : "#fee2e2", color: parecerModal.parecerStatus === "no_prazo" ? "#047857" : parecerModal.parecerStatus === "somente_contratual" ? "#b45309" : "#b91c1c", fontSize: 12.5, fontWeight: 600 }}>
                  {PARECER_LABEL[parecerModal.parecerStatus]}
                </span>
              )}
              <span style={{ fontSize: 12, color: "var(--fg-muted)", alignSelf: "center" }}>
                Gerado em {fmtDate(parecerModal.parecerGeradoEm)}
              </span>
            </div>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "var(--font-sans)", fontSize: 13.5, lineHeight: 1.7, color: "var(--fg-primary)", background: "var(--bg-muted)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "16px 18px", margin: 0, maxHeight: 400, overflowY: "auto" }}>
              {parecerModal.parecerTexto}
            </pre>
            <a href={`/api/cobranca/notificacao/${parecerModal.vendaId}`} target="_blank" rel="noopener" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 14, fontSize: 13, color: "var(--navy-700)", fontWeight: 600, textDecoration: "none" }}>
              <ExternalLink size={13} /> Notificação extrajudicial (PDF)
            </a>
          </div>
        </Modal>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
