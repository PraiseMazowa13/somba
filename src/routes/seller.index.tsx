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

  async function changeStatus(status: "suspended" | "pending") {
    if (!shop) return;
    const { error } = await supabase.from("shops").update({ status }).eq("id", shop.id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "suspended" ? "Boutique suspendue" : "Réactivation demandée");
    qc.invalidateQueries({ queryKey: ["my-shop"] });
  }

  async function requestDeletion() {
    if (!shop) return;
    const reason = window.prompt("Motif de la suppression (optionnel) :") ?? "";
    if (!window.confirm("Confirmer la demande de suppression ? Un administrateur devra la valider.")) return;
    const { error } = await supabase.from("shops").update({ deletion_requested_at: new Date().toISOString(), deletion_reason: reason || null }).eq("id", shop.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Demande envoyée à l'administrateur");
    qc.invalidateQueries({ queryKey: ["my-shop"] });
  }

  async function cancelDeletion() {
    if (!shop) return;
    const { error } = await supabase.from("shops").update({ deletion_requested_at: null, deletion_reason: null }).eq("id", shop.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Demande annulée");
    qc.invalidateQueries({ queryKey: ["my-shop"] });
  }

  if (isLoading) return <div>Chargement…</div>;

  const statusLabel = shop?.status === "approved" ? "Approuvée ✓" : shop?.status === "pending" ? "En attente d'approbation" : "Suspendue";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">{shop ? "Ma boutique" : "Créer ma boutique"}</h1>
      <p className="text-muted-foreground mb-6">
        {shop ? `Statut : ${statusLabel}` : "Renseignez les informations de votre boutique pour commencer à vendre."}
      </p>

      {shop?.deletion_requested_at && (
        <div className="card-zandu p-4 mb-6 border-destructive/40 bg-destructive/5">
          <div className="font-medium text-destructive">Demande de suppression en cours</div>
          <div className="text-sm text-muted-foreground mt-1">En attente de validation par un administrateur.</div>
          <Button variant="outline" size="sm" className="mt-3" onClick={cancelDeletion}>Annuler la demande</Button>
        </div>
      )}

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

      {shop && (
        <div className="card-zandu p-6 mt-6 max-w-2xl">
          <h2 className="font-semibold mb-1">Gérer la boutique</h2>
          <p className="text-sm text-muted-foreground mb-4">Suspendez temporairement votre boutique ou demandez sa suppression définitive.</p>
          <div className="flex flex-wrap gap-3">
            {shop.status === "approved" && (
              <Button variant="outline" onClick={() => changeStatus("suspended")}>Suspendre ma boutique</Button>
            )}
            {shop.status === "suspended" && (
              <Button variant="outline" onClick={() => changeStatus("pending")}>Demander la réactivation</Button>
            )}
            {!shop.deletion_requested_at && (
              <Button variant="destructive" onClick={requestDeletion}>Demander la suppression</Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
