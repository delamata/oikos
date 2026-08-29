"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/lib/auth/provider";
import { useData } from "@/lib/data/provider";
import { can } from "@/lib/permissions";
import { USER_ROLE } from "@/lib/constants";
import { initials } from "@/lib/utils/format";
import { Logo } from "./logo";
import { NAV_ITEMS } from "./nav-items";
import { GlobalSearch } from "./global-search";
import { AlertsMenu } from "./alerts-menu";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";

const COLLAPSE_KEY = "chicaocar.sidebar.collapsed";

const BOTTOM_NAV = [
  { label: "Painel", href: "/painel", icon: LayoutDashboard },
  { label: "OS", href: "/ordens", icon: ClipboardList },
  { label: "Clientes", href: "/clientes", icon: Users },
  { label: "Financeiro", href: "/financeiro", icon: Wallet },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const { settings, mode } = useData();

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileSearch, setMobileSearch] = React.useState(false);

  React.useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  React.useEffect(() => {
    setDrawerOpen(false);
    setMobileSearch(false);
  }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((value) => {
      window.localStorage.setItem(COLLAPSE_KEY, value ? "0" : "1");
      return !value;
    });
  }

  const items = NAV_ITEMS.filter((item) => can(profile?.role, item.permission));

  const nav = (compact: boolean) => (
    <nav className="flex-1 space-y-0.5 overflow-y-auto py-2" data-app-nav>
      {items.map((item) => {
        const active =
          item.href === "/painel"
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <div key={item.href}>
            <Link
              href={item.href}
              title={compact ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                compact && "justify-center px-0",
                active
                  ? "bg-amber-brand/10 text-amber-brand"
                  : "text-fog-300 hover:bg-ink-800 hover:text-fog-100",
              )}
            >
              <Icon className="size-[18px] shrink-0" />
              {!compact ? <span className="truncate">{item.label}</span> : null}
            </Link>
            {!compact && item.children && active ? (
              <div className="mt-0.5 mb-1 ml-[26px] space-y-0.5 border-l border-ink-700 pl-3">
                {item.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={cn(
                      "block rounded-lg px-2.5 py-1.5 text-[13px] transition-colors",
                      pathname === child.href
                        ? "text-amber-brand"
                        : "text-fog-400 hover:text-fog-100",
                    )}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-dvh bg-ink-950">
      {/* ---------- Sidebar (desktop) ---------- */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-ink-700 bg-ink-900 px-3 py-4 transition-[width] lg:flex",
          collapsed ? "w-[76px]" : "w-[260px]",
        )}
      >
        <div className={cn("mb-3 px-1", collapsed && "flex justify-center px-0")}>
          <Link href="/painel">
            <Logo name={settings.company_name} compact={collapsed} />
          </Link>
        </div>

        {nav(collapsed)}

        <div className="mt-2 space-y-2 border-t border-ink-700 pt-3">
          {!collapsed ? (
            <p className="px-3 text-[11px] leading-relaxed text-fog-400">
              {mode === "local"
                ? "Modo demonstração — dados salvos neste navegador."
                : "Conectado ao Supabase."}
            </p>
          ) : null}
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-ink-700 py-2 text-xs font-medium text-fog-400 transition-colors hover:text-fog-100"
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
            {!collapsed ? "Recolher menu" : null}
          </button>
        </div>
      </aside>

      {/* ---------- Drawer (mobile) ---------- */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative flex h-full w-[82vw] max-w-[300px] flex-col border-r border-ink-700 bg-ink-900 px-3 py-4 animate-fade-in">
            <div className="mb-3 flex items-center justify-between px-1">
              <Logo name={settings.company_name} />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-2 text-fog-400 hover:bg-ink-800 hover:text-fog-100"
              >
                <X className="size-5" />
              </button>
            </div>
            {nav(false)}
            <button
              type="button"
              onClick={() => void signOut().then(() => router.push("/login"))}
              className="mt-2 flex items-center gap-3 rounded-xl border border-ink-700 px-3 py-3 text-sm text-fog-300"
            >
              <LogOut className="size-4" /> Sair
            </button>
          </div>
        </div>
      ) : null}

      {/* ---------- Conteúdo ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          data-app-header
          className="sticky top-0 z-30 border-b border-ink-700 bg-ink-950/90 backdrop-blur"
        >
          <div className="flex items-center gap-2 px-3 py-2.5 sm:px-5">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-ink-700 bg-ink-850 text-fog-300 lg:hidden"
            >
              <Menu className="size-5" />
              <span className="sr-only">Abrir menu</span>
            </button>

            <Link href="/painel" className="lg:hidden">
              <Logo name={settings.company_name} compact />
            </Link>

            <GlobalSearch className="hidden max-w-xl flex-1 md:block" />

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileSearch((v) => !v)}
                className="grid size-10 place-items-center rounded-xl border border-ink-700 bg-ink-850 text-fog-300 md:hidden"
              >
                <Search className="size-4" />
                <span className="sr-only">Buscar</span>
              </button>
              <AlertsMenu />
              <Dropdown>
                <DropdownTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-850 py-1.5 pr-2.5 pl-1.5 transition-colors hover:border-ink-600"
                  >
                    <span className="grid size-7 place-items-center rounded-lg bg-amber-brand/15 text-xs font-bold text-amber-brand">
                      {initials(profile?.name ?? "?")}
                    </span>
                    <span className="hidden text-left sm:block">
                      <span className="block max-w-[130px] truncate text-[13px] leading-tight font-medium text-fog-100">
                        {profile?.name ?? "—"}
                      </span>
                      <span className="block text-[10px] tracking-wide text-fog-400 uppercase">
                        {profile ? USER_ROLE[profile.role].label : ""}
                      </span>
                    </span>
                  </button>
                </DropdownTrigger>
                <DropdownContent>
                  <DropdownLabel>{profile?.email ?? "Sessão"}</DropdownLabel>
                  <DropdownSeparator />
                  <DropdownItem onSelect={() => router.push("/configuracoes")}>
                    Configurações da oficina
                  </DropdownItem>
                  <DropdownItem onSelect={() => router.push("/usuarios")}>Usuários</DropdownItem>
                  <DropdownSeparator />
                  <DropdownItem danger onSelect={() => void signOut().then(() => router.push("/login"))}>
                    <LogOut /> Sair
                  </DropdownItem>
                </DropdownContent>
              </Dropdown>
            </div>
          </div>

          {mobileSearch ? (
            <div className="px-3 pb-3 md:hidden">
              <GlobalSearch />
            </div>
          ) : null}
        </header>

        <main className="mx-auto w-full max-w-[1500px] flex-1 px-3 pt-4 pb-24 sm:px-5 sm:pb-10 lg:pb-12">
          {children}
        </main>

        {/* ---------- Barra inferior (mobile) ---------- */}
        <nav
          data-app-nav
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-ink-700 bg-ink-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
        >
          {BOTTOM_NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                  active ? "text-amber-brand" : "text-fog-400",
                )}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-fog-400"
          >
            <Menu className="size-5" />
            Menu
          </button>
        </nav>
      </div>
    </div>
  );
}
