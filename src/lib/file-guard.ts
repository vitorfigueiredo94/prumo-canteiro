export class FileTypeError extends Error {
  readonly status = 415;
  constructor(msg: string) {
    super(msg);
    this.name = "FileTypeError";
  }
}

// Magic bytes por tipo de arquivo (primeiros bytes do conteúdo real)
const MAGIC: Record<string, { bytes: number[]; mask?: number[]; offset?: number }[]> = {
  pdf:   [{ bytes: [0x25, 0x50, 0x44, 0x46] }],                    // %PDF
  xml:   [
    { bytes: [0x3C, 0x3F, 0x78, 0x6D, 0x6C] },                     // <?xml
    { bytes: [0xEF, 0xBB, 0xBF, 0x3C, 0x3F] },                     // BOM + <?
    { bytes: [0x3C, 0x4E, 0x46, 0x65] },                            // <NFe
  ],
  jpeg:  [{ bytes: [0xFF, 0xD8, 0xFF] }],
  png:   [{ bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] }],
  gif:   [{ bytes: [0x47, 0x49, 0x46, 0x38] }],                     // GIF8
  webp:  [{ bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },           // RIFF
          { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 }],          // WEBP at byte 8
};

const IMAGE_TYPES = new Set(["jpeg", "png", "gif", "webp"]);

function matchesMagic(
  buf: Uint8Array,
  spec: { bytes: number[]; offset?: number }
): boolean {
  const off = spec.offset ?? 0;
  return spec.bytes.every((b, i) => buf[off + i] === b);
}

function detectType(buf: Uint8Array): string | null {
  for (const [type, specs] of Object.entries(MAGIC)) {
    // webp tem dois specs que devem corresponder juntos
    if (type === "webp") {
      if (matchesMagic(buf, specs[0]) && matchesMagic(buf, specs[1])) return "webp";
      continue;
    }
    if (specs.some((s) => matchesMagic(buf, s))) return type;
  }
  return null;
}

export async function assertFileType(
  file: File,
  allowed: ("pdf" | "xml" | "image")[]
): Promise<void> {
  const allowedTypes = new Set<string>();
  for (const a of allowed) {
    if (a === "image") IMAGE_TYPES.forEach((t) => allowedTypes.add(t));
    else allowedTypes.add(a);
  }

  // Lê apenas os primeiros 16 bytes para detecção
  const slice = file.slice(0, 16);
  const buf = new Uint8Array(await slice.arrayBuffer());

  const detected = detectType(buf);

  if (!detected || !allowedTypes.has(detected)) {
    const label = detected ?? "desconhecido";
    throw new FileTypeError(
      `Tipo de arquivo inválido (detectado: ${label}). Permitidos: ${[...allowed].join(", ")}.`
    );
  }
}
