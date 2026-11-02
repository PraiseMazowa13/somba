// Pure, browser-safe helpers for per-shop themes and promotions.
export const SHOP_FONTS = {
  jakarta: { label: "Moderne (Plus Jakarta Sans)", family: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif' },
  outfit: { label: "Géométrique (Outfit)", family: '"Outfit", ui-sans-serif, system-ui, sans-serif' },
  space: { label: "Tech (Space Grotesk)", family: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif' },
  playfair: { label: "Luxe (Playfair Display)", family: '"Playfair Display", Georgia, serif' },
  lora: { label: "Élégant (Lora)", family: '"Lora", Georgia, serif' },
  dmserif: { label: "Éditorial (DM Serif Display)", family: '"DM Serif Display", Georgia, serif' },
} as const;
export type ShopFontKey = keyof typeof SHOP_FONTS;
export const DEFAULT_SHOP_COLOR = "#2563EB";

export function normalizeHex(input: string | null | undefined): string {
  const v = (input ?? "").trim();
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toUpperCase();
  if (/^#[0-9a-f]{3}$/i.test(v)) return ("#" + v.slice(1).split("").map((c) => c + c).join("")).toUpperCase();
  return DEFAULT_SHOP_COLOR;
}

function toRgb(hex: string) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function toHex(rgb: number[]) { return "#" + rgb.map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, "0")).join("").toUpperCase(); }
function mix(hex: string, target: number[], t: number) { const a = toRgb(hex); return toHex(a.map((c, i) => c + (target[i] - c) * t)); }
export function luminance(hex: string) {
  const [r, g, b] = toRgb(hex).map((c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string) { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); }

/** Darken the chosen color until white text on it reaches 4.5:1. */
export function accessibleAccent(input: string | null | undefined) {
  const base = normalizeHex(input);
  let c = base;
  for (let i = 1; i <= 20 && contrast(c, "#FFFFFF") < 4.5; i++) c = mix(base, [0, 0, 0], i * 0.05);
  return c;
}

export function shopThemeVars(color: string | null | undefined, font: string | null | undefined): Record<string, string> {
  const accent = accessibleAccent(color);
  const family = (SHOP_FONTS as Record<string, { family: string }>)[font ?? ""]?.family ?? SHOP_FONTS.jakarta.family;
  return {
    "--primary": accent,
    "--primary-foreground": "#FFFFFF",
    "--brand": accent,
    "--ring": accent,
    "--shop-strong": mix(accent, [0, 0, 0], 0.25),
    "--shop-soft": mix(accent, [255, 255, 255], 0.9),
    "--shop-muted": mix(accent, [255, 255, 255], 0.75),
    "--shop-font": family,
  };
}

export function discountPercent(price: number, compareAt: number | null | undefined) {
  if (!compareAt || compareAt <= price || price < 0) return 0;
  return Math.round((1 - price / compareAt) * 100);
}

/** Home page: at most `max` products per shop, keeping the incoming order (featured, then newest). */
export function limitPerShop<T extends { shop_id: string }>(items: T[], max = 3): T[] {
  const count = new Map<string, number>();
  return items.filter((p) => { const n = count.get(p.shop_id) ?? 0; if (n >= max) return false; count.set(p.shop_id, n + 1); return true; });
}

export type ShopSort = "recent" | "price-up" | "price-down" | "promo" | "featured";
type SortableProduct = { title: string; price_cents: number; compare_at_price_cents?: number | null; is_featured?: boolean; created_at?: string; category_id?: string | null; currency: string };
export function shopCatalog<T extends SortableProduct>(items: T[], q: string, category: string, sort: ShopSort): T[] {
  const needle = q.trim().toLocaleLowerCase("fr");
  const list = items.filter((p) => (!needle || p.title.toLocaleLowerCase("fr").includes(needle)) && (!category || p.category_id === category)
    && (sort !== "promo" || discountPercent(p.price_cents, p.compare_at_price_cents) > 0)
    && (sort !== "featured" || !!p.is_featured));
  const recent = (a: T, b: T) => (b.created_at ?? "").localeCompare(a.created_at ?? "");
  return [...list].sort((a, b) => {
    if (sort === "price-up" || sort === "price-down") return a.currency.localeCompare(b.currency) || (sort === "price-up" ? a.price_cents - b.price_cents : b.price_cents - a.price_cents);
    if (sort === "promo") return discountPercent(b.price_cents, b.compare_at_price_cents) - discountPercent(a.price_cents, a.compare_at_price_cents) || recent(a, b);
    return recent(a, b);
  });
}
