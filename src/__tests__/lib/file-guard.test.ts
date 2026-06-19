import { describe, it, expect } from "vitest";
import { assertFileType, FileTypeError } from "@/lib/file-guard";

function makeFile(bytes: number[], name = "test", mime = "application/octet-stream"): File {
  const buf = new Uint8Array(bytes);
  return new File([buf], name, { type: mime });
}

// Magic bytes
const PDF_MAGIC  = [0x25, 0x50, 0x44, 0x46, 0x2D, 0x31]; // %PDF-1
const XML_MAGIC  = [0x3C, 0x3F, 0x78, 0x6D, 0x6C, 0x20];  // <?xml
const XML_NFE    = [0x3C, 0x4E, 0x46, 0x65];               // <NFe
const JPEG_MAGIC = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10];
const PNG_MAGIC  = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
const GIF_MAGIC  = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];  // GIF89a
const WEBP_MAGIC = [
  0x52, 0x49, 0x46, 0x46,  // RIFF at 0
  0x00, 0x00, 0x00, 0x00,  // size
  0x57, 0x45, 0x42, 0x50,  // WEBP at 8
  0x56, 0x50, 0x38, 0x4C,
];
const UNKNOWN    = [0x00, 0x01, 0x02, 0x03, 0x04, 0x05];

describe("assertFileType — PDF", () => {
  it("aceita arquivo PDF para ['pdf']", async () => {
    const f = makeFile(PDF_MAGIC, "doc.pdf");
    await expect(assertFileType(f, ["pdf"])).resolves.toBeUndefined();
  });

  it("rejeita PDF quando só image é permitida", async () => {
    const f = makeFile(PDF_MAGIC, "doc.pdf");
    await expect(assertFileType(f, ["image"])).rejects.toThrow(FileTypeError);
  });

  it("aceita PDF quando pdf + image são permitidos", async () => {
    const f = makeFile(PDF_MAGIC, "doc.pdf");
    await expect(assertFileType(f, ["pdf", "image"])).resolves.toBeUndefined();
  });
});

describe("assertFileType — XML / NF-e", () => {
  it("aceita XML genérico", async () => {
    const f = makeFile(XML_MAGIC, "nota.xml");
    await expect(assertFileType(f, ["xml"])).resolves.toBeUndefined();
  });

  it("aceita XML de NF-e (<NFe)", async () => {
    const f = makeFile(XML_NFE, "nfe.xml");
    await expect(assertFileType(f, ["xml"])).resolves.toBeUndefined();
  });

  it("rejeita XML quando só pdf é permitido", async () => {
    const f = makeFile(XML_MAGIC, "nota.xml");
    await expect(assertFileType(f, ["pdf"])).rejects.toThrow(FileTypeError);
  });
});

describe("assertFileType — Imagens", () => {
  it("aceita JPEG para ['image']", async () => {
    const f = makeFile(JPEG_MAGIC, "foto.jpg");
    await expect(assertFileType(f, ["image"])).resolves.toBeUndefined();
  });

  it("aceita PNG para ['image']", async () => {
    const f = makeFile(PNG_MAGIC, "foto.png");
    await expect(assertFileType(f, ["image"])).resolves.toBeUndefined();
  });

  it("aceita GIF para ['image']", async () => {
    const f = makeFile(GIF_MAGIC, "anim.gif");
    await expect(assertFileType(f, ["image"])).resolves.toBeUndefined();
  });

  it("aceita WebP para ['image']", async () => {
    const f = makeFile(WEBP_MAGIC, "foto.webp");
    await expect(assertFileType(f, ["image"])).resolves.toBeUndefined();
  });
});

describe("assertFileType — arquivo desconhecido", () => {
  it("rejeita bytes desconhecidos para qualquer tipo", async () => {
    const f = makeFile(UNKNOWN, "malware.bin");
    await expect(assertFileType(f, ["pdf", "xml", "image"])).rejects.toThrow(FileTypeError);
  });

  it("mensagem de erro inclui tipo detectado", async () => {
    const f = makeFile(UNKNOWN, "bad.bin");
    await expect(assertFileType(f, ["pdf"])).rejects.toThrow(/desconhecido|inválido/i);
  });
});

describe("FileTypeError", () => {
  it("tem status 415", () => {
    const e = new FileTypeError("test");
    expect(e.status).toBe(415);
    expect(e.name).toBe("FileTypeError");
  });
});
