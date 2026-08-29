"use client";

import * as React from "react";
import { Pencil, Plus, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CardField, DataTable, type Column } from "@/components/tables/data-table";
import { UserFormDialog } from "@/features/users/user-form";
import { useData } from "@/lib/data/provider";
import { useAuth } from "@/lib/auth/provider";
import { can, permissionsOf } from "@/lib/permissions";
import { USER_ROLE } from "@/lib/constants";
import { formatDate, formatPhone, initials } from "@/lib/utils/format";
import type { Profile, UserRole } from "@/types";

const ROLE_TONE: Record<UserRole, "accent" | "info" | "violet" | "ok"> = {
  admin: "accent",
  manager: "info",
  mechanic: "violet",
  financial: "ok",
};

export default function UsersPage() {
  const data = useData();
  const { profile } = useAuth();
  const canWrite = can(profile?.role, "users:write");

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Profile | null>(null);

  const columns: Column<Profile>[] = [
    {
      key: "name",
      header: "Usuário",
      cell: (user) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-brand/15 text-xs font-bold text-amber-brand">
            {initials(user.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-fog-100">{user.name}</p>
            <p className="truncate text-xs text-fog-400">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Perfil",
      cell: (user) => <Badge tone={ROLE_TONE[user.role]}>{USER_ROLE[user.role].label}</Badge>,
    },
    {
      key: "phone",
      header: "Telefone",
      hideBelow: "lg",
      cell: (user) => <span className="tabular text-sm">{formatPhone(user.phone) || "—"}</span>,
    },
    {
      key: "created",
      header: "Desde",
      hideBelow: "xl",
      cell: (user) => <span className="tabular text-sm">{formatDate(user.created_at)}</span>,
    },
    {
      key: "status",
      header: "Situação",
      cell: (user) =>
        user.active ? <Badge tone="ok">Ativo</Badge> : <Badge tone="neutral">Inativo</Badge>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (user) =>
        canWrite ? (
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => {
              setEditing(user);
              setFormOpen(true);
            }}
          >
            <Pencil />
            <span className="sr-only">Editar</span>
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="Usuários"
        subtitle={`${data.profiles.length} pessoa(s) com acesso ao sistema`}
        actions={
          canWrite ? (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus /> Novo usuário
            </Button>
          ) : null
        }
      />

      <Card>
        <DataTable
          data={[...data.profiles].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))}
          columns={columns}
          loading={data.loading}
          getRowId={(user) => user.id}
          empty={<EmptyState icon={Users} title="Nenhum usuário cadastrado" />}
          mobileCard={(user) => (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate font-medium text-fog-100">{user.name}</p>
                <Badge tone={ROLE_TONE[user.role]}>{USER_ROLE[user.role].label}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <CardField label="E-mail" value={user.email} />
                <CardField label="Situação" value={user.active ? "Ativo" : "Inativo"} />
              </div>
            </div>
          )}
        />
      </Card>

      <Card className="mt-4">
        <CardHeader
          title="O que cada perfil pode fazer"
          subtitle="As permissões são aplicadas na interface e reforçadas pelo RLS do banco"
        />
        <CardBody className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(USER_ROLE) as UserRole[]).map((role) => (
            <div key={role} className="rounded-xl border border-ink-700 bg-ink-850 p-3.5">
              <div className="mb-2 flex items-center gap-2">
                <ShieldCheck className="size-4 text-amber-brand" />
                <p className="font-medium text-fog-100">{USER_ROLE[role].label}</p>
              </div>
              <p className="mb-2 text-xs text-fog-400">{USER_ROLE[role].description}</p>
              <p className="text-xs leading-relaxed text-fog-300">
                {permissionsOf(role).length} permissões ·{" "}
                {permissionsOf(role).filter((p) => p.endsWith(":write")).length} de escrita
              </p>
            </div>
          ))}
        </CardBody>
      </Card>

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editing} />
    </>
  );
}
