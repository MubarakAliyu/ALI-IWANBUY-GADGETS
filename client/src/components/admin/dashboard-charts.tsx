"use client";

import type { Dashboard } from "@aib/shared";
import { ORDER_STATUS_LABEL } from "@aib/shared";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate } from "@/lib/date";
import { formatNaira, formatNairaPlain } from "@/lib/money";
import { BRAND_COLOURS } from "@/styles/tokens";

/**
 * The overview's three charts (A-3).
 *
 * Brand colours only, from the one module that holds them as literals — recharts takes colours as props, so
 * a Tailwind class is not an option here. Every chart has an accessible table-shaped summary behind it,
 * because a chart alone tells a screen-reader user nothing.
 *
 * Grid lines, legends and 3D are all absent on purpose: the axis labels and the tooltip carry the numbers,
 * and anything else is ink that is not data.
 */

const AXIS = { stroke: BRAND_COLOURS["text-muted"], fontSize: 11, tickLine: false, axisLine: false };

function TooltipBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-grey-200 bg-white px-3 py-2 text-caption shadow-md">
      <p className="text-text-muted">{label}</p>
      <p className="font-semibold text-brand-navy tabular-nums">{value}</p>
    </div>
  );
}

/** Revenue for each day of the window. */
export function RevenueChart({ data }: { data: Dashboard["financial"] extends null ? never : { day: string; revenueKobo: number }[] }) {
  const points = data.map((point) => ({ ...point, naira: point.revenueKobo / 100 }));

  return (
    <figure className="grid gap-3">
      <figcaption className="text-body-sm font-semibold text-brand-navy">Revenue by day</figcaption>

      <div className="h-56 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BRAND_COLOURS["brand-primary"]} stopOpacity={0.28} />
                <stop offset="100%" stopColor={BRAND_COLOURS["brand-primary"]} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              {...AXIS}
              tickFormatter={(day: string) => formatDate(`${day}T12:00:00.000Z`).slice(0, 6)}
              minTickGap={24}
            />
            <YAxis
              {...AXIS}
              width={56}
              tickFormatter={(naira: number) => (naira >= 1000 ? `${Math.round(naira / 1000)}k` : String(naira))}
            />
            <Tooltip
              cursor={{ stroke: BRAND_COLOURS["grey-200"] }}
              content={({ active, payload }) =>
                active && payload?.[0] ? (
                  <TooltipBox
                    label={formatDate(`${(payload[0].payload as { day: string }).day}T12:00:00.000Z`)}
                    value={formatNaira((payload[0].payload as { revenueKobo: number }).revenueKobo)}
                  />
                ) : null
              }
            />
            <Area
              type="monotone"
              dataKey="naira"
              stroke={BRAND_COLOURS["brand-primary"]}
              strokeWidth={2}
              fill="url(#revenue-fill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <ChartTable
        caption="Revenue by day"
        head={["Day", "Revenue"]}
        rows={data.map((point) => [formatDate(`${point.day}T12:00:00.000Z`), formatNaira(point.revenueKobo)])}
      />
    </figure>
  );
}

/** How many orders are sitting in each status. */
export function StatusChart({ data }: { data: { status: string; count: number }[] }) {
  const points = data.map((row) => ({
    ...row,
    label: (ORDER_STATUS_LABEL as Record<string, string>)[row.status] ?? row.status,
  }));

  return (
    <figure className="grid gap-3">
      <figcaption className="text-body-sm font-semibold text-brand-navy">Orders by status</figcaption>

      {/* Horizontal, because "Awaiting confirmation" and "Ready for pickup" do not fit under a vertical bar
          without being turned on their side and overlapping each other. */}
      <div className="w-full" style={{ height: Math.max(160, points.length * 34 + 24) }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
            <XAxis type="number" {...AXIS} allowDecimals={false} hide />
            <YAxis type="category" dataKey="label" {...AXIS} width={132} interval={0} />
            <Tooltip
              cursor={{ fill: BRAND_COLOURS["grey-100"] }}
              content={({ active, payload }) =>
                active && payload?.[0] ? (
                  <TooltipBox
                    label={(payload[0].payload as { label: string }).label}
                    value={`${(payload[0].payload as { count: number }).count} orders`}
                  />
                ) : null
              }
            />
            <Bar dataKey="count" fill={BRAND_COLOURS["brand-primary"]} radius={[0, 4, 4, 0]} maxBarSize={18}>
              <LabelList
                dataKey="count"
                position="right"
                fill={BRAND_COLOURS["brand-navy"]}
                fontSize={11}
                fontWeight={600}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ChartTable
        caption="Orders by status"
        head={["Status", "Orders"]}
        rows={points.map((row) => [row.label, String(row.count)])}
      />
    </figure>
  );
}

const METHOD_LABEL: Record<string, string> = {
  BANK_TRANSFER: "Bank transfer",
  PAY_ON_DELIVERY: "Pay on delivery",
};

/** Two slices, in the two brand blues — this is a split, not a palette. */
const DONUT_COLOURS = [BRAND_COLOURS["brand-primary"], BRAND_COLOURS["primary-700"]];

export function PaymentMethodChart({
  data,
}: {
  data: { method: string; count: number; amountKobo: number }[];
}) {
  const points = data.map((row) => ({ ...row, label: METHOD_LABEL[row.method] ?? row.method }));
  const total = points.reduce((sum, row) => sum + row.count, 0);

  return (
    <figure className="grid gap-3">
      <figcaption className="text-body-sm font-semibold text-brand-navy">How people pay</figcaption>

      {total === 0 ? (
        <p className="py-10 text-center text-body-sm text-text-muted">No orders in this period.</p>
      ) : (
        <>
          <div className="h-48 w-full" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={points}
                  dataKey="count"
                  nameKey="label"
                  innerRadius="58%"
                  outerRadius="85%"
                  paddingAngle={2}
                  stroke="none"
                >
                  {points.map((row, index) => (
                    <Cell key={row.method} fill={DONUT_COLOURS[index % DONUT_COLOURS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.[0] ? (
                      <TooltipBox
                        label={(payload[0].payload as { label: string }).label}
                        value={`${(payload[0].payload as { count: number }).count} orders · ₦${formatNairaPlain(
                          (payload[0].payload as { amountKobo: number }).amountKobo,
                        )}`}
                      />
                    ) : null
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="grid gap-1.5">
            {points.map((row, index) => (
              <li key={row.method} className="flex items-center justify-between gap-3 text-body-sm">
                <span className="flex items-center gap-2 text-text-muted">
                  <span
                    aria-hidden="true"
                    className="size-2.5 rounded-full"
                    style={{ background: DONUT_COLOURS[index % DONUT_COLOURS.length] }}
                  />
                  {row.label}
                </span>
                <span className="font-semibold text-brand-navy tabular-nums">
                  {Math.round((row.count / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </figure>
  );
}

/**
 * The same numbers as a table, available to a screen reader and hidden from sight. The chart beside it is
 * `aria-hidden`, so this is the only version that is announced — and it is the complete one.
 */
function ChartTable({ caption, head, rows }: { caption: string; head: string[]; rows: string[][] }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {head.map((cell) => (
            <th key={cell} scope="col">
              {cell}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.join("-")}>
            {row.map((cell, index) =>
              index === 0 ? (
                <th key={cell} scope="row">
                  {cell}
                </th>
              ) : (
                <td key={cell}>{cell}</td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
