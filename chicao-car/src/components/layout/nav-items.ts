import type * as React from "react";
import {
  BarChart3,
  Banknote,
  Boxes,
  Building2,
  ClipboardList,
  Cog,
  Car,
  LayoutDashboard,
  ReceiptText,
  Settings,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import type { Permission } from "@/lib/permissions";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: Permission;
  children?: { label: string; href: string }[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Painel", href: "/painel", icon: LayoutDashboard, permission: "work_orders:read" },
  { label: "Ordens de Serviço", href: "/ordens", icon: ClipboardList, permission: "work_orders:read" },
  { label: "Clientes", href: "/clientes", icon: Users, permission: "customers:read" },
  { label: "Veículos", href: "/veiculos", icon: Car, permission: "vehicles:read" },
  { label: "Serviços", href: "/servicos", icon: Wrench, permission: "services:read" },
  { label: "Produtos e Peças", href: "/produtos", icon: Boxes, permission: "products:read" },
  { label: "Fornecedores", href: "/fornecedores", icon: Building2, permission: "suppliers:read" },
  {
    label: "Financeiro",
    href: "/financeiro",
    icon: Wallet,
    permission: "financial:read",
    children: [
      { label: "Visão geral", href: "/financeiro" },
      { label: "Receitas", href: "/financeiro/receitas" },
      { label: "Despesas", href: "/financeiro/despesas" },
      { label: "Contas a receber", href: "/financeiro/contas-a-receber" },
      { label: "Contas a pagar", href: "/financeiro/contas-a-pagar" },
      { label: "Fluxo de caixa", href: "/financeiro/fluxo-de-caixa" },
    ],
  },
  { label: "Relatórios", href: "/relatorios", icon: BarChart3, permission: "reports:read" },
  { label: "Usuários", href: "/usuarios", icon: Cog, permission: "users:read" },
  { label: "Configurações", href: "/configuracoes", icon: Settings, permission: "settings:read" },
];

/** Atalhos da home mobile — as ações mais usadas no balcão. */
export const MOBILE_SHORTCUTS = [
  { label: "Nova OS", href: "/ordens/nova", icon: ClipboardList, permission: "work_orders:write" as Permission },
  { label: "OS abertas", href: "/ordens?status=abertas", icon: Wrench, permission: "work_orders:read" as Permission },
  { label: "Buscar placa", href: "/veiculos", icon: Car, permission: "vehicles:read" as Permission },
  { label: "Novo cliente", href: "/clientes?novo=1", icon: Users, permission: "customers:write" as Permission },
  { label: "Receita", href: "/financeiro/receitas?nova=1", icon: Banknote, permission: "financial:write" as Permission },
  { label: "Despesa", href: "/financeiro/despesas?nova=1", icon: ReceiptText, permission: "financial:write" as Permission },
];
