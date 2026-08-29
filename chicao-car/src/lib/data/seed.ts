import { addDays, format, startOfMonth, subDays, subMonths } from "date-fns";
import type {
  Customer,
  Expense,
  InventoryMovement,
  Payment,
  Product,
  Profile,
  Revenue,
  Service,
  Supplier,
  Vehicle,
  WorkOrder,
  WorkOrderProduct,
  WorkOrderService,
  WorkOrderStatus,
} from "@/types";
import { DEFAULT_SETTINGS, type Snapshot, emptySnapshot } from "./snapshot";

/**
 * Gerador determinístico de dados de demonstração (12 meses de histórico).
 * Determinístico de propósito: o painel fica igual a cada recarga, o que ajuda
 * durante o desenvolvimento. Nunca deve ser executado sobre a base real —
 * é usado apenas pelo backend local e pelo script `supabase/seed.sql`.
 */
let seedState = 20260828;
function rnd(): number {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
}
function pick<T>(list: readonly T[]): T {
  return list[Math.floor(rnd() * list.length)];
}
function int(min: number, max: number): number {
  return Math.floor(rnd() * (max - min + 1)) + min;
}
function money(min: number, max: number): number {
  return Math.round((rnd() * (max - min) + min) * 100) / 100;
}
function id(prefix: string, n: number): string {
  return `${prefix}${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`.slice(0, 36);
}
function iso(date: Date): string {
  return date.toISOString();
}
function isoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

const FIRST_NAMES = [
  "Ana", "Bruno", "Carlos", "Daniela", "Eduardo", "Fernanda", "Gustavo", "Helena",
  "Igor", "Juliana", "Leandro", "Mariana", "Nelson", "Patrícia", "Rafael", "Simone",
  "Tiago", "Vanessa", "Wagner", "Yara", "Marcelo", "Roberta", "Sérgio", "Camila",
];
const LAST_NAMES = [
  "Silva", "Souza", "Oliveira", "Pereira", "Almeida", "Ferreira", "Costa", "Rodrigues",
  "Martins", "Barbosa", "Ribeiro", "Carvalho", "Gomes", "Araújo", "Nunes", "Moreira",
];
const CARS: [string, string, string][] = [
  ["Fiat", "Argo", "1.0 Drive"],
  ["Fiat", "Strada", "1.4 Freedom"],
  ["Volkswagen", "Gol", "1.6 MSI"],
  ["Volkswagen", "Polo", "1.0 TSI"],
  ["Chevrolet", "Onix", "1.0 LT"],
  ["Chevrolet", "S10", "2.8 LTZ"],
  ["Hyundai", "HB20", "1.0 Comfort"],
  ["Toyota", "Corolla", "2.0 XEi"],
  ["Honda", "Civic", "2.0 EXL"],
  ["Renault", "Kwid", "1.0 Zen"],
  ["Ford", "Ka", "1.5 SE"],
  ["Jeep", "Renegade", "1.8 Longitude"],
  ["Nissan", "Kicks", "1.6 SV"],
  ["Peugeot", "208", "1.6 Griffe"],
];
const COLORS = ["Branco", "Prata", "Preto", "Cinza", "Vermelho", "Azul"];
const CITIES: [string, string][] = [
  ["São Caetano do Sul", "SP"],
  ["Santo André", "SP"],
  ["São Bernardo do Campo", "SP"],
  ["São Paulo", "SP"],
  ["Diadema", "SP"],
];

const SERVICE_SEED: [string, string, number, number][] = [
  ["Troca de óleo e filtro", "Manutenção preventiva", 180, 40],
  ["Alinhamento de direção", "Alinhamento e balanceamento", 120, 45],
  ["Balanceamento (4 rodas)", "Alinhamento e balanceamento", 90, 40],
  ["Troca de pastilhas de freio", "Freios", 240, 90],
  ["Troca de discos de freio", "Freios", 320, 120],
  ["Revisão completa", "Manutenção preventiva", 450, 180],
  ["Troca de amortecedores (par)", "Suspensão", 380, 150],
  ["Troca de correia dentada", "Motor", 690, 240],
  ["Diagnóstico eletrônico (scanner)", "Diagnóstico", 150, 60],
  ["Higienização do ar-condicionado", "Ar-condicionado", 200, 70],
  ["Recarga de ar-condicionado", "Ar-condicionado", 280, 90],
  ["Troca de bateria", "Elétrica", 110, 25],
  ["Troca de velas de ignição", "Motor", 160, 60],
  ["Troca de embreagem", "Motor", 980, 360],
  ["Troca de fluido de freio", "Freios", 140, 45],
];

const PRODUCT_SEED: [string, string, number, number][] = [
  ["Óleo motor 5W30 sintético (litro)", "Lubrificantes", 32, 62],
  ["Filtro de óleo", "Filtros", 22, 45],
  ["Filtro de ar do motor", "Filtros", 28, 58],
  ["Filtro de combustível", "Filtros", 34, 70],
  ["Filtro de cabine (antipólen)", "Filtros", 30, 65],
  ["Pastilha de freio dianteira", "Freios", 88, 175],
  ["Disco de freio ventilado (par)", "Freios", 210, 390],
  ["Amortecedor dianteiro", "Suspensão", 175, 330],
  ["Kit correia dentada", "Motor", 260, 480],
  ["Vela de ignição", "Motor", 18, 39],
  ["Bateria 60Ah", "Elétrica", 320, 520],
  ["Pneu aro 15 185/65", "Pneus", 265, 430],
  ["Fluido de freio DOT4", "Lubrificantes", 19, 42],
  ["Aditivo de radiador (litro)", "Lubrificantes", 16, 36],
  ["Palheta limpador (par)", "Acessórios", 24, 55],
];

const SUPPLIER_SEED: [string, string][] = [
  ["Auto Peças União Ltda", "União Peças"],
  ["Distribuidora Lubrimax", "Lubrimax"],
  ["Freios & Cia Comércio", "Freios & Cia"],
  ["Pneus ABC Distribuidora", "Pneus ABC"],
  ["Elétrica Bosch Center", "Bosch Center"],
];

const COMPLAINTS = [
  "Barulho na suspensão ao passar em lombadas.",
  "Freio com ruído e pedal baixo.",
  "Luz de injeção acesa no painel.",
  "Ar-condicionado não gela como antes.",
  "Carro falhando na aceleração.",
  "Revisão preventiva dos 40.000 km.",
  "Vibração no volante acima de 80 km/h.",
  "Consumo de combustível acima do normal.",
];
const DIAGNOSES = [
  "Bieletas e batentes desgastados; substituição recomendada.",
  "Pastilhas no limite e discos empenados.",
  "Sensor de oxigênio com leitura fora da faixa.",
  "Sistema com baixa carga de gás e filtro saturado.",
  "Velas desgastadas e bobina com falha intermitente.",
  "Itens de revisão dentro do previsto pelo fabricante.",
  "Rodas desbalanceadas e pneus com desgaste irregular.",
];

function plate(i: number): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const l = () => letters[int(0, 25)];
  // metade Mercosul, metade padrão antigo — os dois convivem na rua
  return i % 2 === 0
    ? `${l()}${l()}${l()}${int(0, 9)}${l()}${int(0, 9)}${int(0, 9)}`
    : `${l()}${l()}${l()}${int(1000, 9999)}`;
}

export function buildSeed(now = new Date()): Snapshot {
  seedState = 20260828;
  const snap = emptySnapshot();
  snap.settings = {
    ...DEFAULT_SETTINGS,
    document: "48.512.377/0001-09",
    phone: "1142553388",
    whatsapp: "11987654321",
    email: "contato@chicaocar.com.br",
    address: "Av. Guido Aliberti, 1420 — Santa Paula",
    city: "São Caetano do Sul",
    state: "SP",
    zip_code: "09570000",
    pix_key: "contato@chicaocar.com.br",
    bank_details: "Banco 341 · Ag. 1234 · C/C 56789-0 · Chicão Car Serviços Automotivos ME",
    updated_at: iso(now),
  };

  // --- equipe -------------------------------------------------------------
  const team: [string, string, Profile["role"]][] = [
    ["Francisco “Chicão” Amaral", "chicao@chicaocar.com.br", "admin"],
    ["Marina Prado", "marina@chicaocar.com.br", "manager"],
    ["Jorge Bastos", "jorge@chicaocar.com.br", "mechanic"],
    ["Ronaldo Lima", "ronaldo@chicaocar.com.br", "mechanic"],
    ["Cláudia Neves", "claudia@chicaocar.com.br", "financial"],
  ];
  snap.profiles = team.map(([name, email, role], i) => ({
    id: id("aaaaaaa", i + 1),
    name,
    email,
    role,
    phone: `119${int(10000000, 99999999)}`,
    active: true,
    created_at: iso(subMonths(now, 14)),
  }));
  const mechanics = snap.profiles.filter((p) => p.role === "mechanic");

  // --- fornecedores -------------------------------------------------------
  snap.suppliers = SUPPLIER_SEED.map(([company, trade], i) => {
    const [city, state] = CITIES[i % CITIES.length];
    return {
      id: id("bbbbbbb", i + 1),
      company_name: company,
      trade_name: trade,
      document: `${int(10, 99)}.${int(100, 999)}.${int(100, 999)}/0001-${int(10, 99)}`,
      contact_name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      phone: `11${int(30000000, 39999999)}`,
      whatsapp: `119${int(10000000, 99999999)}`,
      email: `vendas@${trade.toLowerCase().replace(/[^a-z]/g, "")}.com.br`,
      address: `Rua ${pick(LAST_NAMES)}, ${int(100, 2000)}`,
      city,
      state,
      notes: null,
      active: true,
      created_at: iso(subMonths(now, 13)),
      updated_at: iso(subMonths(now, 13)),
    } satisfies Supplier;
  });

  // --- catálogo -----------------------------------------------------------
  snap.services = SERVICE_SEED.map(([name, category, price, minutes], i) => ({
    id: id("ccccccc", i + 1),
    name,
    description: null,
    category,
    default_price: price,
    estimated_minutes: minutes,
    active: true,
    created_at: iso(subMonths(now, 13)),
  } satisfies Service));

  snap.products = PRODUCT_SEED.map(([name, category, cost, sale], i) => ({
    id: id("ddddddd", i + 1),
    sku: `CC-${String(1000 + i)}`,
    name,
    description: null,
    category,
    supplier_id: snap.suppliers[i % snap.suppliers.length].id,
    cost_price: cost,
    sale_price: sale,
    stock_quantity: int(0, 26),
    minimum_stock: 4,
    active: true,
    created_at: iso(subMonths(now, 13)),
    updated_at: iso(subMonths(now, 13)),
  } satisfies Product));

  // --- clientes e veículos ------------------------------------------------
  const customerCount = 28;
  for (let i = 0; i < customerCount; i++) {
    const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)} ${pick(LAST_NAMES)}`;
    const [city, state] = CITIES[i % CITIES.length];
    const customer: Customer = {
      id: id("eeeeeee", i + 1),
      name,
      document: `${int(100, 999)}.${int(100, 999)}.${int(100, 999)}-${int(10, 99)}`,
      phone: `11${int(30000000, 39999999)}`,
      whatsapp: `119${int(10000000, 99999999)}`,
      email: `${name.split(" ")[0].toLowerCase()}.${name.split(" ")[1].toLowerCase()}@email.com`,
      birth_date: isoDate(new Date(int(1965, 2001), int(0, 11), int(1, 28))),
      address: `Rua ${pick(LAST_NAMES)}, ${int(10, 1800)}`,
      city,
      state,
      zip_code: `0${int(9000, 9899)}${int(100, 999)}`,
      notes: null,
      active: true,
      created_at: iso(subMonths(now, int(1, 13))),
      updated_at: iso(subMonths(now, int(1, 13))),
    };
    snap.customers.push(customer);

    const vehicleCount = i % 7 === 0 ? 2 : 1;
    for (let v = 0; v < vehicleCount; v++) {
      const [brand, model, version] = pick(CARS);
      const year = int(2012, 2025);
      snap.vehicles.push({
        id: id("fffffff", snap.vehicles.length + 1),
        customer_id: customer.id,
        plate: plate(snap.vehicles.length),
        brand,
        model,
        version,
        year,
        model_year: year + (rnd() > 0.5 ? 1 : 0),
        color: pick(COLORS),
        fuel_type: pick(["flex", "flex", "flex", "gasoline", "diesel", "hybrid"] as const),
        mileage: int(12000, 190000),
        chassis: null,
        renavam: null,
        notes: null,
        created_at: customer.created_at,
        updated_at: customer.created_at,
      } satisfies Vehicle);
    }
  }

  // --- ordens de serviço (12 meses) ---------------------------------------
  let orderSeq = 1000;
  const monthsBack = 12;
  for (let m = monthsBack; m >= 0; m--) {
    const monthStart = startOfMonth(subMonths(now, m));
    // volume cresce levemente ao longo do ano
    const orders = m === 0 ? int(14, 20) : int(19, 26) + Math.round((monthsBack - m) / 3);

    for (let o = 0; o < orders; o++) {
      const vehicle = pick(snap.vehicles);
      const openedAt = addDays(monthStart, int(0, 27));
      if (openedAt > now) continue;
      const isCurrentMonth = m === 0;
      const daysOld = Math.floor((now.getTime() - openedAt.getTime()) / 86_400_000);

      let status: WorkOrderStatus;
      if (!isCurrentMonth || daysOld > 12) {
        status = rnd() > 0.06 ? "delivered" : "cancelled";
      } else {
        status = pick([
          "delivered", "delivered", "completed", "in_progress", "in_progress",
          "waiting_parts", "approved", "awaiting_approval", "awaiting_approval", "draft",
        ] as const);
      }

      orderSeq += 1;
      const orderId = id("1111111", orderSeq);
      const mechanic = pick(mechanics);

      // itens
      const serviceItems: WorkOrderService[] = [];
      const productItems: WorkOrderProduct[] = [];
      const nServices = int(1, 3);
      const used = new Set<string>();
      for (let s = 0; s < nServices; s++) {
        const svc = pick(snap.services);
        if (used.has(svc.id)) continue;
        used.add(svc.id);
        const qty = 1;
        const unit = svc.default_price;
        serviceItems.push({
          id: id("2222222", serviceItems.length + orderSeq * 10 + s),
          work_order_id: orderId,
          service_id: svc.id,
          description: svc.name,
          quantity: qty,
          unit_price: unit,
          discount: 0,
          total: Math.round(qty * unit * 100) / 100,
        });
      }
      const nProducts = int(0, 3);
      const usedP = new Set<string>();
      for (let p = 0; p < nProducts; p++) {
        const prod = pick(snap.products);
        if (usedP.has(prod.id)) continue;
        usedP.add(prod.id);
        const qty = int(1, 4);
        productItems.push({
          id: id("3333333", productItems.length + orderSeq * 10 + p),
          work_order_id: orderId,
          product_id: prod.id,
          description: prod.name,
          quantity: qty,
          unit_cost: prod.cost_price,
          unit_price: prod.sale_price,
          discount: 0,
          total: Math.round(qty * prod.sale_price * 100) / 100,
        });
      }

      const subtotalServices = serviceItems.reduce((a, s) => a + s.total, 0);
      const subtotalProducts = productItems.reduce((a, p) => a + p.total, 0);
      const discount = rnd() > 0.72 ? Math.round((subtotalServices + subtotalProducts) * 0.05) : 0;
      const total = Math.round((subtotalServices + subtotalProducts - discount) * 100) / 100;

      const completedAt =
        status === "completed" || status === "delivered" ? addDays(openedAt, int(1, 4)) : null;
      const deliveredAt = status === "delivered" ? addDays(completedAt ?? openedAt, int(0, 2)) : null;
      const settled = daysOld > 45 ? rnd() > 0.03 : rnd() > 0.3;
      const paid = status === "delivered" && settled;

      const order: WorkOrder = {
        id: orderId,
        order_number: orderSeq,
        customer_id: vehicle.customer_id,
        vehicle_id: vehicle.id,
        mechanic_id: mechanic.id,
        status,
        opened_at: iso(openedAt),
        expected_at: iso(addDays(openedAt, int(1, 5))),
        completed_at: completedAt ? iso(completedAt) : null,
        delivered_at: deliveredAt ? iso(deliveredAt) : null,
        current_mileage: vehicle.mileage ? vehicle.mileage - int(0, 8000) : null,
        customer_complaint: pick(COMPLAINTS),
        diagnosis: status === "draft" || status === "awaiting_approval" ? null : pick(DIAGNOSES),
        internal_notes: null,
        subtotal_services: Math.round(subtotalServices * 100) / 100,
        subtotal_products: Math.round(subtotalProducts * 100) / 100,
        discount,
        total,
        payment_status: paid ? "paid" : status === "cancelled" ? "unpaid" : "unpaid",
        approved_at: ["approved", "in_progress", "waiting_parts", "completed", "delivered"].includes(status)
          ? iso(addDays(openedAt, 1))
          : null,
        created_by: snap.profiles[0].id,
        created_at: iso(openedAt),
        updated_at: iso(deliveredAt ?? completedAt ?? openedAt),
      };
      snap.work_orders.push(order);
      snap.work_order_services.push(...serviceItems);
      snap.work_order_products.push(...productItems);

      // receita gerada pela OS
      if (status !== "draft" && status !== "awaiting_approval" && status !== "cancelled" && total > 0) {
        const dueDate = completedAt ?? addDays(openedAt, 3);
        const method = pick(["pix", "credit", "debit", "cash", "pix", "credit", "boleto"] as const);
        const revenueId = id("4444444", orderSeq);
        const isPaid = paid;
        const overdue = !isPaid && dueDate < subDays(now, 5);
        snap.revenues.push({
          id: revenueId,
          description: `OS #${orderSeq} — ${vehicle.brand} ${vehicle.model}`,
          customer_id: vehicle.customer_id,
          work_order_id: orderId,
          category: "Serviços",
          amount: total,
          paid_amount: isPaid ? total : 0,
          payment_method: isPaid ? method : null,
          due_date: isoDate(dueDate),
          payment_date: isPaid ? isoDate(deliveredAt ?? dueDate) : null,
          status: isPaid ? "paid" : overdue ? "overdue" : "pending",
          notes: null,
          created_at: iso(dueDate),
        } satisfies Revenue);

        if (isPaid) {
          snap.payments.push({
            id: id("5555555", orderSeq),
            revenue_id: revenueId,
            expense_id: null,
            amount: total,
            payment_method: method,
            paid_at: isoDate(deliveredAt ?? dueDate),
            notes: null,
            created_at: iso(deliveredAt ?? dueDate),
          } satisfies Payment);
        }
      }

      // baixa de estoque das peças efetivamente aplicadas
      if (["completed", "delivered"].includes(status)) {
        for (const item of productItems) {
          if (!item.product_id) continue;
          snap.inventory_movements.push({
            id: id("6666666", snap.inventory_movements.length + 1),
            product_id: item.product_id,
            type: "exit",
            quantity: item.quantity,
            unit_cost: item.unit_cost,
            work_order_id: orderId,
            supplier_id: null,
            notes: `Aplicada na OS #${orderSeq}`,
            created_at: iso(completedAt ?? openedAt),
          } satisfies InventoryMovement);
        }
      }
    }
  }

  // --- despesas fixas e variáveis -----------------------------------------
  const fixed: [string, string, number][] = [
    ["Aluguel do galpão", "Aluguel", 4800],
    ["Folha de pagamento", "Salários", 12400],
    ["Energia elétrica", "Energia", 980],
    ["Água", "Água", 210],
    ["Internet e telefonia", "Internet", 320],
    ["Simples Nacional", "Impostos", 2100],
  ];
  for (let m = monthsBack; m >= 0; m--) {
    const monthStart = startOfMonth(subMonths(now, m));
    for (const [description, category, base] of fixed) {
      const dueDate = addDays(monthStart, category === "Salários" ? 4 : 9);
      const amount = Math.round(base * (0.94 + rnd() * 0.14) * 100) / 100;
      const isPaid = dueDate <= now && (dueDate < subDays(now, 40) ? rnd() > 0.02 : rnd() > 0.25);
      snap.expenses.push({
        id: id("7777777", snap.expenses.length + 1),
        supplier_id: null,
        description,
        category,
        amount,
        paid_amount: isPaid ? amount : 0,
        due_date: isoDate(dueDate),
        payment_date: isPaid ? isoDate(dueDate) : null,
        payment_method: isPaid ? pick(["pix", "boleto", "transfer"] as const) : null,
        status: isPaid ? "paid" : dueDate < subDays(now, 1) ? "overdue" : "pending",
        recurring: true,
        notes: null,
        created_at: iso(monthStart),
      } satisfies Expense);
    }

    // compras de peças
    for (let k = 0; k < int(2, 4); k++) {
      const supplier = pick(snap.suppliers);
      const dueDate = addDays(monthStart, int(2, 26));
      const amount = money(600, 4200);
      const isPaid = dueDate <= now && (dueDate < subDays(now, 40) ? rnd() > 0.03 : rnd() > 0.3);
      snap.expenses.push({
        id: id("7777777", snap.expenses.length + 1),
        supplier_id: supplier.id,
        description: `Compra de peças — ${supplier.trade_name}`,
        category: "Peças",
        amount,
        paid_amount: isPaid ? amount : 0,
        due_date: isoDate(dueDate),
        payment_date: isPaid ? isoDate(dueDate) : null,
        payment_method: isPaid ? pick(["pix", "boleto", "transfer"] as const) : null,
        status: isPaid ? "paid" : dueDate < subDays(now, 1) ? "overdue" : "pending",
        recurring: false,
        notes: null,
        created_at: iso(monthStart),
      } satisfies Expense);
    }
  }

  // contas a pagar futuras (para o painel ter "a pagar" real)
  for (let k = 0; k < 4; k++) {
    const supplier = pick(snap.suppliers);
    const dueDate = addDays(now, int(2, 25));
    const amount = money(400, 2600);
    snap.expenses.push({
      id: id("7777777", snap.expenses.length + 1),
      supplier_id: supplier.id,
      description: `Pedido de peças — ${supplier.trade_name}`,
      category: "Peças",
      amount,
      paid_amount: 0,
      due_date: isoDate(dueDate),
      payment_date: null,
      payment_method: null,
      status: "pending",
      recurring: false,
      notes: null,
      created_at: iso(now),
    } satisfies Expense);
  }

  // entradas de estoque coerentes com as compras
  for (const product of snap.products) {
    snap.inventory_movements.push({
      id: id("6666666", snap.inventory_movements.length + 1),
      product_id: product.id,
      type: "entry",
      quantity: int(10, 40),
      unit_cost: product.cost_price,
      work_order_id: null,
      supplier_id: product.supplier_id,
      notes: "Estoque inicial",
      created_at: iso(subMonths(now, 12)),
    } satisfies InventoryMovement);
  }

  snap.work_orders.sort((a, b) => b.order_number - a.order_number);
  return snap;
}
