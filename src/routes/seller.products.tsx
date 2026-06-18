import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { formatPrice } from "@/lib/money";
import { Package, Trash2, Edit, Copy, Eye, EyeOff } from "lucide-react";

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

type EditForm = {
  id: string;
  title: string;
  description: string;
  price: string;
  stock: string;
  category_id: string;
  image: string;
  is_active: boolean;
};

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

  const emptyForm = { title: "", description: "", price: "", stock: "1", category_id: "", image: "" };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<EditForm | null>(null);

  if (!shop) return <div className="card-zandu p-6">Créez d'abord votre boutique dans l'onglet « Boutique ».</div>;

  async function uploadImg(file: File, setter: (url: string) => void) {
    const path = `${user!.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setter(data.publicUrl);
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
    setForm(emptyForm);
    qc.invalidateQueries({ queryKey: ["seller-products"] });
  }

  async function remove(id: string) {
    if (!window.confirm("Supprimer ce produit ?")) return;
    await supabase.from("products").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["seller-products"] });
    toast.success("Produit supprimé");
  }

  async function toggleActive(p: any) {
    const next = !p.is_active;
    const { error } = await supabase.from("products").update({ is_active: next } as any).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success(next ? "Produit visible" : "Produit masqué");
    qc.invalidateQueries({ queryKey: ["seller-products"] });
  }

  async function duplicate(p: any) {
    const { error } = await supabase.from("products").insert({
      shop_id: shop!.id,
      category_id: p.category_id,
      title: `${p.title} (copie)`,
      description: p.description,
      price_cents: p.price_cents,
      stock: p.stock,
      images: p.images ?? [],
      status: "active",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Produit dupliqué");
    qc.invalidateQueries({ queryKey: ["seller-products"] });
  }

  function openEdit(p: any) {
    setEditing({
      id: p.id,
      title: p.title,
      description: p.description ?? "",
      price: String(p.price_cents / 100),
      stock: String(p.stock),
      category_id: p.category_id ?? "",
      image: p.images?.[0] ?? "",
      is_active: p.is_active ?? true,
    });
  }

  async function saveEdit() {
    if (!editing) return;
    const priceNum = Math.round(parseFloat(editing.price.replace(",", ".")) * 100);
    const stockNum = parseInt(editing.stock, 10);
    const parsed = schema.safeParse({
      title: editing.title,
      description: editing.description,
      price_cents: priceNum,
      stock: stockNum,
      category_id: editing.category_id || undefined,
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    const { error } = await supabase.from("products").update({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      price_cents: parsed.data.price_cents,
      stock: parsed.data.stock,
      category_id: parsed.data.category_id ?? null,
      images: editing.image ? [editing.image] : [],
    } as any).eq("id", editing.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Produit mis à jour");
    setEditing(null);
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
          <div><Label>Prix</Label><Input type="number" min="0" step="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></div>
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
            <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImg(e.target.files[0], (url) => setForm((f) => ({ ...f, image: url })))} />
            {form.image && <img src={form.image} className="mt-2 h-20 w-20 object-cover rounded-md border border-border" />}
          </div>
          <div className="md:col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} maxLength={2000} /></div>
        </div>
        <Button disabled={saving}>{saving ? "Ajout…" : "Ajouter le produit"}</Button>
      </form>

      {/* Grille produits */}
      {products?.length ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p: any) => {
            const inStock = (p.stock ?? 0) > 0;
            return (
              <div key={p.id} className={`card-zandu overflow-hidden flex flex-col ${!p.is_active ? "opacity-60" : ""}`}>
                <div className="relative aspect-square bg-secondary flex items-center justify-center overflow-hidden">
                  {p.images?.[0] ? <img src={p.images[0]} className="h-full w-full object-cover" /> : <Package className="h-10 w-10 text-muted-foreground" />}
                  <span className={`absolute top-2 left-2 text-xs px-2 py-1 rounded-full ${inStock ? "bg-emerald-500/90 text-white" : "bg-red-500/90 text-white"}`}>
                    {inStock ? `${p.stock} en stock` : "Rupture"}
                  </span>
                  {!p.is_active && <span className="absolute top-2 right-2 text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">Masqué</span>}
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <div className="font-medium line-clamp-2">{p.title}</div>
                  <div className="text-sm font-semibold text-primary mt-1">{formatPrice(p.price_cents, p.currency)}</div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => openEdit(p)}><Edit className="h-3.5 w-3.5 mr-1" />Modifier</Button>
                    <Button size="sm" variant="outline" onClick={() => duplicate(p)}><Copy className="h-3.5 w-3.5 mr-1" />Dupliquer</Button>
                    <Button size="sm" variant="outline" onClick={() => toggleActive(p)}>
                      {p.is_active ? <><EyeOff className="h-3.5 w-3.5 mr-1" />Masquer</> : <><Eye className="h-3.5 w-3.5 mr-1" />Afficher</>}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : <div className="card-zandu p-12 text-center text-muted-foreground">Aucun produit. Ajoutez votre premier produit ci-dessus.</div>}

      {/* Dialog édition */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Modifier le produit</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Titre</Label><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} maxLength={150} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Prix</Label><Input type="number" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} /></div>
                <div><Label>Stock</Label><Input type="number" value={editing.stock} onChange={(e) => setEditing({ ...editing, stock: e.target.value })} /></div>
              </div>
              <div>
                <Label>Catégorie</Label>
                <select className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm" value={editing.category_id} onChange={(e) => setEditing({ ...editing, category_id: e.target.value })}>
                  <option value="">— Aucune —</option>
                  {cats?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Image</Label>
                <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImg(e.target.files[0], (url) => setEditing({ ...editing, image: url }))} />
                {editing.image && <img src={editing.image} className="mt-2 h-20 w-20 object-cover rounded-md border border-border" />}
              </div>
              <div><Label>Description</Label><Textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={3} maxLength={2000} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
            <Button onClick={saveEdit}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
