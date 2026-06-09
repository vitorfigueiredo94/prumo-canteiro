"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, User, Phone, Mail, Check, RotateCcw, Printer } from "lucide-react";
import { fmtBRL, fmtDate } from "@/lib/format";
import { registrarPagamentoParcela, estornarParcela } from "../actions";

interface Parcela {
  id: string; numero: number; valor: number; vencimento: string | null; status: string; pagoEm: string | null;
}

interface Venda {
  id: string; nomeComprador: string; cpfCnpjComprador: string | null;
  telefoneComprador: string | null; emailComprador: string | null;
  valorTotal: number; entrada: number; numeroParcelas: number; diaVencimento: number;
  dataContrato: string | null; observacoes: string | null;
  terreno: { id: string; nome: string; cidade: string; numero: string | null };
  parcelas: Parcela[];
}

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  aberta:   { color: "var(--fg-secondary)", bg: "var(--ink-100)" },
  paga:     { color: "var(--success-700)", bg: "var(--success-50)" },
  atrasada: { color: "var(--danger-500)", bg: "var(--danger-50)" },
};

const STATUS_LABELS: Record<string, string> = {
  aberta: "Aberta", paga: "Paga", atrasada: "Atrasada",
};

export function VendaDetail({ venda: v }: { venda: Venda }) {
  const [isPending, startTransition] = useTransition();

  const pago = v.parcelas.filter((p) => p.status === "paga").reduce((s, p) => s + p.valor, 0) + v.entrada;
  const restante = v.valorTotal - pago;
  const pagas = v.parcelas.filter((p) => p.status === "paga").length;
  const pct = v.valorTotal > 0 ? Math.min(Math.round((pago / v.valorTotal) * 100), 100) : 0;

  const handlePagar = (p: Parcela) => startTransition(() => registrarPagamentoParcela(p.id, v.id));
  const handleEstornar = (p: Parcela) => startTransition(() => estornarParcela(p.id, v.id));

  return (
    <div>
      {/* Topbar */}
      <div style={{ padding: "20px 32px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
        <Link href="/vendas" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "var(--fg-tertiary)", textDecoration: "none", marginBottom: 12 }}>
          <ArrowLeft size={14} /> Vendas
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, color: "var(--fg-primary)", letterSpacing: "-0.015em" }}>{v.nomeComprador}</h1>
            <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 13.5, color: "var(--fg-tertiary)", flexWrap: "wrap" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><MapPin size={13} /><Link href={`/terrenos/${v.terreno.id}`} style={{ color: "var(--navy-700)", textDecoration: "none" }}>{v.terreno.nome}</Link> · {v.terreno.cidade}</span>
              {v.cpfCnpjComprador && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><User size={13} />{v.cpfCnpjComprador}</span>}
              {v.telefoneComprador && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Phone size={13} />{v.telefoneComprador}</span>}
              {v.emailComprador && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Mail size={13} />{v.emailComprador}</span>}
            </div>
          </div>
          <button onClick={() => window.print()} style={{ height: 38, padding: "0 14px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", color: "var(--fg-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13.5, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Printer size={14} /> Imprimir extrato
          </button>
        </div>
      </div>

      <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 24 }}>
        {/* KPIs */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {[
            { l: "Valor total", v: fmtBRL(v.valorTotal) },
            { l: "Entrada", v: fmtBRL(v.entrada) },
            { l: "Recebido", v: fmtBRL(pago) },
            { l: "A receber", v: fmtBRL(restante) },
          ].map((k) => (
            <div key={k.l} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "14px 20px", flex: 1, minWidth: 130 }}>
              <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.l}</p>
              <p style={{ margin: 0, fontSize: 22, fontFamily: "var(--font-display)", color: "var(--fg-primary)" }}>{k.v}</p>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "var(--fg-secondary)", marginBottom: 8 }}>
            <span>{pagas}/{v.numeroParcelas} parcelas pagas</span>
            <span style={{ fontWeight: 600 }}>{pct}% quitado</span>
          </div>
          <div style={{ height: 12, borderRadius: "var(--radius-full)", background: "var(--ink-100)", overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: pct >= 100 ? "var(--success-500)" : "var(--navy-700)", borderRadius: "var(--radius-full)", transition: "width 700ms" }} />
          </div>
          {v.dataContrato && <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--fg-muted)" }}>Contrato: {fmtDate(v.dataContrato)} · Vencimento todo dia {v.diaVencimento}</p>}
        </div>

        {/* Parcelas */}
        <div>
          <h2 style={{ margin: "0 0 14px", fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 500, color: "var(--fg-primary)" }}>Extrato de parcelas</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {v.parcelas.map((p) => {
              const s = STATUS_COLORS[p.status] ?? STATUS_COLORS.aberta;
              const atrasada = p.status === "aberta" && p.vencimento && new Date(p.vencimento) < new Date();
              return (
                <div key={p.id} style={{ background: "var(--bg-surface)", border: `1px solid ${atrasada ? "rgba(181,54,60,0.3)" : "var(--border-subtle)"}`, borderRadius: "var(--radius-md)", padding: "12px 18px", display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 40, height: 40, background: "var(--navy-50)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "var(--navy-700)", flexShrink: 0 }}>
                    {p.numero}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: "var(--fg-primary)" }}>{fmtBRL(p.valor)}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 13, color: atrasada ? "var(--danger-500)" : "var(--fg-tertiary)" }}>
                      Venc: {fmtDate(p.vencimento)}{p.pagoEm ? ` · Pago em ${fmtDate(p.pagoEm)}` : ""}{atrasada ? " · ATRASADA" : ""}
                    </p>
                  </div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: "var(--radius-full)", background: s.bg, fontSize: 12, fontWeight: 600, color: s.color, flexShrink: 0 }}>
                    {STATUS_LABELS[p.status] ?? p.status}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {p.status !== "paga" && (
                      <button disabled={isPending} onClick={() => handlePagar(p)} title="Marcar como paga" style={{ width: 32, height: 32, border: "1px solid rgba(47,125,74,0.4)", borderRadius: "var(--radius-md)", background: "var(--success-50)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--success-500)" }}>
                        <Check size={14} />
                      </button>
                    )}
                    {p.status === "paga" && (
                      <button disabled={isPending} onClick={() => handleEstornar(p)} title="Estornar pagamento" style={{ width: 32, height: 32, border: "1px solid rgba(181,54,60,0.3)", borderRadius: "var(--radius-md)", background: "var(--danger-50)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--danger-500)" }}>
                        <RotateCcw size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {v.observacoes && (
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "16px 20px" }}>
            <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 600, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Observações</p>
            <p style={{ margin: 0, fontSize: 14.5, color: "var(--fg-primary)", lineHeight: 1.6 }}>{v.observacoes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
