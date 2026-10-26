import type { Tables } from "@/integrations/supabase/types";

export type SellerOrderItem = Tables<"order_items"> & {
  orders: Pick<Tables<"orders">, "status" | "currency" | "shipping_full_name" | "shipping_city" | "created_at"> | null;
};

export function sellerStats(products: Tables<"products">[], items: SellerOrderItem[]) {
  const sales = items.filter((item) => item.orders && ["paid", "shipped", "delivered"].includes(item.orders.status));
  const revenue = new Map<string, { cents: number; orders: Set<string> }>();
  const sold = new Map<string, number>();
  for (const item of sales) {
    const currency = item.orders?.currency;
    if (!currency) continue;
    const total = revenue.get(currency) ?? { cents: 0, orders: new Set<string>() };
    total.cents += item.unit_price_cents * item.quantity;
    total.orders.add(item.order_id);
    revenue.set(currency, total);
    if (item.product_id) sold.set(item.product_id, (sold.get(item.product_id) ?? 0) + item.quantity);
  }
  return {
    productCount: products.length,
    active: products.filter((product) => product.is_active && product.status === "active").length,
    outOfStock: products.filter((product) => product.is_active && product.status === "active" && product.stock <= 0).length,
    orderCount: new Set(items.filter((item) => item.orders && item.orders.status !== "cancelled").map((item) => item.order_id)).size,
    pending: new Set(items.filter((item) => item.orders?.status === "pending_payment").map((item) => item.order_id)).size,
    totals: [...revenue].map(([currency, total]) => ({ currency, cents: total.cents, average: Math.round(total.cents / total.orders.size) })),
    top: products.map((product) => ({ ...product, sold: sold.get(product.id) ?? 0 })).filter((product) => product.sold > 0).sort((a, b) => b.sold - a.sold).slice(0, 5),
    recent: [...sales].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5),
  };
}