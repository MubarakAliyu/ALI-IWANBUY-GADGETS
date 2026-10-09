import { ORDER_STATUS_LABEL, type OrderStatus } from "@aib/shared";
import { Badge, type BadgeProps } from "@/components/ui/badge";

/** One mapping from order status to colour pair, so no screen can invent its own (overview §4.5). */
const ORDER_STATUS_VARIANT: Record<OrderStatus, NonNullable<BadgeProps["variant"]>> = {
  PENDING_PAYMENT: "pending",
  AWAITING_CONFIRMATION: "awaiting",
  PAID: "paid",
  PROCESSING: "paid",
  READY_FOR_PICKUP: "fulfilling",
  SHIPPED: "fulfilling",
  DELIVERED: "complete",
  COMPLETED: "complete",
  CANCELLED: "cancelled",
  REFUNDED: "cancelled",
};

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <Badge variant={ORDER_STATUS_VARIANT[status]} className={className}>
      {ORDER_STATUS_LABEL[status]}
    </Badge>
  );
}

/** The stock state of a variant or product: in stock, nearly gone, or sold out. */
export function StockBadge({
  stock,
  lowStockThreshold = 3,
  className,
}: {
  stock: number;
  lowStockThreshold?: number;
  className?: string;
}) {
  if (stock <= 0) {
    return (
      <Badge variant="danger" className={className}>
        Out of stock
      </Badge>
    );
  }
  if (stock <= lowStockThreshold) {
    return (
      <Badge variant="warning" className={className}>
        {stock === 1 ? "Last one" : `Only ${stock} left`}
      </Badge>
    );
  }
  return (
    <Badge variant="success" className={className}>
      In stock
    </Badge>
  );
}
