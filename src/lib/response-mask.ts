import type { Role } from "@/lib/rbac";

export function maskCPF(cpf: string | null | undefined): string {
  if (!cpf) return "***.***.***-**";
  return cpf.replace(/(\d{3})\.?(\d{3})\.?(\d{3})-?(\d{2})/, "***.***.***-**");
}

export function maskNome(nome: string | null | undefined): string {
  if (!nome) return "***";
  const parts = nome.trim().split(/\s+/);
  return parts
    .map((p, i) => (i === 0 ? p[0] + "***" : p[0] + "***"))
    .join(" ");
}

export function maskTelefone(tel: string | null | undefined): string {
  if (!tel) return "(**) *****-****";
  return tel.replace(/\d(?=\d{4})/g, "*");
}

export function maskEmail(email: string | null | undefined): string {
  if (!email) return "***@***.***";
  const [local, domain] = email.split("@");
  return `${local[0]}***@${domain}`;
}

// Perfis por role — define quais campos PII são expostos
type MaskProfile = {
  cpf: boolean;
  nome: boolean;
  telefone: boolean;
  email: boolean;
};

const PROFILES: Record<Role, MaskProfile> = {
  admin:      { cpf: false, nome: false, telefone: false, email: false },
  engenheiro: { cpf: true,  nome: false, telefone: false, email: false },
  corretor:   { cpf: true,  nome: false, telefone: false, email: false },
  cliente:    { cpf: true,  nome: true,  telefone: true,  email: true  },
};

export interface PiiFields {
  cpfCnpjComprador?: string | null;
  nomeComprador?: string | null;
  telefoneComprador?: string | null;
  emailComprador?: string | null;
  cpf?: string | null;
  nome?: string | null;
  telefone?: string | null;
  email?: string | null;
}

export function maskPayload<T extends PiiFields>(data: T, role: Role): T {
  const p = PROFILES[role];
  const result = { ...data };

  if (p.cpf) {
    if ("cpfCnpjComprador" in result) result.cpfCnpjComprador = maskCPF(result.cpfCnpjComprador);
    if ("cpf" in result) result.cpf = maskCPF(result.cpf);
  }
  if (p.nome) {
    if ("nomeComprador" in result) result.nomeComprador = maskNome(result.nomeComprador);
    if ("nome" in result) result.nome = maskNome(result.nome);
  }
  if (p.telefone) {
    if ("telefoneComprador" in result) result.telefoneComprador = maskTelefone(result.telefoneComprador);
    if ("telefone" in result) result.telefone = maskTelefone(result.telefone);
  }
  if (p.email) {
    if ("emailComprador" in result) result.emailComprador = maskEmail(result.emailComprador);
    if ("email" in result) result.email = maskEmail(result.email);
  }

  return result;
}

export function maskPayloadArray<T extends PiiFields>(data: T[], role: Role): T[] {
  return data.map((item) => maskPayload(item, role));
}
