import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { parseNFeXml, calcularRateio, salvarRateio } from "@/features/financeiro-xml/service";
import { z } from "zod";

const RateioSchema = z.object({
  xml: z.string().min(1, "XML da NF-e obrigatório"),
  notaId: z.string().optional(),
  regras: z
    .array(z.object({ obraId: z.string().min(1), percentual: z.number().min(0.01).max(100) }))
    .min(1, "Pelo menos uma regra de rateio"),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = RateioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const nfe = parseNFeXml(parsed.data.xml);
    const resultado = calcularRateio(nfe.valorTotal, nfe.itens, parsed.data.regras);
    const rateio = await salvarRateio(session.empresaId, nfe, parsed.data.regras, resultado, parsed.data.notaId);
    return NextResponse.json({ rateio, nfe, resultado }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 422 });
  }
}
