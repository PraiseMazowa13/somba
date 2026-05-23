import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { formatPrice } from "@/lib/money";
import { Package, Trash2 } from "lucide-react";

export const Route = createFileRoute("/seller/products")({
  component: SellerProducts,
});

const schema = z.object({
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().max(2000).optional(),
  price_cents: z.number().int().min(0).max(1_000_000_000),
  stock: z.number().int().min(0).max(1_000_000),
  category_id: z.string().uuid().optional(),
});

function SellerProducts() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: shop } = useQuery({
    queryKey: ["my-shop", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("shops").select("id,name,status").eq("owner_id", user!.id).maybeSingle()).data,
  });

  const { data: cats } = useQuery({
    queryKey: ["all-cats"],
    queryFn: async () => (await supabase.from("categories").select("id,name").order("name")).data ?? [],
  });

  const { data: products } = useQuery({
    queryKey: ["seller-products", shop?.id],
    enabled: !!shop?.id,
    queryFn: async () => (await supabase.from("products").select("*").eq("shop_id", shop!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const [form, setForm] = useState({ title: "", description: "", price: "", stock: "1", category_id: "", image: "" });
  const [saving, setSaving] = useState(false);

  if (!shop) return <div className="card-zandu p-6">Créez d'abord votre boutique dans l'onglet « Boutique ».</div>;

  async function uploadImg(file: File) {
    const path = `${user!.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setForm((f) => ({ ...f, image: data.publicUrl }));
  }

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    const priceNum = Math.round(parseFloat(form.price.replace(",", ".")) * 100);
    const stockNum = parseInt(form.stock, 10);
    const parsed = schema.safeParse({
      title: form.title,
      description: form.description,
      price_cents: priceNum,
      stock: stockNum,
      category_id: form.category_id || undefined,
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSaving(true);
    const { error } = await supabase.from("products").insert({
      shop_id: shop!.id,
      category_id: parsed.data.category_id ?? null,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      price_cents: parsed.data.price_cents,
      stock: parsed.data.stock,
      images: form.image ? [form.image] : [],
      status: "active",
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Produit ajouté");
    setForm({ title: "", description: "", price: "", stock: "1", category_id: "", image: "" });
    qc.invalidateQueries({ queryKey: ["seller-products"] });
  }

  async function remove(id: string) {
    await supabase.from("products").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["seller-products"] });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Mes produits</h1>

      {shop.status !== "approved" && (
        <div className="mb-6 rounded-md border border-border bg-secondary/50 p-4 text-sm">
          Votre boutique est <strong>{shop.status === "pending" ? "en attente d'approbation" : "suspendue"}</strong>. Vous pouvez créer vos produits, ils seront visibles publiquement dès approbation.
        </div>
      )}

      <form onSubmit={addProduct} className="card-zandu p-6 space-y-4 mb-8">
        <h2 className="font-semibold">Ajouter un produit</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><Label>Titre</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={150} /></div>
          <div><Label>Prix (XOF)</Label><Input type="number" min="0" step="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></div>
          <div><Label>Stock</Label><Input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required /></div>
          <div>
            <Label>Catégorie</Label>
            <select className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">— Aucune —</option>
              {cats?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Image</Label>
            <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImg(e.target.files[0])} />
            {form.image && <img src={form.image} className="mt-2 h-20 w-20 object-cover rounded-md border border-border" />}
          </div>
          <div className="md:col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} maxLength={2000} /></div>
        </div>
        <Button disabled={saving}>{saving ? "Ajout…" : "Ajouter le produit"}</Button>
      </form>

      <div className="space-y-3">
        {products?.length ? products.map((p) => (
          <div key={p.id} className="card-zandu p-4 flex gap-4 items-center">
            <div className="h-16 w-16 bg-secondary rounded-md flex items-center justify-center overflow-hidden flex-shrink-0">
              {p.images?.[0] ? <img src={p.images[0]} className="h-full w-full object-cover" /> : <Package className="h-6 w-6 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium">{p.title}</div>
              <div className="text-xs text-muted-foreground">Stock : {p.stock} · {p.status}</div>
            </div>
            <div className="font-semibold">{formatPrice(p.price_cents, p.currency)}</div>
            <Button variant="ghost" size="sm" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        )) : <div className="card-zandu p-12 text-center text-muted-foreground">Aucun produit. Ajoutez votre premier produit ci-dessus.</div>}
      </div>
    </div>
  );
}
