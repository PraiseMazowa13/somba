import { describe, expect, test } from "bun:test";
import { accessibleAccent, contrast, discountPercent, limitPerShop, shopCatalog } from "./shop-theme";

describe("shop theme", () => {
  test("light colors are darkened to readable 4.5:1 on white text", () => {
    expect(contrast(accessibleAccent("#FDE047"), "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
  });
  test("discount uses real old and new prices", () => {
    expect(discountPercent(7500, 10000)).toBe(25);
    expect(discountPercent(10000, 9000)).toBe(0);
  });
  test("home shows max 3 products per shop, in given order", () => {
    const items = ["a", "a", "a", "a", "b"].map((shop_id, i) => ({ shop_id, i }));
    expect(limitPerShop(items).map((x) => x.i)).toEqual([0, 1, 2, 4]);
  });
  test("promo sort keeps only discounted items, biggest first", () => {
    const p = [
      { title: "x", price_cents: 90, compare_at_price_cents: 100, currency: "USD" },
      { title: "y", price_cents: 50, compare_at_price_cents: 100, currency: "USD" },
      { title: "z", price_cents: 50, compare_at_price_cents: null, currency: "USD" },
    ];
    expect(shopCatalog(p, "", "", "promo").map((x) => x.title)).toEqual(["y", "x"]);
  });
});
