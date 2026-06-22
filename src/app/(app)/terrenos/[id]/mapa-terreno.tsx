// Localização do terreno via Google Maps.
// Por padrão mostra um cartão com botão "Abrir no Google Maps" (abre em nova
// aba — funciona sempre, sem chave de API). Se NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY
// estiver configurada, mostra o mapa embutido (Embed API oficial, gratuita).

export function MapaTerreno({
  endereco,
  cidade,
  cep,
  nome,
}: {
  endereco: string | null;
  cidade: string | null;
  cep: string | null;
  nome: string;
}) {
  const query = [endereco, cidade, cep].filter(Boolean).join(", ") || nome;

  if (!query.trim()) {
    return (
      <div style={{ background: "var(--ink-50)", border: "1px dashed var(--border-default)", borderRadius: "var(--radius-md)", padding: "20px 16px", textAlign: "center", fontSize: 13, color: "var(--fg-tertiary)" }}>
        Sem endereço para localizar. Preencha o <strong>CEP</strong> ou o endereço no botão Editar.
      </div>
    );
  }

  const embedKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY;
  const linkSrc = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  if (embedKey) {
    return (
      <div>
        <iframe
          title={`Mapa — ${nome}`}
          src={`https://www.google.com/maps/embed/v1/place?key=${embedKey}&q=${encodeURIComponent(query)}`}
          width="100%"
          height={280}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          style={{ border: 0, borderRadius: "var(--radius-md)", display: "block", background: "var(--ink-50)" }}
        />
        <a href={linkSrc} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, fontSize: 13, color: "var(--navy-700)", fontWeight: 600, textDecoration: "none" }}>
          🗺️ Abrir no Google Maps →
        </a>
      </div>
    );
  }

  // Cartão de localização (sem chave) — abre o Google Maps em nova aba
  return (
    <a
      href={linkSrc}
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", textDecoration: "none" }}
    >
      <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#e7f0ea", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>📍</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--navy-700)" }}>Abrir no Google Maps →</div>
        <div style={{ fontSize: 13, color: "var(--fg-tertiary)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{query}</div>
      </div>
    </a>
  );
}
