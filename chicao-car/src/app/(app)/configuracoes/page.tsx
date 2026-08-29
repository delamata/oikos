"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Database, History, RefreshCcw, Save, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { FormRow, MaskedField } from "@/components/forms/controls";
import { useData } from "@/lib/data/provider";
import { useAuth } from "@/lib/auth/provider";
import { can } from "@/lib/permissions";
import { BR_STATES } from "@/lib/constants";
import { settingsSchema, type SettingsInput, type SettingsValues } from "@/lib/validations";
import { formatDateTime } from "@/lib/utils/format";

export default function SettingsPage() {
  const data = useData();
  const { profile } = useAuth();
  const canWrite = can(profile?.role, "settings:write");
  const canAudit = can(profile?.role, "audit:read");
  const { confirm, dialog } = useConfirm();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SettingsInput, unknown, SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { company_name: data.settings.company_name, quote_valid_days: 7 },
  });

  React.useEffect(() => {
    if (data.loading) return;
    reset({
      company_name: data.settings.company_name,
      document: data.settings.document ?? "",
      phone: data.settings.phone ?? "",
      whatsapp: data.settings.whatsapp ?? "",
      email: data.settings.email ?? "",
      address: data.settings.address ?? "",
      city: data.settings.city ?? "",
      state: data.settings.state ?? "",
      zip_code: data.settings.zip_code ?? "",
      logo_url: data.settings.logo_url ?? "",
      bank_details: data.settings.bank_details ?? "",
      pix_key: data.settings.pix_key ?? "",
      quote_terms: data.settings.quote_terms ?? "",
      order_terms: data.settings.order_terms ?? "",
      document_footer: data.settings.document_footer ?? "",
      quote_valid_days: data.settings.quote_valid_days,
    });
  }, [data.loading, data.settings, reset]);

  async function onSubmit(values: SettingsValues) {
    try {
      await data.saveSettings({ ...data.settings, ...values });
      await data.audit({
        action: "update",
        entity: "workshop_settings",
        summary: "Configurações da oficina atualizadas",
      });
      toast.success("Configurações salvas.");
      reset(values as unknown as SettingsInput);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
  }

  const auditLogs = React.useMemo(
    () => [...data.audit_logs].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 120),
    [data.audit_logs],
  );

  return (
    <>
      <PageHeader
        title="Configurações"
        subtitle="Dados da oficina usados nos documentos, no financeiro e nas mensagens"
      />

      <Tabs defaultValue="empresa">
        <TabsList>
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="sistema">Sistema</TabsTrigger>
          {canAudit ? <TabsTrigger value="auditoria">Auditoria</TabsTrigger> : null}
        </TabsList>

        <form onSubmit={handleSubmit(onSubmit)}>
          <TabsContent value="empresa">
            <Card>
              <CardHeader title="Identificação" />
              <CardBody className="space-y-3">
                <FormRow>
                  <Field label="Nome da oficina" required error={errors.company_name?.message}>
                    <Input {...register("company_name")} disabled={!canWrite} />
                  </Field>
                  <MaskedField
                    control={control}
                    name="document"
                    label="CNPJ"
                    mask="document"
                    error={errors.document?.message}
                  />
                </FormRow>

                <FormRow columns={3}>
                  <MaskedField
                    control={control}
                    name="phone"
                    label="Telefone"
                    mask="phone"
                    inputMode="tel"
                    error={errors.phone?.message}
                  />
                  <MaskedField
                    control={control}
                    name="whatsapp"
                    label="WhatsApp"
                    mask="phone"
                    inputMode="tel"
                    error={errors.whatsapp?.message}
                  />
                  <Field label="E-mail" error={errors.email?.message}>
                    <Input type="email" inputMode="email" {...register("email")} disabled={!canWrite} />
                  </Field>
                </FormRow>

                <FormRow>
                  <Field label="Endereço">
                    <Input {...register("address")} disabled={!canWrite} />
                  </Field>
                  <MaskedField control={control} name="zip_code" label="CEP" mask="zip" />
                </FormRow>

                <FormRow>
                  <Field label="Cidade">
                    <Input {...register("city")} disabled={!canWrite} />
                  </Field>
                  <Field label="Estado">
                    <Select {...register("state")} disabled={!canWrite}>
                      <option value="">—</option>
                      {BR_STATES.map((uf) => (
                        <option key={uf} value={uf}>
                          {uf}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </FormRow>

                <Field label="URL do logotipo" hint="Usada nos documentos quando informada.">
                  <Input {...register("logo_url")} placeholder="https://…" disabled={!canWrite} />
                </Field>
              </CardBody>
            </Card>

            <Card className="mt-4">
              <CardHeader title="Recebimentos" />
              <CardBody className="space-y-3">
                <Field label="Chave PIX">
                  <Input {...register("pix_key")} disabled={!canWrite} />
                </Field>
                <Field label="Dados bancários">
                  <Textarea
                    {...register("bank_details")}
                    placeholder="Banco, agência, conta e titular"
                    disabled={!canWrite}
                  />
                </Field>
              </CardBody>
            </Card>
          </TabsContent>

          <TabsContent value="documentos">
            <Card>
              <CardHeader
                title="Textos padrão"
                subtitle="Aparecem no orçamento, na OS e no recibo impressos"
              />
              <CardBody className="space-y-3">
                <Field label="Validade do orçamento (dias)" error={errors.quote_valid_days?.message}>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="90"
                    className="tabular"
                    disabled={!canWrite}
                    {...register("quote_valid_days", { valueAsNumber: true })}
                  />
                </Field>
                <Field label="Texto padrão do orçamento">
                  <Textarea {...register("quote_terms")} disabled={!canWrite} />
                </Field>
                <Field label="Texto padrão da ordem de serviço">
                  <Textarea {...register("order_terms")} disabled={!canWrite} />
                </Field>
                <Field label="Rodapé dos documentos">
                  <Textarea {...register("document_footer")} disabled={!canWrite} />
                </Field>
              </CardBody>
            </Card>
          </TabsContent>

          {canWrite ? (
            <div className="sticky bottom-4 mt-4 flex justify-end">
              <Button type="submit" size="lg" loading={isSubmitting} disabled={!isDirty}>
                <Save /> Salvar configurações
              </Button>
            </div>
          ) : null}
        </form>

        <TabsContent value="sistema">
          <Card>
            <CardHeader title="Armazenamento dos dados" />
            <CardBody className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-700 bg-ink-850 px-4 py-3.5">
                <Database className="size-5 shrink-0 text-fog-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-fog-100">
                    {data.mode === "supabase" ? "Supabase (produção)" : "Navegador (demonstração)"}
                  </p>
                  <p className="text-xs text-fog-400">
                    {data.mode === "supabase"
                      ? "Os dados são gravados no Postgres do Supabase, com as políticas de RLS aplicadas."
                      : "Os dados ficam apenas neste navegador. Configure as variáveis do Supabase para usar em produção."}
                  </p>
                </div>
                <Badge tone={data.mode === "supabase" ? "ok" : "warn"}>
                  {data.mode === "supabase" ? "Conectado" : "Demonstração"}
                </Badge>
              </div>

              {data.mode === "local" ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      confirm({
                        title: "Recriar os dados de demonstração?",
                        description:
                          "Tudo o que foi alterado neste navegador será substituído pelo conjunto de exemplo.",
                        confirmLabel: "Recriar dados",
                        onConfirm: async () => {
                          await data.resetDemoData();
                          toast.success("Dados de demonstração recriados.");
                        },
                      })
                    }
                  >
                    <RefreshCcw /> Recriar dados de exemplo
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() =>
                      confirm({
                        title: "Apagar todos os dados locais?",
                        description:
                          "O sistema fica vazio, pronto para começar do zero. Não afeta nenhuma base de produção.",
                        confirmLabel: "Apagar tudo",
                        onConfirm: async () => {
                          await data.clearDemoData();
                          toast.success("Base local esvaziada.");
                        },
                      })
                    }
                  >
                    <Trash2 /> Começar do zero
                  </Button>
                </div>
              ) : null}
            </CardBody>
          </Card>
        </TabsContent>

        {canAudit ? (
          <TabsContent value="auditoria">
            <Card>
              <CardHeader
                title="Registro de auditoria"
                subtitle="Alterações financeiras, cancelamentos, descontos e mudanças de OS"
              />
              {auditLogs.length === 0 ? (
                <EmptyState icon={History} title="Nenhum registro ainda" />
              ) : (
                <ul className="divide-y divide-ink-800">
                  {auditLogs.map((log) => (
                    <li key={log.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 sm:px-5">
                      <Badge tone="neutral">{log.action}</Badge>
                      <span className="min-w-0 flex-1 truncate text-sm text-fog-200">
                        {log.summary ?? `${log.entity} ${log.entity_id ?? ""}`}
                      </span>
                      <span className="text-xs text-fog-400">{log.user_name ?? "sistema"}</span>
                      <span className="tabular text-xs text-fog-400">
                        {formatDateTime(log.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </TabsContent>
        ) : null}
      </Tabs>

      {dialog}
    </>
  );
}
