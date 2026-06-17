export type Role = "admin" | "engenheiro" | "corretor" | "cliente";

export type Resource =
  | "obra_checklist"
  | "terreno_checklist"
  | "venda"
  | "comprador"
  | "financeiro"
  | "funcionario"
  | "nota_fiscal"
  | "diario"
  | "assistencia";

export type Action = "read" | "write" | "delete";

type PolicyMatrix = Record<Role, Partial<Record<Resource, Action[]>>>;

const POLICY: PolicyMatrix = {
  admin: {
    obra_checklist:    ["read", "write", "delete"],
    terreno_checklist: ["read", "write", "delete"],
    venda:             ["read", "write", "delete"],
    comprador:         ["read", "write", "delete"],
    financeiro:        ["read", "write", "delete"],
    funcionario:       ["read", "write", "delete"],
    nota_fiscal:       ["read", "write", "delete"],
    diario:            ["read", "write", "delete"],
    assistencia:       ["read", "write", "delete"],
  },
  engenheiro: {
    obra_checklist:    ["read", "write"],
    terreno_checklist: ["read"],
    diario:            ["read", "write"],
    assistencia:       ["read"],
    venda:             ["read"],
    comprador:         ["read"],
    financeiro:        ["read"],
    funcionario:       ["read"],
    nota_fiscal:       ["read"],
  },
  corretor: {
    terreno_checklist: ["read", "write"],
    obra_checklist:    ["read"],
    venda:             ["read", "write"],
    comprador:         ["read", "write"],
    assistencia:       ["read"],
    financeiro:        ["read"],
    funcionario:       [],
    nota_fiscal:       [],
    diario:            ["read"],
  },
  cliente: {
    obra_checklist:    ["read"],
    terreno_checklist: ["read"],
    venda:             ["read"],
    comprador:         ["read"],
    assistencia:       ["read", "write"],
    financeiro:        [],
    funcionario:       [],
    nota_fiscal:       [],
    diario:            [],
  },
};

export function checkPermission(role: Role, resource: Resource, action: Action): boolean {
  return POLICY[role]?.[resource]?.includes(action) ?? false;
}

export function assertPermission(role: Role, resource: Resource, action: Action): void {
  if (!checkPermission(role, resource, action)) {
    throw new Error(`RBAC_DENIED: ${role} cannot ${action} ${resource}`);
  }
}

export function parseRole(raw: string | null | undefined): Role {
  const valid: Role[] = ["admin", "engenheiro", "corretor", "cliente"];
  return valid.includes(raw as Role) ? (raw as Role) : "cliente";
}
