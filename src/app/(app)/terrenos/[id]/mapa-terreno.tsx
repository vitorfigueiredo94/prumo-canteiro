// Mini-mapa por terreno — usa o embed do Google Maps direto pelo endereço em
// texto (sem geocoding, sem lat/lng, sem chave de API). O Google resolve
// endereços brasileiros muito melhor que o Nominatim.

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

  const embedSrc = `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
  const linkSrc = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  return (
    <div>
      <iframe
        title={`Mapa — ${nome}`}
        src={embedSrc}
        width="100%"
        height={280}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        style={{ border: 0, borderRadius: "var(--radius-md)", display: "block", background: "var(--ink-50)" }}
      />
      <a
        href={linkSrc}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, fontSize: 13, color: "var(--navy-700)", fontWeight: 600, textDecoration: "none" }}
      >
        🗺️ Abrir no Google Maps →
      </a>
    </div>
  );
}
