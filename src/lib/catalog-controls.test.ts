import { expect, test } from "bun:test";
import { filterProducts, shopShareUrl } from "./catalog-controls";
const base = { category_id: "accessories", currency: "CDF", price_cents: 1000, stock: 2, is_active: true, is_featured: false, status: "active", created_at: "2026-11-01" };
const products = [{ ...base, id: "a", title: "Sac" }, { ...base, id: "b", title: "Montre", is_featured: true, price_cents: 2000 }, { ...base, id: "c", title: "Sac caché", is_active: false, stock: 0 }];
test("seller filters concern products, including hidden, featured and stock", () => {
  expect(filterProducts(products, "sac", "visible", "accessories", "CDF", "recent").map(p => p.id)).toEqual(["a"]);
  expect(filterProducts(products, "", "featured", "", "", "recent").map(p => p.id)).toEqual(["b"]);
  expect(filterProducts(products, "", "hidden", "", "", "recent").map(p => p.id)).toEqual(["c"]);
  expect(filterProducts(products, "", "stock", "", "", "recent").map(p => p.id)).toEqual(["c"]);
});
test("sorts product price within each currency rather than comparing currencies", () => {
  expect(filterProducts(products, "", "visible", "", "CDF", "price-down").map(p => p.id)).toEqual(["b", "a"]);
});
test("shared boutique links target the public site, not the editor", () => {
  expect(shopShareUrl("kin-mode")).toBe("https://somba.lovable.app/shops/kin-mode");
});