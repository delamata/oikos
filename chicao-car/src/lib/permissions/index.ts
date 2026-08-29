import type { UserRole } from "@/types";

/**
 * Permissões por papel. A granularidade é por "recurso:ação" para que novas
 * regras possam ser adicionadas sem mexer nas telas — basta acrescentar a
 * permissão aqui e usar `can()` no componente.
 */
export type Permission =
  | "customers:read"
  | "customers:write"
  | "vehicles:read"
  | "vehicles:write"
  | "suppliers:read"
  | "suppliers:write"
  | "services:read"
  | "services:write"
  | "products:read"
  | "products:write"
  | "inventory:read"
  | "inventory:write"
  | "work_orders:read"
  | "work_orders:write"
  | "work_orders:discount"
  | "work_orders:cancel"
  | "financial:read"
  | "financial:write"
  | "reports:read"
  | "users:read"
  | "users:write"
  | "settings:read"
  | "settings:write"
  | "audit:read";

const ALL: Permission[] = [
  "customers:read", "customers:write",
  "vehicles:read", "vehicles:write",
  "suppliers:read", "suppliers:write",
  "services:read", "services:write",
  "products:read", "products:write",
  "inventory:read", "inventory:write",
  "work_orders:read", "work_orders:write", "work_orders:discount", "work_orders:cancel",
  "financial:read", "financial:write",
  "reports:read",
  "users:read", "users:write",
  "settings:read", "settings:write",
  "audit:read",
];

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: ALL,
  manager: [
    "customers:read", "customers:write",
    "vehicles:read", "vehicles:write",
    "suppliers:read", "suppliers:write",
    "services:read", "services:write",
    "products:read", "products:write",
    "inventory:read", "inventory:write",
    "work_orders:read", "work_orders:write", "work_orders:discount", "work_orders:cancel",
    "financial:read", "financial:write",
    "reports:read",
    "users:read",
    "settings:read",
    "audit:read",
  ],
  mechanic: [
    "customers:read",
    "vehicles:read", "vehicles:write",
    "services:read",
    "products:read",
    "inventory:read",
    "work_orders:read", "work_orders:write",
    "settings:read",
  ],
  financial: [
    "customers:read",
    "vehicles:read",
    "suppliers:read", "suppliers:write",
    "products:read",
    "work_orders:read",
    "financial:read", "financial:write",
    "reports:read",
    "settings:read",
    "audit:read",
  ],
};

export function can(role: UserRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canAny(role: UserRole | null | undefined, permissions: Permission[]): boolean {
  return permissions.some((p) => can(role, p));
}

export function permissionsOf(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role];
}
