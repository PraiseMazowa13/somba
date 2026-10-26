import { describe, expect, test } from "bun:test";
import { sellerStats, type SellerOrderItem } from "./seller-stats";
import type { Tables } from "@/integrations/supabase/types";

const product: Tables<"products"> = { id: "p1", title: "Sac", category_id: null, shop_id: "shop", created_at: "2026-10-26", updated_at: "2026-10-26", currency: "CDF", description: null, images: [], is_active: true, status: "active", stock: 0, price_cents: 10000 };
function item(id: string, currency: string, status: NonNullable<SellerOrderItem["orders"]>["status"], cents = 10000): SellerOrderItem {
  return { id, order_id: id, product_id: "p1", shop_id: "shop", title: "Sac acheté", quantity: 2, unit_price_cents: cents, created_at: `2026-10-${id.padStart(2, "0")}`, orders: { status, currency, shipping_full_name: "Client", shipping_city: "Kinshasa", created_at: "2026-10-26" } };
}
describe("Seller dashboard statistics", () => {
  test("keeps CDF and USD totals and averages separate", () => {
    const stats = sellerStats([product], [item("1", "CDF", "paid"), item("2", "USD", "delivered", 500)]);
    expect(stats.totals).toEqual([{ currency: "CDF", cents: 20000, average: 20000 }, { currency: "USD", cents: 1000, average: 1000 }]);
  });
  test("does not count unpaid or cancelled orders as sales", () => {
    const stats = sellerStats([product], [item("1", "CDF", "pending_payment"), item("2", "CDF", "cancelled")]);
    expect(stats.totals).toEqual([]);
    expect(stats.recent).toHaveLength(0);
    expect(stats.orderCount).toBe(1);
    expect(stats.pending).toBe(1);
  });
  test("counts each order once and only active published stock", () => {
    const paid = item("1", "CDF", "paid");
    const stats = sellerStats([product, { ...product, id: "p2", status: "draft" }], [paid, { ...paid, id: "line2" }]);
    expect(stats.orderCount).toBe(1);
    expect(stats.active).toBe(1);
    expect(stats.outOfStock).toBe(1);
    expect(stats.top[0].sold).toBe(4);
    expect(stats.recent[0].title).toBe("Sac acheté");
  });
});