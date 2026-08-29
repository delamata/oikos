"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/provider";
import { can } from "@/lib/permissions";
import { MOBILE_SHORTCUTS } from "@/components/layout/nav-items";

/** Atalhos de uma mão só — aparecem apenas no celular, no topo do painel. */
export function MobileShortcuts() {
  const { profile } = useAuth();
  const items = MOBILE_SHORTCUTS.filter((item) => can(profile?.role, item.permission));
  if (items.length === 0) return null;

  return (
    <div className="mb-4 grid grid-cols-3 gap-2 sm:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={item.href}
            className="flex flex-col items-center gap-2 rounded-2xl border border-ink-700 bg-ink-900 px-2 py-3.5 text-center transition-colors active:bg-ink-850"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-amber-brand/12 text-amber-brand">
              <Icon className="size-[18px]" />
            </span>
            <span className="text-[11px] leading-tight font-medium text-fog-200">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
