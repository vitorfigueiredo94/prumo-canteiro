import { describe, it, expect } from "vitest";
import {
  maskCPF, maskNome, maskTelefone, maskEmail,
  maskPayload, maskPayloadArray,
} from "@/lib/response-mask";

const PAYLOAD = {
  cpfCnpjComprador: "123.456.789-00",
  nomeComprador: "João Silva Santos",
  telefoneComprador: "(11) 91234-5678",
  emailComprador: "joao@empresa.com.br",
};

describe("maskCPF", () => {
  it("mascara CPF com pontuação", () => {
    expect(maskCPF("123.456.789-00")).toBe("***.***.***-**");
  });
  it("mascara CPF sem pontuação", () => {
    expect(maskCPF("12345678900")).toBe("***.***.***-**");
  });
  it("retorna placeholder para null", () => {
    expect(maskCPF(null)).toBe("***.***.***-**");
  });
  it("retorna placeholder para undefined", () => {
    expect(maskCPF(undefined)).toBe("***.***.***-**");
  });
});

describe("maskNome", () => {
  it("mascara cada palavra mantendo primeira letra", () => {
    const r = maskNome("João Silva");
    expect(r).toContain("J***");
    expect(r).toContain("S***");
    expect(r).not.toContain("oão");
    expect(r).not.toContain("ilva");
  });
  it("funciona com nome único", () => {
    expect(maskNome("Maria")).toContain("M***");
  });
  it("retorna placeholder para null", () => {
    expect(maskNome(null)).toBe("***");
  });
});

describe("maskTelefone", () => {
  it("mascara dígitos exceto os 4 últimos", () => {
    const r = maskTelefone("(11) 91234-5678");
    expect(r).toContain("5678");
    expect(r).not.toContain("91234");
  });
  it("retorna placeholder para null", () => {
    expect(maskTelefone(null)).toBe("(**) *****-****");
  });
});

describe("maskEmail", () => {
  it("oculta local exceto primeira letra", () => {
    const r = maskEmail("joao@empresa.com.br");
    expect(r).toMatch(/^j\*\*\*@empresa\.com\.br$/);
  });
  it("preserva domínio completo", () => {
    const r = maskEmail("x@gmail.com");
    expect(r).toContain("@gmail.com");
  });
  it("retorna placeholder para null", () => {
    expect(maskEmail(null)).toBe("***@***.***");
  });
});

describe("maskPayload — admin (sem máscara)", () => {
  it("não altera nenhum campo", () => {
    const result = maskPayload(PAYLOAD, "admin");
    expect(result.cpfCnpjComprador).toBe("123.456.789-00");
    expect(result.nomeComprador).toBe("João Silva Santos");
    expect(result.telefoneComprador).toBe("(11) 91234-5678");
    expect(result.emailComprador).toBe("joao@empresa.com.br");
  });
});

describe("maskPayload — engenheiro (CPF mascarado)", () => {
  it("mascara CPF mas mantém nome/tel/email", () => {
    const result = maskPayload(PAYLOAD, "engenheiro");
    expect(result.cpfCnpjComprador).toBe("***.***.***-**");
    expect(result.nomeComprador).toBe("João Silva Santos");
    expect(result.telefoneComprador).toBe("(11) 91234-5678");
    expect(result.emailComprador).toBe("joao@empresa.com.br");
  });
});

describe("maskPayload — corretor (CPF mascarado)", () => {
  it("mascara CPF mas mantém nome/tel/email", () => {
    const result = maskPayload(PAYLOAD, "corretor");
    expect(result.cpfCnpjComprador).toBe("***.***.***-**");
    expect(result.nomeComprador).toBe("João Silva Santos");
  });
});

describe("maskPayload — cliente (todos mascarados)", () => {
  it("mascara CPF, nome, telefone e email", () => {
    const result = maskPayload(PAYLOAD, "cliente");
    expect(result.cpfCnpjComprador).toBe("***.***.***-**");
    expect(result.nomeComprador).not.toBe("João Silva Santos");
    expect(result.telefoneComprador).not.toBe("(11) 91234-5678");
    expect(result.emailComprador).not.toBe("joao@empresa.com.br");
  });
  it("email mascarado mantém domínio", () => {
    const result = maskPayload(PAYLOAD, "cliente");
    expect(result.emailComprador).toContain("@empresa.com.br");
  });
});

describe("maskPayloadArray", () => {
  it("mascara todos os itens do array", () => {
    const arr = [PAYLOAD, PAYLOAD];
    const result = maskPayloadArray(arr, "cliente");
    expect(result).toHaveLength(2);
    result.forEach((r) => {
      expect(r.cpfCnpjComprador).toBe("***.***.***-**");
    });
  });
  it("não muta o array original", () => {
    const arr = [{ ...PAYLOAD }];
    maskPayloadArray(arr, "cliente");
    expect(arr[0].cpfCnpjComprador).toBe("123.456.789-00");
  });
});
