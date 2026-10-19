import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/** Orders that count as sales (not cancelled/refunded/unpaid holds). */
const NOT_SALES = ['cancelled', 'refunded', 'awaiting_payment', 'expired'];

type Row = Record<string, unknown>;

export interface SalesReport {
  range: { from: string; to: string };
  summary: {
    revenue: number;
    orders: number;
    itemsSold: number;
    avgOrderValue: number;
    discounts: number;
  };
  byDay: { day: string; orders: number; revenue: number }[];
  byPaymentMethod: { method: string; count: number; amount: number }[];
  bySource: { source: string; orders: number; revenue: number }[];
  byCashier: {
    cashierId: string;
    name: string;
    username: string | null;
    orders: number;
    revenue: number;
  }[];
  byBranch: {
    branchId: string;
    name: string;
    orders: number;
    revenue: number;
  }[];
  topProducts: {
    productId: string;
    name: string;
    quantity: number;
    revenue: number;
  }[];
}

/** Local 'YYYY-MM-DD'. */
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
    const fromDay =
      params.from ??
      ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29));
    const from = new Date(`${fromDay}T00:00:00`);
    const to = new Date(`${toDay}T23:59:59.999`);

    // Shared filter: $1 from, $2 to, $3 excluded statuses, [$4 branch]
    const args: unknown[] = [from, to, NOT_SALES];
    let branchSql = '';
    if (params.branchId) {
      args.push(params.branchId);
      branchSql = `AND o.branch_id = $${args.length}`;
    }
    const where = `o.created_at BETWEEN $1 AND $2
      AND o.status::text <> ALL($3::text[]) ${branchSql}`;

    const num = (v: unknown) => Number(v ?? 0);

    const q = (sql: string) => this.db.query<Row[]>(sql, args);
    const [summary, items, byDay, byPay, bySource, byCashier, byBranch, top] =
      await Promise.all([
        q(`SELECT COALESCE(SUM(o.grand_total),0) revenue, COUNT(*) orders,
                  COALESCE(SUM(o.discount_total),0) discounts
             FROM orders o WHERE ${where}`),
        q(`SELECT COALESCE(SUM(oi.quantity),0) qty
             FROM order_items oi JOIN orders o ON o.id = oi.order_id
            WHERE ${where}`),
        q(`SELECT to_char(o.created_at, 'YYYY-MM-DD') AS day,
                  COUNT(*) orders, COALESCE(SUM(o.grand_total),0) revenue
             FROM orders o WHERE ${where}
            GROUP BY 1 ORDER BY 1`),
        q(`SELECT p.method, COUNT(DISTINCT p.order_id) count,
                  COALESCE(SUM(p.amount),0) amount
             FROM payments p JOIN orders o ON o.id = p.order_id
            WHERE ${where}
            GROUP BY p.method ORDER BY amount DESC`),
        q(`SELECT o.source, COUNT(*) orders, COALESCE(SUM(o.grand_total),0) revenue
             FROM orders o WHERE ${where}
            GROUP BY o.source ORDER BY revenue DESC`),
        q(`SELECT o.cashier_id, u.full_name name, u.username,
                  COUNT(*) orders, COALESCE(SUM(o.grand_total),0) revenue
             FROM orders o JOIN users u ON u.id = o.cashier_id
            WHERE ${where} AND o.cashier_id IS NOT NULL
            GROUP BY o.cashier_id, u.full_name, u.username
            ORDER BY revenue DESC`),
        q(`SELECT o.branch_id, b."branchNameEn" name,
                  COUNT(*) orders, COALESCE(SUM(o.grand_total),0) revenue
             FROM orders o JOIN branches b ON b.id = o.branch_id
            WHERE ${where}
            GROUP BY o.branch_id, b."branchNameEn"
            ORDER BY revenue DESC`),
        q(`SELECT oi.product_id, MAX(oi.product_name) name,
                  SUM(oi.quantity) quantity, COALESCE(SUM(oi.line_total),0) revenue
             FROM order_items oi JOIN orders o ON o.id = oi.order_id
            WHERE ${where}
            GROUP BY oi.product_id
            ORDER BY revenue DESC
            LIMIT 10`),
      ]);

    const revenue = num(summary[0]?.revenue);
    const orders = num(summary[0]?.orders);

    // Zero-fill every day in the range so the chart has no gaps.
    const dayMap = new Map<string, { orders: number; revenue: number }>(
      (byDay as { day: string; orders: string; revenue: string }[]).map((r) => [
        r.day,
        { orders: num(r.orders), revenue: num(r.revenue) },
      ]),
    );
    const days: SalesReport['byDay'] = [];
    for (
      let d = new Date(from);
      d <= to && days.length < 400;
      d.setDate(d.getDate() + 1)
    ) {
      const k = ymd(d);
      days.push({ day: k, ...(dayMap.get(k) ?? { orders: 0, revenue: 0 }) });
    }

    return {
      range: { from: fromDay, to: toDay },
      summary: {
        revenue,
        orders,
        itemsSold: num(items[0]?.qty),
        avgOrderValue: orders ? revenue / orders : 0,
        discounts: num(summary[0]?.discounts),
      },
      byDay: days,
      byPaymentMethod: byPay.map((r) => ({
        method: String(r.method as string),
        count: num(r.count),
        amount: num(r.amount),
      })),
      bySource: bySource.map((r) => ({
        source: String(r.source as string),
        orders: num(r.orders),
        revenue: num(r.revenue),
      })),
      byCashier: byCashier.map((r) => ({
        cashierId: String(r.cashier_id as string),
        name: String((r.name as string | null) ?? ''),
        username: (r.username as string | null) ?? null,
        orders: num(r.orders),
        revenue: num(r.revenue),
      })),
      byBranch: byBranch.map((r) => ({
        branchId: String(r.branch_id as string),
        name: String((r.name as string | null) ?? ''),
        orders: num(r.orders),
        revenue: num(r.revenue),
      })),
      topProducts: top.map((r) => ({
        productId: String(r.product_id as string),
        name: String((r.name as string | null) ?? ''),
        quantity: num(r.quantity),
        revenue: num(r.revenue),
      })),
    };
  }
}
