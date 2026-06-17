"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { marcarFaturaPaga, gerarFaturasMes, marcarFaturaAtrasada } from "./actions";
import { fmtBRL } from "@/lib/format";

interface Fatura { id: string; empresaId: string; empresaNome: string; competencia: string; valor: number; vencimento: string; status: string; pagaEm: string | null; }

const STATUS_LABEL: Record<string, string> = { paga: "Paga", pendente: "Pendente", atrasada: "Atrasada" };
const STATUS_COLOR: Record<string, string> = { paga: "#22C55E", pendente: "#EAB308", atrasada: "#EF4444" };
const STATUS_BG: Record<string, string>    = { paga: "rgba(34,197,94,0.12)", pendente: "rgba(234,179,8,0.12)", atrasada: "rgba(239,68,68,0.12)" };

const Th = ({ children }: { children: React.ReactNode }) => (
  <th style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" as const, letterSpacing: "0.06em", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.08)", textAlign: "left" as const, whiteSpace: "nowrap" as const }}>{children}</th>
);
const Td = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
  <td style={{ padding: "12px 16px", fontSize: 13.5, color: "#CBD5E1", borderBottom: "1px solid rgba(255,255,255,0.05)", verticalAlign: "middle", textAlign: right ? "right" : "left" as const }}>{children}</td>
);

function fmtComp(c: string) {
  const [y, m] = c.split("-");
  const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  return `${meses[parseInt(m) - 1]} ${y}`;
}

export function CobrancasView({ faturas, competencia, totais }: {
  faturas: Fatura[];
  competencia: string;
  totais: { recebido: number; aReceber: number; emAtraso: number };
}) {
  const router = useRouter();
  const [comp, setComp] = useState(competencia);
  const [pending, start] = useTransition();
  const [gerarMsg, setGerarMsg] = useState("");

  function navComp(c: string) {
    setComp(c);
    router.push(`/superadmin/cobrancas?comp=${c}`);
  }

  function handleGerar() {
    if (!confirm(`Gerar faturas de ${fmtComp(comp)} para todas as empresas com assinatura ativa?`)) return;
    start(async () => {
      const r = await gerarFaturasMes(comp);
      if (r.error) { setGerarMsg(`Erro: ${r.error}`); return; }
      setGerarMsg(r.criadas > 0 ? `✓ ${r.criadas} fatura(s) gerada(s).` : "Nenhuma fatura nova (todas já existem).");
    });
  }

  function handlePagar(id: string) {
    if (!confirm("Confirmar recebimento deste pagamento?")) return;
    start(async () => { await marcarFaturaPaga(id); setGerarMsg(""); });
  }

  function handleAtrasar(id: string) {
    if (!confirm("Marcar como atrasada? Isso vai sinalizar a empresa como inadimplente.")) return;
    start(async () => { await marcarFaturaAtrasada(id); });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, color: "#F1F5F9" }}>Cobranças</h1>
          <p style={{ margin: 0, fontSize: 14, color: "#64748B" }}>Faturas por competência</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            type="month" value={comp}
            onChange={e => navComp(e.target.value)}
            style={{ height: 38, padding: "0 12px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, background: "rgba(255,255,255,0.06)", color: "#F1F5F9", fontFamily: "var(--font-sans)", fontSize: 13.5, outline: "none" }}
          />
          <button onClick={handleGerar} disabled={pending} style={{ padding: "9px 18px", background: "#1e3a5f", color: "#F1F5F9", border: "1px solid #1e3a5f", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            {pending ? "Gerando…" : "Gerar Faturas"}
          </button>
        </div>
      </div>

      {gerarMsg && (
        <p style={{ margin: 0, fontSize: 13.5, color: gerarMsg.startsWith("Erro") ? "#EF4444" : "#22C55E", background: gerarMsg.startsWith("Erro") ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", padding: "10px 16px", borderRadius: 8 }}>{gerarMsg}</p>
      )}

      {/* Totais */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[
          { l: "Recebido",    v: totais.recebido, c: "#22C55E" },
          { l: "A receber",   v: totais.aReceber, c: "#F1F5F9" },
          { l: "Em atraso",   v: totais.emAtraso, c: "#EF4444" },
        ].map(t => (
          <div key={t.l} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "18px 22px" }}>
            <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em" }}>{t.l} em {fmtComp(comp)}</p>
            <p style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 26, color: t.c, fontVariantNumeric: "tabular-nums" }}>{fmtBRL(t.v)}</p>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr><Th>Empresa</Th><Th>Competência</Th><Th>Vencimento</Th><Th>Valor</Th><Th>Status</Th><Th>Pago em</Th><Th>Ações</Th></tr>
            </thead>
            <tbody>
              {faturas.map(f => (
                <tr key={f.id}>
                  <Td><span style={{ fontWeight: 600, color: "#F1F5F9" }}>{f.empresaNome}</span></Td>
                  <Td>{fmtComp(f.competencia)}</Td>
                  <Td>{new Date(f.vencimento).toLocaleDateString("pt-BR")}</Td>
                  <Td right><span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{fmtBRL(f.valor)}</span></Td>
                  <Td>
                    <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_COLOR[f.status] ?? "#64748B", background: STATUS_BG[f.status] ?? "rgba(255,255,255,0.05)", padding: "3px 10px", borderRadius: 20 }}>
                      {STATUS_LABEL[f.status] ?? f.status}
                    </span>
                  </Td>
                  <Td>{f.pagaEm ? new Date(f.pagaEm).toLocaleDateString("pt-BR") : "—"}</Td>
                  <Td>
                    <div style={{ display: "flex", gap: 6 }}>
                      {f.status !== "paga" && (
                        <button disabled={pending} onClick={() => handlePagar(f.id)}
                          style={{ padding: "5px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", borderRadius: 8, border: "1px solid rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.1)", color: "#22C55E" }}>
                          Recebido
                        </button>
                      )}
                      {f.status === "pendente" && (
                        <button disabled={pending} onClick={() => handleAtrasar(f.id)}
                          style={{ padding: "5px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#EF4444" }}>
                          Atrasada
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
              {faturas.length === 0 && (
                <tr><td colSpan={7} style={{ padding: "40px 16px", textAlign: "center", color: "#475569", fontSize: 14 }}>Nenhuma fatura em {fmtComp(comp)}. Use "Gerar Faturas" para criar.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
