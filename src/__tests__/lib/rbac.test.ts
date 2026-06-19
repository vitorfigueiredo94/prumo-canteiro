import { describe, it, expect } from "vitest";
import { checkPermission, assertPermission, parseRole } from "@/lib/rbac";
import type { Role, Resource, Action } from "@/lib/rbac";

describe("checkPermission — admin tem acesso total", () => {
  const resources: Resource[] = [
    "obra_checklist", "terreno_checklist", "venda", "comprador",
    "financeiro", "funcionario", "nota_fiscal", "diario", "assistencia",
  ];
  const actions: Action[] = ["read", "write", "delete"];
  for (const resource of resources) {
    for (const action of actions) {
      it(`admin pode ${action} ${resource}`, () => {
        expect(checkPermission("admin", resource, action)).toBe(true);
      });
    }
  }
});

describe("checkPermission — engenheiro", () => {
  it("pode ler e escrever obra_checklist", () => {
    expect(checkPermission("engenheiro", "obra_checklist", "read")).toBe(true);
    expect(checkPermission("engenheiro", "obra_checklist", "write")).toBe(true);
    expect(checkPermission("engenheiro", "obra_checklist", "delete")).toBe(false);
  });
  it("pode apenas ler terreno_checklist", () => {
    expect(checkPermission("engenheiro", "terreno_checklist", "read")).toBe(true);
    expect(checkPermission("engenheiro", "terreno_checklist", "write")).toBe(false);
  });
  it("pode ler e escrever diário", () => {
    expect(checkPermission("engenheiro", "diario", "read")).toBe(true);
    expect(checkPermission("engenheiro", "diario", "write")).toBe(true);
  });
  it("não pode escrever venda", () => {
    expect(checkPermission("engenheiro", "venda", "write")).toBe(false);
  });
});

describe("checkPermission — corretor", () => {
  it("pode ler e escrever venda", () => {
    expect(checkPermission("corretor", "venda", "read")).toBe(true);
    expect(checkPermission("corretor", "venda", "write")).toBe(true);
    expect(checkPermission("corretor", "venda", "delete")).toBe(false);
  });
  it("pode ler e escrever comprador", () => {
    expect(checkPermission("corretor", "comprador", "read")).toBe(true);
    expect(checkPermission("corretor", "comprador", "write")).toBe(true);
  });
  it("não pode escrever nota_fiscal", () => {
    expect(checkPermission("corretor", "nota_fiscal", "read")).toBe(false);
    expect(checkPermission("corretor", "nota_fiscal", "write")).toBe(false);
  });
  it("não pode escrever funcionario", () => {
    expect(checkPermission("corretor", "funcionario", "read")).toBe(false);
  });
});

describe("checkPermission — cliente", () => {
  it("pode apenas ler venda", () => {
    expect(checkPermission("cliente", "venda", "read")).toBe(true);
    expect(checkPermission("cliente", "venda", "write")).toBe(false);
    expect(checkPermission("cliente", "venda", "delete")).toBe(false);
  });
  it("pode ler e escrever assistência (chamados)", () => {
    expect(checkPermission("cliente", "assistencia", "read")).toBe(true);
    expect(checkPermission("cliente", "assistencia", "write")).toBe(true);
  });
  it("não pode acessar financeiro", () => {
    expect(checkPermission("cliente", "financeiro", "read")).toBe(false);
  });
  it("não pode acessar diário", () => {
    expect(checkPermission("cliente", "diario", "read")).toBe(false);
  });
});

describe("assertPermission", () => {
  it("não lança para permissão válida", () => {
    expect(() => assertPermission("admin", "venda", "delete")).not.toThrow();
  });
  it("lança RBAC_DENIED para permissão inválida", () => {
    expect(() => assertPermission("cliente", "financeiro", "read"))
      .toThrow("RBAC_DENIED");
  });
  it("mensagem inclui role, action e resource", () => {
    expect(() => assertPermission("corretor", "funcionario", "write"))
      .toThrow(/corretor.*write.*funcionario/);
  });
});

describe("parseRole", () => {
  it("retorna role válido", () => {
    expect(parseRole("admin")).toBe("admin");
    expect(parseRole("engenheiro")).toBe("engenheiro");
    expect(parseRole("corretor")).toBe("corretor");
    expect(parseRole("cliente")).toBe("cliente");
  });
  it("retorna 'cliente' para valor inválido", () => {
    expect(parseRole("superadmin")).toBe("cliente");
    expect(parseRole(null)).toBe("cliente");
    expect(parseRole(undefined)).toBe("cliente");
    expect(parseRole("")).toBe("cliente");
  });
});
