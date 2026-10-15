/**
 * The overview (overview §10 A-3).
 *
 * Two rules shape everything here:
 *
 *   • **Days are Lagos days.** An order placed at 00:30 on 1 November in Lagos belongs to November, even
 *     though UTC still says October. Every boundary comes from `lib/dates.ts`, and the aggregations group on
 *     a Lagos-shifted date rather than on the raw timestamp.
 *   • **STAFF never receive the money.** The financial half is not computed for them and is `null` in the
 *     response — hiding it in the client would leave it in the payload, which is not hiding it at all.
 *
 * Revenue is the sum of payment rows, not of order totals: a refund is a negative row (ADR-018), so the two
 * agree by construction and "revenue" never has to be defined twice.
 */

import {
  DASHBOARD_PERIOD_LABEL,
  type Dashboard,
  type DashboardPeriod,
  type DashboardQuery,
  type Kpi,
} from "@aib/shared";
import type { PipelineStage, Types } from "mongoose";
import { LAGOS_UTC_OFFSET, lagosDayEnd, lagosDayKey, lagosDayStart, startOfLagosDay } from "../lib/dates.js";
import { Customer, Order, Payment, Product } from "../models/index.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Orders that are paid for and still owe the customer something. */
const TO_FULFIL = ["PAID", "PROCESSING", "READY_FOR_PICKUP", "SHIPPED"];

export type Range = { from: Date; to: Date; days: number };

/**
 * The window a period covers, and the one immediately before it — which is what every tile's delta compares
 * against. "Last month" compares with the month before it, not with a 30-day slice.
 */
export function resolvePeriod(
  query: DashboardQuery,
  now: Date = new Date(),
): { key: DashboardPeriod; label: string; current: Range; previous: Range } {
  const key: DashboardPeriod = query.period ?? "30d";
  const todayStart = startOfLagosDay(now);

  function span(from: Date, to: Date): Range {
    return { from, to, days: Math.max(1, Math.round((to.getTime() - from.getTime()) / DAY_MS)) };
  }

  /** The same length of time, ending where this one begins. */
  function before(range: Range): Range {
    const length = range.to.getTime() - range.from.getTime();
    return { from: new Date(range.from.getTime() - length), to: range.from, days: range.days };
  }

  /** The first instant of a Lagos month, `offset` months from the one containing `now`. */
  function monthStart(offset: number): Date {
    const [year, month] = lagosDayKey(now).split("-").map(Number);
    const base = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1 + offset, 1));
    return new Date(
      `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, "0")}-01T00:00:00.000${LAGOS_UTC_OFFSET}`,
    );
  }

  let current: Range;
  let previous: Range;

  switch (key) {
    case "today": {
      current = span(todayStart, new Date(todayStart.getTime() + DAY_MS));
      previous = before(current);
      break;
    }
    case "7d": {
      current = span(new Date(todayStart.getTime() - 6 * DAY_MS), new Date(todayStart.getTime() + DAY_MS));
      previous = before(current);
      break;
    }
    case "month": {
      current = span(monthStart(0), new Date(todayStart.getTime() + DAY_MS));
      // The whole of last month, so "this month so far" is read against a complete one.
      previous = span(monthStart(-1), monthStart(0));
      break;
    }
    case "last-month": {
      current = span(monthStart(-1), monthStart(0));
      previous = span(monthStart(-2), monthStart(-1));
      break;
    }
    case "custom": {
      const from = query.from ? lagosDayStart(query.from) : null;
      const to = query.to ? lagosDayEnd(query.to) : null;
      if (from && to && to > from) {
        current = span(from, to);
      } else {
        current = span(new Date(todayStart.getTime() - 29 * DAY_MS), new Date(todayStart.getTime() + DAY_MS));
      }
      previous = before(current);
      break;
    }
    default: {
      current = span(new Date(todayStart.getTime() - 29 * DAY_MS), new Date(todayStart.getTime() + DAY_MS));
      previous = before(current);
    }
  }

  return { key, label: DASHBOARD_PERIOD_LABEL[key], current, previous };
}

function kpi(value: number, previous: number): Kpi {
  return { value, previous };
}

/** `$match` on a date field inside a range: inclusive of the start, exclusive of the end. */
function inRange(field: string, range: Range): PipelineStage.Match {
  return { $match: { [field]: { $gte: range.from, $lt: range.to } } };
}

/** The money taken in a window: confirmed payments less refunds, which is a plain sum (ADR-018). */
async function revenueKobo(range: Range): Promise<number> {
  const [row] = await Payment.aggregate<{ total: number }>([
    inRange("confirmedAt", range),
    { $group: { _id: null, total: { $sum: "$amountKobo" } } },
  ]).exec();
  return row?.total ?? 0;
}

async function refundsKobo(range: Range): Promise<number> {
  const [row] = await Payment.aggregate<{ total: number }>([
    inRange("confirmedAt", range),
    { $match: { amountKobo: { $lt: 0 } } },
    { $group: { _id: null, total: { $sum: "$amountKobo" } } },
  ]).exec();
  return Math.abs(row?.total ?? 0);
}

async function orderCount(range: Range): Promise<number> {
  return Order.countDocuments({ placedAt: { $gte: range.from, $lt: range.to } }).exec();
}

async function unitsSold(range: Range): Promise<number> {
  const [row] = await Order.aggregate<{ total: number }>([
    inRange("placedAt", range),
    { $match: { status: { $nin: ["CANCELLED", "REFUNDED"] } } },
    { $unwind: "$items" },
    { $group: { _id: null, total: { $sum: "$items.qty" } } },
  ]).exec();
  return row?.total ?? 0;
}

async function newCustomers(range: Range): Promise<number> {
  return Customer.countDocuments({ createdAt: { $gte: range.from, $lt: range.to } }).exec();
}

/** Awaiting confirmation is a queue, not a window: it is what is waiting *now*, with its value. */
async function awaitingNow(): Promise<{ count: number; amountKobo: number }> {
  const [row] = await Order.aggregate<{ count: number; amountKobo: number }>([
    { $match: { status: "AWAITING_CONFIRMATION" } },
    { $group: { _id: null, count: { $sum: 1 }, amountKobo: { $sum: "$totalKobo" } } },
  ]).exec();
  return { count: row?.count ?? 0, amountKobo: row?.amountKobo ?? 0 };
}

/**
 * Revenue for each Lagos day in the window, with the quiet days filled in as zero — a chart with gaps in it
 * reads as missing data rather than as a day nobody bought anything.
 */
async function revenueByDay(range: Range): Promise<{ day: string; revenueKobo: number }[]> {
  const rows = await Payment.aggregate<{ _id: string; total: number }>([
    inRange("confirmedAt", range),
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$confirmedAt", timezone: LAGOS_UTC_OFFSET } },
        total: { $sum: "$amountKobo" },
      },
    },
  ]).exec();

  const byDay = new Map(rows.map((row) => [row._id, row.total]));
  const series: { day: string; revenueKobo: number }[] = [];

  for (let at = range.from.getTime(); at < range.to.getTime(); at += DAY_MS) {
    const day = lagosDayKey(new Date(at));
    series.push({ day, revenueKobo: byDay.get(day) ?? 0 });
  }
  return series;
}

async function ordersByStatus(range: Range): Promise<{ status: string; count: number }[]> {
  const rows = await Order.aggregate<{ _id: string; count: number }>([
    inRange("placedAt", range),
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]).exec();
  return rows.map((row) => ({ status: row._id, count: row.count }));
}

async function paymentMethods(
  range: Range,
): Promise<{ method: string; count: number; amountKobo: number }[]> {
  const rows = await Order.aggregate<{ _id: string; count: number; amountKobo: number }>([
    inRange("placedAt", range),
    { $match: { status: { $nin: ["CANCELLED"] } } },
    { $group: { _id: "$paymentMethod", count: { $sum: 1 }, amountKobo: { $sum: "$totalKobo" } } },
    { $sort: { count: -1 } },
  ]).exec();
  return rows.map((row) => ({ method: row._id, count: row.count, amountKobo: row.amountKobo }));
}

async function topProducts(
  range: Range,
): Promise<{ productId: string; name: string; slug: string; units: number; revenueKobo: number }[]> {
  const rows = await Order.aggregate<{
    _id: Types.ObjectId;
    name: string;
    slug: string;
    units: number;
    revenueKobo: number;
  }>([
    inRange("placedAt", range),
    { $match: { status: { $nin: ["CANCELLED", "REFUNDED"] } } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        name: { $first: "$items.name" },
        slug: { $first: "$items.slug" },
        units: { $sum: "$items.qty" },
        revenueKobo: { $sum: "$items.lineTotalKobo" },
      },
    },
    { $sort: { revenueKobo: -1 } },
    { $limit: 5 },
  ]).exec();

  return rows.map((row) => ({
    productId: row._id.toString(),
    name: row.name,
    slug: row.slug,
    units: row.units,
    revenueKobo: row.revenueKobo,
  }));
}

async function lowStock(threshold: number): Promise<Dashboard["operational"]["lowStock"]> {
  const rows = await Product.aggregate<{
    _id: Types.ObjectId;
    name: string;
    slug: string;
    variantLabel: string;
    sku: string;
    stock: number;
  }>([
    { $match: { status: { $ne: "ARCHIVED" } } },
    { $unwind: "$variants" },
    { $match: { "variants.isActive": true, "variants.stock": { $lte: threshold } } },
    {
      $project: {
        _id: "$_id",
        name: "$name",
        slug: "$slug",
        variantLabel: "$variants.label",
        sku: "$variants.sku",
        stock: "$variants.stock",
      },
    },
    { $sort: { stock: 1, name: 1 } },
    { $limit: 10 },
  ]).exec();

  return rows.map((row) => ({
    productId: row._id.toString(),
    name: row.name,
    slug: row.slug,
    variantLabel: row.variantLabel,
    sku: row.sku,
    stock: row.stock,
  }));
}

async function lowStockCount(threshold: number): Promise<number> {
  const [row] = await Product.aggregate<{ count: number }>([
    { $match: { status: { $ne: "ARCHIVED" } } },
    { $unwind: "$variants" },
    { $match: { "variants.isActive": true, "variants.stock": { $lte: threshold } } },
    { $count: "count" },
  ]).exec();
  return row?.count ?? 0;
}

async function recentOrders(): Promise<Dashboard["operational"]["recentOrders"]> {
  const orders = await Order.find()
    .sort({ placedAt: -1 })
    .limit(8)
    .populate("customer", "firstName lastName")
    .lean()
    .exec();

  return orders.map((order) => {
    const customer = order.customer as unknown as { firstName?: string; lastName?: string } | null;
    return {
      orderNumber: order.orderNumber,
      customerName: customer?.firstName
        ? `${customer.firstName} ${customer.lastName ?? ""}`.trim()
        : "Customer",
      status: order.status,
      totalKobo: order.totalKobo,
      placedAt: order.placedAt.toISOString(),
    };
  });
}

async function toFulfilCount(range?: Range): Promise<number> {
  const filter: Record<string, unknown> = { status: { $in: TO_FULFIL } };
  if (range) {
    filter.placedAt = { $gte: range.from, $lt: range.to };
  }
  return Order.countDocuments(filter).exec();
}

/**
 * The whole overview in one response. `includeFinancial` is decided by the caller from the acting admin's
 * role, and when it is false none of the money aggregations are even run.
 */
export async function buildDashboard(
  query: DashboardQuery,
  options: { includeFinancial: boolean; lowStockThreshold: number },
): Promise<Dashboard> {
  const { key, label, current, previous } = resolvePeriod(query);

  const [awaiting, toFulfilNow, toFulfilBefore, units, unitsBefore, lowCount, low, statuses, recent] =
    await Promise.all([
      awaitingNow(),
      toFulfilCount(),
      toFulfilCount(previous),
      unitsSold(current),
      unitsSold(previous),
      lowStockCount(options.lowStockThreshold),
      lowStock(options.lowStockThreshold),
      ordersByStatus(current),
      recentOrders(),
    ]);

  const operational: Dashboard["operational"] = {
    // A queue has no "previous": it is what is waiting right now, so the tile shows no delta.
    awaitingConfirmation: kpi(awaiting.count, awaiting.count),
    toFulfil: kpi(toFulfilNow, toFulfilBefore),
    unitsSold: kpi(units, unitsBefore),
    lowStockVariants: kpi(lowCount, lowCount),
    ordersByStatus: statuses,
    recentOrders: recent,
    lowStock: low,
  };

  if (!options.includeFinancial) {
    return {
      period: {
        key,
        label,
        from: current.from.toISOString(),
        to: current.to.toISOString(),
        days: current.days,
      },
      operational,
      financial: null,
    };
  }

  const [revenue, revenueBefore, orders, ordersBefore, refunds, refundsBefore, customers, customersBefore] =
    await Promise.all([
      revenueKobo(current),
      revenueKobo(previous),
      orderCount(current),
      orderCount(previous),
      refundsKobo(current),
      refundsKobo(previous),
      newCustomers(current),
      newCustomers(previous),
    ]);

  const [series, methods, top] = await Promise.all([
    revenueByDay(current),
    paymentMethods(current),
    topProducts(current),
  ]);

  return {
    period: {
      key,
      label,
      from: current.from.toISOString(),
      to: current.to.toISOString(),
      days: current.days,
    },
    operational,
    financial: {
      revenueKobo: kpi(revenue, revenueBefore),
      orders: kpi(orders, ordersBefore),
      // Integer kobo throughout: the average is rounded here rather than carried as a fraction of a kobo.
      averageOrderKobo: kpi(
        orders > 0 ? Math.round(revenue / orders) : 0,
        ordersBefore > 0 ? Math.round(revenueBefore / ordersBefore) : 0,
      ),
      awaitingKobo: kpi(awaiting.amountKobo, awaiting.amountKobo),
      refundsKobo: kpi(refunds, refundsBefore),
      newCustomers: kpi(customers, customersBefore),
      revenueByDay: series,
      paymentMethods: methods,
      topProducts: top,
    },
  };
}
