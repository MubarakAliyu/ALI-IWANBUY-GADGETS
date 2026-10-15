import type { Metadata } from "next";
import type { Dashboard, DashboardPeriod, OrderStatus } from "@aib/shared";
import Link from "next/link";
import {
  AlertTriangleIcon,
  BanknoteIcon,
  ClockIcon,
  PackageIcon,
  ReceiptIcon,
  RotateCcwIcon,
  ShoppingBagIcon,
  UserPlusIcon,
} from "lucide-react";
import { PaymentMethodChart, RevenueChart, StatusChart } from "@/components/admin/dashboard-charts";
import { KpiTile } from "@/components/admin/kpi-tile";
import { PeriodSelector } from "@/components/admin/period-selector";
import { StatusBadge } from "@/components/ui/status-badge";
import { getDashboard } from "@/lib/admin";
import { formatDate } from "@/lib/date";
import { formatNaira } from "@/lib/money";

export const metadata: Metadata = { title: "Overview" };

/**
 * The overview (A-3). Rendered on the server, so the figures are in the HTML rather than appearing a moment
 * after it — the first thing the owner sees in the morning should be the numbers, not eight skeletons.
 *
 * What a STAFF member gets back has no `financial` half at all, so the money simply is not rendered. That is
 * the server's decision, made before the response was sent.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const data = await getDashboard({
    period: params.period as DashboardPeriod | undefined,
    from: params.from,
    to: params.to,
  });

  const { operational, financial } = data;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-h1 text-brand-navy">Overview</h1>
          <p className="text-body-sm text-text-muted">
            {data.period.label} · {formatDate(data.period.from)} to {formatDate(data.period.to)}
          </p>
        </div>
      </div>

      <PeriodSelector period={data.period.key} from={params.from} to={params.to} />

      <section aria-label="Key figures" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {financial ? (
          <>
            <KpiTile label="Revenue" kpi={financial.revenueKobo} format="money" icon={BanknoteIcon} />
            <KpiTile label="Orders" kpi={financial.orders} icon={ShoppingBagIcon} />
            <KpiTile
              label="Average order"
              kpi={financial.averageOrderKobo}
              format="money"
              icon={ReceiptIcon}
            />
            <KpiTile
              label="Awaiting confirmation"
              kpi={financial.awaitingKobo}
              format="money"
              icon={ClockIcon}
              compare={false}
              hint={`${operational.awaitingConfirmation.value} order${
                operational.awaitingConfirmation.value === 1 ? "" : "s"
              } waiting now`}
            />
            <KpiTile
              label="Refunds"
              kpi={financial.refundsKobo}
              format="money"
              icon={RotateCcwIcon}
              inverted
            />
            <KpiTile label="New customers" kpi={financial.newCustomers} icon={UserPlusIcon} />
          </>
        ) : (
          <KpiTile
            label="Awaiting confirmation"
            kpi={operational.awaitingConfirmation}
            icon={ClockIcon}
            compare={false}
            hint="Waiting on a manager"
          />
        )}

        <KpiTile
          label="To fulfil"
          kpi={operational.toFulfil}
          icon={PackageIcon}
          compare={false}
          hint="Paid for, not yet with the customer"
        />
        <KpiTile
          label="Low stock"
          kpi={operational.lowStockVariants}
          icon={AlertTriangleIcon}
          compare={false}
          hint="Variants at or below the threshold"
          inverted
        />
        {financial ? null : <KpiTile label="Units sold" kpi={operational.unitsSold} icon={ShoppingBagIcon} />}
      </section>

      {financial ? (
        <section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <div className="rounded-lg border border-grey-200 bg-white p-4">
            <RevenueChart data={financial.revenueByDay} />
          </div>
          <div className="rounded-lg border border-grey-200 bg-white p-4">
            <PaymentMethodChart data={financial.paymentMethods} />
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-grey-200 bg-white p-4">
          <StatusChart data={operational.ordersByStatus} />
        </div>

        {financial ? (
          <TopProducts products={financial.topProducts} />
        ) : (
          <LowStock items={operational.lowStock} />
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <RecentOrders orders={operational.recentOrders} />
        {financial ? <LowStock items={operational.lowStock} /> : null}
      </section>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="grid content-start gap-3 rounded-lg border border-grey-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-body-sm font-semibold text-brand-navy">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function RecentOrders({ orders }: { orders: Dashboard["operational"]["recentOrders"] }) {
  return (
    <Panel
      title="Latest orders"
      action={
        <Link href="/admin/orders" className="text-caption font-semibold text-brand-primary hover:underline">
          All orders
        </Link>
      }
    >
      {orders.length === 0 ? (
        <p className="py-6 text-center text-body-sm text-text-muted">No orders yet.</p>
      ) : (
        <ul className="divide-y divide-grey-200">
          {orders.map((order) => (
            <li key={order.orderNumber} className="flex items-center justify-between gap-3 py-2.5">
              <div className="grid min-w-0">
                <Link
                  href={`/admin/orders/${order.orderNumber}`}
                  className="truncate text-body-sm font-semibold text-brand-navy hover:text-brand-primary"
                >
                  {order.orderNumber}
                </Link>
                <span className="truncate text-caption text-text-muted">
                  {order.customerName} · {formatDate(order.placedAt)}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <StatusBadge status={order.status as OrderStatus} />
                <span className="text-body-sm font-semibold text-brand-navy tabular-nums">
                  {formatNaira(order.totalKobo)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function LowStock({ items }: { items: Dashboard["operational"]["lowStock"] }) {
  return (
    <Panel
      title="Running low"
      action={
        <Link
          href="/admin/products"
          className="text-caption font-semibold text-brand-primary hover:underline"
        >
          Products
        </Link>
      }
    >
      {items.length === 0 ? (
        <p className="py-6 text-center text-body-sm text-text-muted">Nothing is running low.</p>
      ) : (
        <ul className="divide-y divide-grey-200">
          {items.map((item) => (
            <li key={item.sku} className="flex items-center justify-between gap-3 py-2.5">
              <div className="grid min-w-0">
                <span className="truncate text-body-sm font-semibold text-brand-navy">{item.name}</span>
                <span className="truncate text-caption text-text-muted">
                  {item.variantLabel} · {item.sku}
                </span>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-caption font-semibold tabular-nums ${
                  item.stock === 0 ? "bg-danger-tint text-danger-text" : "bg-warning-tint text-warning-text"
                }`}
              >
                {item.stock === 0 ? "Out of stock" : `${item.stock} left`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function TopProducts({ products }: { products: NonNullable<Dashboard["financial"]>["topProducts"] }) {
  const best = products[0]?.revenueKobo ?? 0;

  return (
    <Panel title="Best sellers">
      {products.length === 0 ? (
        <p className="py-6 text-center text-body-sm text-text-muted">Nothing sold in this period.</p>
      ) : (
        <ul className="grid gap-3">
          {products.map((product) => (
            <li key={product.productId} className="grid gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-body-sm text-brand-navy">{product.name}</span>
                <span className="shrink-0 text-body-sm font-semibold text-brand-navy tabular-nums">
                  {formatNaira(product.revenueKobo)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* A bar rather than a number: the comparison is the point, not the precise width. */}
                <div aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-grey-100">
                  <div
                    className="h-full rounded-full bg-brand-primary"
                    style={{ width: `${best > 0 ? Math.max(4, (product.revenueKobo / best) * 100) : 0}%` }}
                  />
                </div>
                <span className="shrink-0 text-caption text-text-muted tabular-nums">
                  {product.units} sold
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
