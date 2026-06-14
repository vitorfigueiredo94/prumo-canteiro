import { prisma } from "@/lib/prisma";
import path from "path";
import fs from "fs/promises";

const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB (limite Whisper)
const ALLOWED_TYPES = new Set(["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav"]);

export async function transcreverAudio(
  empresaId: string,
  obraId: string,
  file: File
): Promise<{ transcricao: string; diarioId: string }> {
  if (file.size > MAX_SIZE_BYTES) throw new Error("Áudio excede 25 MB.");
  if (!ALLOWED_TYPES.has(file.type) && !file.name.match(/\.(webm|mp4|mp3|ogg|wav)$/i)) {
    throw new Error("Formato de áudio não suportado.");
  }

  const uploadsDir = path.resolve(process.cwd(), "public/uploads/audios");
  await fs.mkdir(uploadsDir, { recursive: true });
  const ext = file.name.split(".").pop() ?? "webm";
  const fileName = `${Date.now()}.${ext}`;
  await fs.writeFile(path.join(uploadsDir, fileName), Buffer.from(await file.arrayBuffer()));
  const audioUrl = `/uploads/audios/${fileName}`;

  let transcricao = "[Transcrição indisponível — configure OPENAI_API_KEY no .env]";

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("model", "whisper-1");
      form.append("language", "pt");

      const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
        signal: AbortSignal.timeout(30_000),
      });

      if (res.ok) {
        const json = (await res.json()) as { text: string };
        transcricao = json.text;
      }
    } catch { /* continua com placeholder */ }
  }

  const registro = await prisma.transcricaoAudio.create({
    data: { empresaId, obraId, audioUrl, transcricao },
  });

  const diario = await prisma.diarioObra.create({
    data: {
      empresaId,
      obraId,
      conteudo: `[Entrada por áudio] ${transcricao}`,
      data: new Date(),
      autor: "Sistema (áudio)",
    },
  });

  await prisma.transcricaoAudio.update({
    where: { id: registro.id },
    data: { diarioId: diario.id },
  });

  return { transcricao, diarioId: diario.id };
}
