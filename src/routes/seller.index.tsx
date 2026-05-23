import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { slugify } from "@/lib/money";

export const Route = createFileRoute("/seller/")({
  component: SellerShop,
});

const schema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(80),
  description: z.string().trim().max(1000).optional(),
});

function SellerShop() {
  const { user, refreshRoles } = useAuth();
  const qc = useQueryClient();
  const { data: shop, isLoading } = useQuery({
    queryKey: ["my-shop", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("shops").select("*").eq("owner_id", user!.id).maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState({ name: "", description: "", logo_url: "", banner_url: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (shop) setForm({ name: shop.name, description: shop.description ?? "", logo_url: shop.logo_url ?? "", banner_url: shop.banner_url ?? "" });
  }, [shop]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSaving(true);
    if (shop) {
      const { error } = await supabase.from("shops").update({ name: parsed.data.name, description: parsed.data.description, logo_url: form.logo_url || null, banner_url: form.banner_url || null }).eq("id", shop.id);
      if (error) { setSaving(false); toast.error(error.message); return; }
      toast.success("Boutique mise à jour");
    } else {
      const slug = `${slugify(parsed.data.name)}-${Math.random().toString(36).slice(2, 6)}`;
      const { error } = await supabase.from("shops").insert({ owner_id: user!.id, name: parsed.data.name, slug, description: parsed.data.description, logo_url: form.logo_url || null });
      if (error) { setSaving(false); toast.error(error.message); return; }
      // grant seller role
      await supabase.from("user_roles").insert({ user_id: user!.id, role: "seller" });
      await refreshRoles();
      toast.success("Boutique créée ! En attente d'approbation.");
    }
    setSaving(false);
    qc.invalidateQueries({ queryKey: ["my-shop"] });
  }

  async function uploadImage(field: "logo_url" | "banner_url", file: File) {
    const path = `${user!.id}/${field}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("shop-assets").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("shop-assets").getPublicUrl(path);
    setForm((f) => ({ ...f, [field]: data.publicUrl }));
  }

  if (isLoading) return <div>Chargement…</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">{shop ? "Ma boutique" : "Créer ma boutique"}</h1>
      <p className="text-muted-foreground mb-6">
        {shop ? `Statut : ${shop.status === "approved" ? "Approuvée ✓" : shop.status === "pending" ? "En attente d'approbation" : "Suspendue"}` : "Renseignez les informations de votre boutique pour commencer à vendre."}
      </p>

      <form onSubmit={save} className="card-zandu p-6 space-y-4 max-w-2xl">
        <div><Label>Nom de la boutique</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={80} /></div>
        <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={1000} rows={4} /></div>
        <div>
          <Label>Logo</Label>
          <div className="flex items-center gap-3">
            {form.logo_url && <img src={form.logo_url} alt="logo" className="h-14 w-14 rounded-md object-cover border border-border" />}
            <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage("logo_url", e.target.files[0])} />
          </div>
        </div>
        <Button disabled={saving}>{saving ? "Enregistrement…" : shop ? "Enregistrer" : "Créer la boutique"}</Button>
      </form>
    </div>
  );
}
