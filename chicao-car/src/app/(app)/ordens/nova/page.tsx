"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Car } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { FormRow } from "@/components/forms/controls";
import { CustomerSelector, VehicleSelector } from "@/components/forms/selectors";
import { CustomerFormDialog } from "@/features/customers/customer-form";
import { VehicleFormDialog } from "@/features/vehicles/vehicle-form";
import { useWorkOrderActions } from "@/features/work-orders/actions";
import { useData } from "@/lib/data/provider";
import { useAuth } from "@/lib/auth/provider";
import { formatMileage, formatPlate } from "@/lib/utils/format";

export default function NewWorkOrderPage() {
  const router = useRouter();
  const params = useSearchParams();
  const data = useData();
  const { profile } = useAuth();
  const { createOrder } = useWorkOrderActions();

  const [customerId, setCustomerId] = React.useState<string | null>(params.get("cliente"));
  const [vehicleId, setVehicleId] = React.useState<string | null>(params.get("veiculo"));
  const [mechanicId, setMechanicId] = React.useState<string>("");
  const [mileage, setMileage] = React.useState("");
  const [complaint, setComplaint] = React.useState("");
  const [expected, setExpected] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [customerOpen, setCustomerOpen] = React.useState(false);
  const [vehicleOpen, setVehicleOpen] = React.useState(false);

  // veículo informado pela URL já define o cliente
  const vehicleFromUrl = params.get("veiculo");
  const derivedCustomer =
    customerId ?? data.vehicles.find((v) => v.id === vehicleFromUrl)?.customer_id ?? null;

  const vehicle = data.vehicles.find((v) => v.id === vehicleId) ?? null;
  const customerVehicles = data.vehicles.filter((v) => v.customer_id === derivedCustomer);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!derivedCustomer) {
      toast.error("Selecione o cliente.");
      return;
    }
    if (!vehicleId) {
      toast.error("Selecione o veículo.");
      return;
    }
    setBusy(true);
    try {
      const order = await createOrder(
        {
          customer_id: derivedCustomer,
          vehicle_id: vehicleId,
          mechanic_id: mechanicId || null,
          current_mileage: mileage ? Number(mileage.replace(/\D/g, "")) : null,
          customer_complaint: complaint || null,
          expected_at: expected ? new Date(expected).toISOString() : null,
        },
        profile?.id ?? null,
      );
      toast.success(`OS #${order.order_number} aberta.`);
      router.replace(`/ordens/${order.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível abrir a OS.");
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        backHref="/ordens"
        title="Nova ordem de serviço"
        subtitle="Passo 1 — identificação do cliente e do veículo"
      />

      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-4">
        <Card>
          <CardHeader title="Cliente e veículo" />
          <CardBody className="space-y-3">
            <Field label="Cliente" required>
              <CustomerSelector
                value={derivedCustomer}
                onChange={(id) => {
                  setCustomerId(id);
                  setVehicleId(null);
                }}
                onCreate={() => setCustomerOpen(true)}
              />
            </Field>

            <Field
              label="Veículo"
              required
              hint={
                derivedCustomer && customerVehicles.length === 0
                  ? "Este cliente ainda não tem veículo cadastrado."
                  : undefined
              }
            >
              <VehicleSelector
                customerId={derivedCustomer}
                value={vehicleId}
                onChange={setVehicleId}
                onCreate={() => setVehicleOpen(true)}
                disabled={!derivedCustomer}
              />
            </Field>

            {vehicle ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-ink-700 bg-ink-850 px-3.5 py-3 text-sm">
                <span className="flex items-center gap-2 text-fog-300">
                  <Car className="size-4 text-fog-400" />
                  <span className="tabular font-semibold text-fog-100">
                    {formatPlate(vehicle.plate)}
                  </span>
                </span>
                <span className="text-fog-300">
                  {[vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(" · ")}
                </span>
                <span className="tabular text-fog-400">
                  Última KM: {formatMileage(vehicle.mileage)}
                </span>
              </div>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Entrada do veículo" />
          <CardBody className="space-y-3">
            <FormRow columns={3}>
              <Field label="Quilometragem atual">
                <Input
                  inputMode="numeric"
                  className="tabular"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value.replace(/\D/g, ""))}
                  placeholder={vehicle?.mileage ? String(vehicle.mileage) : "Ex.: 78500"}
                />
              </Field>
              <Field label="Mecânico responsável">
                <Select value={mechanicId} onChange={(e) => setMechanicId(e.target.value)}>
                  <option value="">A definir</option>
                  {data.profiles
                    .filter((p) => p.active && (p.role === "mechanic" || p.role === "admin"))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label="Previsão de entrega">
                <Input type="date" value={expected} onChange={(e) => setExpected(e.target.value)} />
              </Field>
            </FormRow>

            <Field label="Reclamação do cliente" hint="O que o cliente relatou, nas palavras dele.">
              <Textarea
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                placeholder="Ex.: barulho na suspensão ao passar em lombadas"
                autoFocus={Boolean(derivedCustomer && vehicleId)}
              />
            </Field>
          </CardBody>
        </Card>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => router.push("/ordens")}>
            Cancelar
          </Button>
          <Button type="submit" size="lg" loading={busy}>
            Abrir OS e adicionar itens <ArrowRight />
          </Button>
        </div>
      </form>

      <CustomerFormDialog
        open={customerOpen}
        onOpenChange={setCustomerOpen}
        onSaved={(customer) => {
          setCustomerId(customer.id);
          setVehicleId(null);
          setVehicleOpen(true);
        }}
      />
      <VehicleFormDialog
        open={vehicleOpen}
        onOpenChange={setVehicleOpen}
        customerId={derivedCustomer}
        onSaved={(saved) => setVehicleId(saved.id)}
      />
    </>
  );
}
