import { supabase } from "@/integrations/supabase/client";

/**
 * Ajoute un produit au panier de l'utilisateur courant.
 * Crée le panier s'il n'existe pas. Incrémente la quantité si l'item est déjà présent.
 */
export async function addToCart(userId: string, productId: string, quantity = 1) {
  // 1. Récupérer ou créer le panier
  let { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!cart) {
    const { data: created, error } = await supabase
      .from("carts")
      .insert({ user_id: userId })
      .select("id")
      .single();
    if (error) throw error;
    cart = created;
  }

  // 2. Vérifier si le produit est déjà dans le panier
  const { data: existing } = await supabase
    .from("cart_items")
    .select("id,quantity")
    .eq("cart_id", cart!.id)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: existing.quantity + quantity })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("cart_items")
      .insert({ cart_id: cart!.id, product_id: productId, quantity });
    if (error) throw error;
  }
}

/**
 * Construit un message WhatsApp pour un récap de commande.
 */
export function buildWhatsAppMessage(opts: {
  shopName: string;
  items: { title: string; quantity: number; price_cents: number; currency: string }[];
  customerName: string;
  customerCity: string;
}) {
  const lines: string[] = [];
  lines.push(`Bonjour ${opts.shopName} 👋`);
  lines.push(`Je souhaite passer la commande suivante :`);
  lines.push("");
  let total = 0;
  let currency = "CDF";
  for (const it of opts.items) {
    const sub = it.price_cents * it.quantity;
    total += sub;
    currency = it.currency;
    lines.push(`• ${it.title} × ${it.quantity} — ${(sub / 100).toLocaleString("fr-FR")} ${it.currency}`);
  }
  lines.push("");
  lines.push(`Total : ${(total / 100).toLocaleString("fr-FR")} ${currency}`);
  lines.push("");
  lines.push(`Nom : ${opts.customerName}`);
  lines.push(`Ville : ${opts.customerCity}`);
  lines.push("");
  lines.push(`Merci de me confirmer la disponibilité et les modalités de livraison.`);
  return lines.join("\n");
}

/** Normalise un numéro de téléphone pour WhatsApp (chiffres seulement, sans +). */
export function normalizeWhatsApp(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, "");
  return digits.length >= 8 ? digits : null;
}
