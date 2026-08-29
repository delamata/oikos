import { Badge } from "./badge";
import {
  ENTRY_STATUS,
  ORDER_PAYMENT_STATUS,
  WORK_ORDER_STATUS,
} from "@/lib/constants";
import type { EntryStatus, OrderPaymentStatus, WorkOrderStatus } from "@/types";

export function WorkOrderStatusBadge({ status, short }: { status: WorkOrderStatus; short?: boolean }) {
  const meta = WORK_ORDER_STATUS[status];
  return (
    <Badge tone={meta.tone} dot>
      {short ? meta.short : meta.label}
    </Badge>
  );
}

export function EntryStatusBadge({ status }: { status: EntryStatus }) {
  const meta = ENTRY_STATUS[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: OrderPaymentStatus }) {
  const meta = ORDER_PAYMENT_STATUS[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
