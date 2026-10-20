import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/** Orders that count as sales (not cancelled/refunded/unpaid holds). */
const NOT_SALES = ['cancelled', 'refunded', 'awaiting_payment', 'expired'];

type Row = Record<string, unknown>;

export interface ReportSummary {
  revenue: number;
  /** Orders that count as sales. */
  orders: number;
  itemsSold: number;
  avgOrderValue: number;
  discounts: number;
  shipping: number;
  /** Every order in the range, whatever its status. */
  allOrders: number;
  cancelled: number;
  customers: number;
}

export interface SalesReport {
  range: { from: string; to: string; granularity: 'day' | 'month' };
  summary: ReportSummary;
  /** Same-length period right before `range` (for trend chips). */
  previous: ReportSummary;
  newCustomers: number;
  byStatus: { status: string; orders: number; amount: number }[];
  byDay: { day: string; orders: number; revenue: number }[];
  byPaymentMethod: { method: string; count: number; amount: number }[];
  byDelivery: { method: string; orders: number; revenue: number }[];
  byHour: { hour: number; orders: number; revenue: number }[];
  byBranch: {
    branchId: string;
    name: string;
    orders: number;
    revenue: number;
  }[];
  topProducts: {
    productId: string;
    name: string;
    imageUrl: string | null;
    quantity: number;
    revenue: number;
  }[];
  topCustomers: {
    key: string;
    name: string;
    phone: string | null;
    orders: number;
    revenue: number;
  }[];
}

/**
 * Reports use the shop's time (Cambodia, UTC+7, no DST) whatever timezone the
 * server runs in. Order times are stored in UTC.
 */
const SHOP_OFFSET_H = 7;
const SHOP_OFFSET = `+0${SHOP_OFFSET_H}:00`;
/** SQL: an order's created_at in shop time. */
const LOCAL_TS = `(o.created_at + interval '${SHOP_OFFSET_H} hours')`;

/** Shop-time 'YYYY-MM-DD' of an instant. */
function ymd(d: Date): string {
  const l = new Date(+d + SHOP_OFFSET_H * 3_600_000);
  return `${l.getUTCFullYear()}-${String(l.getUTCMonth() + 1).padStart(2, '0')}-${String(l.getUTCDate()).padStart(2, '0')}`;
}

/** Start / end instant of a shop-time day. */
const dayStart = (day: string) => new Date(`${day}T00:00:00${SHOP_OFFSET}`);
const dayEnd = (day: string) => new Date(`${day}T23:59:59.999${SHOP_OFFSET}`);

/** One order row for the CSV export. */
export interface OrderExportRow {
  orderNumber: string;
  date: string;
  time: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  source: string;
  branch: string;
  cashier: string;
  customer: string;
  phone: string;
  items: number;
  products: string;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  countsAsSale: boolean;
}

@Injectable()
export class ReportsService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async sales(params: {
    from?: string;
    to?: string;
    branchId?: string;
  }): Promise<SalesReport> {
    const now = new Date();
    const toDay = params.to ?? ymd(now);
    let fromDay = params.from ?? ymd(new Date(+now - 29 * 86_400_000));
    const to = dayEnd(toDay);
    const branchArg = params.branchId ? [params.branchId] : [];
    const branchSql = params.branchId ? 'AND o.branch_id = $3' : '';

    // "All time" starts at the first order, not in the year 2000.
    const [first] = await this.db.query<Row[]>(
      `SELECT MIN(o.created_at) first FROM orders o
        WHERE o.created_at <= $1 ${params.branchId ? 'AND o.branch_id = $2' : ''}`,
      [to, ...branchArg],
    );
    if (first?.first) {
      const f = ymd(new Date(first.first as string));
      if (f > fromDay) fromDay = f;
    }
    const from = dayStart(fromDay);
    const spanDays = Math.round((+to - +from) / 86_400_000) + 1;
    const granularity: 'day' | 'month' = spanDays > 92 ? 'month' : 'day';
    const prevTo = new Date(+from - 1);
    const prevFrom = new Date(+from - spanDays * 86_400_000);

    const sales = `o.status::text <> ALL($${params.branchId ? 4 : 3}::text[])`;
    const args = [from, to, ...branchArg, NOT_SALES];
    const where = `o.created_at BETWEEN $1 AND $2 ${branchSql} AND ${sales}`;
    const q = (sql: string, a: unknown[] = args) =>
      this.db.query<Row[]>(sql, a);
    const num = (v: unknown) => Number(v ?? 0);
    const str = (v: unknown) => (v == null ? '' : String(v as string));
    const customerKey = `COALESCE(o.customer_id::text, NULLIF(o.customer_phone,''), NULLIF(o.customer_name,''))`;

    const summarySql = `
      SELECT COUNT(*) all_orders,
             COUNT(*) FILTER (WHERE ${sales}) orders,
             COUNT(*) FILTER (WHERE o.status::text IN ('cancelled','expired')) cancelled,
             COALESCE(SUM(o.grand_total) FILTER (WHERE ${sales}),0) revenue,
             COALESCE(SUM(o.discount_total) FILTER (WHERE ${sales}),0) discounts,
             COALESCE(SUM(o.shipping_cost) FILTER (WHERE ${sales}),0) shipping,
             COUNT(DISTINCT ${customerKey}) FILTER (WHERE ${sales}) customers,
             (SELECT COALESCE(SUM(oi.quantity),0) FROM order_items oi
                JOIN orders o ON o.id = oi.order_id
               WHERE o.created_at BETWEEN $1 AND $2 ${branchSql} AND ${sales}) items
        FROM orders o WHERE o.created_at BETWEEN $1 AND $2 ${branchSql}`;
    const toSummary = (r: Row | undefined): ReportSummary => {
      const revenue = num(r?.revenue);
      const orders = num(r?.orders);
      return {
        revenue,
        orders,
        itemsSold: num(r?.items),
        avgOrderValue: orders ? revenue / orders : 0,
        discounts: num(r?.discounts),
        shipping: num(r?.shipping),
        allOrders: num(r?.all_orders),
        cancelled: num(r?.cancelled),
        customers: num(r?.customers),
      };
    };

    const bucket =
      granularity === 'month'
        ? `to_char(date_trunc('month', ${LOCAL_TS}), 'YYYY-MM-DD')`
        : `to_char(${LOCAL_TS}, 'YYYY-MM-DD')`;

    const [
      summary,
      previous,
      newCustomers,
      byStatus,
      byDay,
      byPay,
      byDelivery,
      byHour,
      byBranch,
      top,
      customers,
    ] = await Promise.all([
      q(summarySql),
      q(summarySql, [prevFrom, prevTo, ...branchArg, NOT_SALES]),
      // Customers whose first-ever sale falls in this range.
      q(`SELECT COUNT(*) n FROM (
           SELECT ${customerKey} k, MIN(o.created_at) first
             FROM orders o WHERE ${sales} ${branchSql}
              AND o.created_at <= $2
            GROUP BY 1) f
          WHERE f.k IS NOT NULL AND f.first >= $1`),
      q(
        `SELECT o.status::text status, COUNT(*) orders,
                COALESCE(SUM(o.grand_total),0) amount
           FROM orders o WHERE o.created_at BETWEEN $1 AND $2 ${branchSql}
          GROUP BY 1 ORDER BY 2 DESC`,
        [from, to, ...branchArg],
      ),
      q(`SELECT ${bucket} AS day, COUNT(*) orders,
                COALESCE(SUM(o.grand_total),0) revenue
           FROM orders o WHERE ${where} GROUP BY 1 ORDER BY 1`),
      q(`SELECT COALESCE(o.payment_method::text,
                  (SELECT MIN(p.method::text) FROM payments p WHERE p.order_id = o.id),
                  'other') AS method,
                COUNT(*) count, COALESCE(SUM(o.grand_total),0) amount
           FROM orders o WHERE ${where} GROUP BY 1 ORDER BY amount DESC`),
      q(`SELECT COALESCE(o.delivery_method_name, o.delivery_method::text,
                  CASE WHEN o.source::text = 'in_store' THEN 'pickup' ELSE 'other' END) AS method,
                COUNT(*) orders, COALESCE(SUM(o.grand_total),0) revenue
           FROM orders o WHERE ${where} GROUP BY 1 ORDER BY orders DESC`),
      q(`SELECT EXTRACT(HOUR FROM ${LOCAL_TS})::int AS hr, COUNT(*) orders,
                COALESCE(SUM(o.grand_total),0) revenue
           FROM orders o WHERE ${where} GROUP BY 1 ORDER BY 1`),
      q(`SELECT o.branch_id, b."branchNameEn" name, COUNT(*) orders,
                COALESCE(SUM(o.grand_total),0) revenue
           FROM orders o JOIN branches b ON b.id = o.branch_id
          WHERE ${where} GROUP BY o.branch_id, b."branchNameEn"
          ORDER BY revenue DESC`),
      q(`SELECT oi.product_id, MAX(oi.product_name) name,
                SUM(oi.quantity) quantity, COALESCE(SUM(oi.line_total),0) revenue,
                (SELECT pi.image_url FROM product_images pi
                  WHERE pi.product_id = oi.product_id AND pi.deleted_at IS NULL
                  ORDER BY (pi.image_type = 'primary') DESC, pi.display_order
                  LIMIT 1) image_url
           FROM order_items oi JOIN orders o ON o.id = oi.order_id
          WHERE ${where} GROUP BY oi.product_id
          ORDER BY revenue DESC LIMIT 8`),
      q(`SELECT ${customerKey} k,
                MAX(COALESCE(u.full_name, o.customer_name)) name,
                MAX(COALESCE(o.customer_phone, u.phone_number)) phone,
                COUNT(*) orders, COALESCE(SUM(o.grand_total),0) revenue
           FROM orders o LEFT JOIN users u ON u.id = o.customer_id
          WHERE ${where} AND ${customerKey} IS NOT NULL
          GROUP BY 1 ORDER BY revenue DESC LIMIT 8`),
    ]);

    // Zero-fill buckets so the chart's time axis has no gaps.
    const dayMap = new Map(
      byDay.map((r) => [
        str(r.day),
        { orders: num(r.orders), revenue: num(r.revenue) },
      ]),
    );
    const days: SalesReport['byDay'] = [];
    // Walk shop-time days (UTC noon avoids any DST/offset edge).
    const d = new Date(`${fromDay}T12:00:00Z`);
    if (granularity === 'month') d.setUTCDate(1);
    const end = new Date(`${toDay}T12:00:00Z`);
    while (d <= end && days.length < 400) {
      const k = d.toISOString().slice(0, 10);
      days.push({ day: k, ...(dayMap.get(k) ?? { orders: 0, revenue: 0 }) });
      if (granularity === 'month') d.setUTCMonth(d.getUTCMonth() + 1);
      else d.setUTCDate(d.getUTCDate() + 1);
    }
    const hourMap = new Map(byHour.map((r) => [num(r.hr), r]));

    return {
      range: { from: fromDay, to: toDay, granularity },
      summary: toSummary(summary[0]),
      previous: toSummary(previous[0]),
      newCustomers: num(newCustomers[0]?.n),
      byStatus: byStatus.map((r) => ({
        status: str(r.status),
        orders: num(r.orders),
        amount: num(r.amount),
      })),
      byDay: days,
      byPaymentMethod: byPay.map((r) => ({
        method: str(r.method),
        count: num(r.count),
        amount: num(r.amount),
      })),
      byDelivery: byDelivery.map((r) => ({
        method: str(r.method),
        orders: num(r.orders),
        revenue: num(r.revenue),
      })),
      byHour: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        orders: num(hourMap.get(hour)?.orders),
        revenue: num(hourMap.get(hour)?.revenue),
      })),
      byBranch: byBranch.map((r) => ({
        branchId: str(r.branch_id),
        name: str(r.name),
        orders: num(r.orders),
        revenue: num(r.revenue),
      })),
      topProducts: top.map((r) => ({
        productId: str(r.product_id),
        name: str(r.name),
        imageUrl: (r.image_url as string | null) ?? null,
        quantity: num(r.quantity),
        revenue: num(r.revenue),
      })),
      topCustomers: customers.map((r) => ({
        key: str(r.k),
        name: str(r.name) || str(r.phone),
        phone: (r.phone as string | null) ?? null,
        orders: num(r.orders),
        revenue: num(r.revenue),
      })),
    };
  }

  /** Every order in the range (all statuses), one row each, for CSV. */
  async orders(params: {
    from?: string;
    to?: string;
    branchId?: string;
  }): Promise<{ range: { from: string; to: string }; rows: OrderExportRow[] }> {
    const now = new Date();
    const toDay = params.to ?? ymd(now);
    const fromDay = params.from ?? ymd(new Date(+now - 29 * 86_400_000));
    const args: unknown[] = [dayStart(fromDay), dayEnd(toDay)];
    if (params.branchId) args.push(params.branchId);

    const rows = await this.db.query<Row[]>(
      `SELECT o.order_number, o.created_at, o.status::text status,
              o.payment_status::text payment_status,
              COALESCE(o.payment_method_name, o.payment_method::text,
                (SELECT string_agg(DISTINCT p.method::text, ' + ')
                   FROM payments p WHERE p.order_id = o.id)) payment_method,
              o.source::text source, b."branchNameEn" branch,
              u.full_name cashier, COALESCE(o.customer_name, cu.full_name) customer,
              COALESCE(o.customer_phone, cu.phone_number) phone,
              o.subtotal, o.discount_total, o.shipping_cost, o.grand_total,
              (SELECT COALESCE(SUM(oi.quantity),0) FROM order_items oi
                WHERE oi.order_id = o.id) items,
              (SELECT string_agg(oi.product_name || ' x' || oi.quantity, '; ')
                 FROM order_items oi WHERE oi.order_id = o.id) products
         FROM orders o
         LEFT JOIN branches b ON b.id = o.branch_id
         LEFT JOIN users u ON u.id = o.cashier_id
         LEFT JOIN users cu ON cu.id = o.customer_id
        WHERE o.created_at BETWEEN $1 AND $2
          ${params.branchId ? 'AND o.branch_id = $3' : ''}
        ORDER BY o.created_at DESC
        LIMIT 20000`,
      args,
    );

    const num = (v: unknown) => Number(v ?? 0);
    const str = (v: unknown) => (v == null ? '' : String(v as string));
    return {
      range: { from: fromDay, to: toDay },
      rows: rows.map((r) => {
        const d = new Date(r.created_at as string);
        return {
          orderNumber: str(r.order_number),
          date: ymd(d),
          time: new Date(+d + SHOP_OFFSET_H * 3_600_000)
            .toISOString()
            .slice(11, 16),
          status: str(r.status),
          paymentStatus: str(r.payment_status),
          paymentMethod: str(r.payment_method),
          source: str(r.source),
          branch: str(r.branch),
          cashier: str(r.cashier),
          customer: str(r.customer),
          phone: str(r.phone),
          items: num(r.items),
          products: str(r.products),
          subtotal: num(r.subtotal),
          discount: num(r.discount_total),
          shipping: num(r.shipping_cost),
          total: num(r.grand_total),
          countsAsSale: !NOT_SALES.includes(str(r.status)),
        };
      }),
    };
  }
}
