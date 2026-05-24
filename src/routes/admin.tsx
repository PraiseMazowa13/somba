import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { slugify } from "@/lib/money";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Zandu" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { user, roles, loading } = useAuth();
  const qc = useQueryClient();
  const [catName, setCatName] = useState("");

  const { data: cats } = useQuery({
    queryKey: ["admin-cats"],
    enabled: roles.includes("admin"),
    queryFn: async () => (await supabase.from("categories").select("*").order("name")).data ?? [],
  });
  const { data: shops } = useQuery({
    queryKey: ["admin-shops"],
    enabled: roles.includes("admin"),
    queryFn: async () => (await supabase.from("shops").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  if (loading) return <div className="container-zandu py-16">Chargement…</div>;
  if (!user) return <div className="container-zandu py-16 text-center"><Button asChild><Link to="/login">Connexion</Link></Button></div>;
  if (!roles.includes("admin")) return (
    <div className="container-zandu py-16 text-center">
      <h1 className="text-2xl font-bold mb-2">Accès réservé</h1>
      <p className="text-muted-foreground">Cette page est réservée aux administrateurs.</p>
    </div>
  );

  async function addCat(e: React.FormEvent) {
    e.preventDefault();
    if (!catName.trim()) return;
    const { error } = await supabase.from("categories").insert({ name: catName.trim(), slug: slugify(catName) });
    if (error) toast.error(error.message); else { toast.success("Catégorie créée"); setCatName(""); qc.invalidateQueries({ queryKey: ["admin-cats"] }); }
  }
  async function delCat(id: string) {
    await supabase.from("categories").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-cats"] });
  }
  async function setShopStatus(id: string, status: "approved" | "pending" | "suspended") {
    await supabase.from("shops").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-shops"] });
  }

  return (
    <div className="container-zandu py-10 space-y-10">
      <section>
        <h1 className="text-3xl font-bold mb-6">Administration</h1>
        <h2 className="text-xl font-semibold mb-4">Catégories</h2>
        <form onSubmit={addCat} className="card-zandu p-4 flex gap-3 mb-4 max-w-xl">
          <Input placeholder="Nouvelle catégorie" value={catName} onChange={(e) => setCatName(e.target.value)} maxLength={60} />
          <Button>Ajouter</Button>
        </form>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {cats?.map((c) => (
            <div key={c.id} className="card-zandu p-3 flex items-center justify-between">
              <div><div className="font-medium">{c.name}</div><div className="text-xs text-muted-foreground">/{c.slug}</div></div>
              <Button variant="ghost" size="sm" onClick={() => delCat(c.id)}>Supprimer</Button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Boutiques</h2>
        <div className="space-y-3">
          {shops?.map((s) => (
            <div key={s.id} className="card-zandu p-4 flex flex-wrap justify-between items-center gap-3">
              <div>
                <div className="font-medium flex items-center gap-2">
                  {s.name}
                  {s.deletion_requested_at && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Suppression demandée</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">/{s.slug} · {s.status}</div>
                {s.deletion_requested_at && s.deletion_reason && (
                  <div className="text-xs text-muted-foreground mt-1">Motif : {s.deletion_reason}</div>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant={s.status === "approved" ? "secondary" : "default"} onClick={() => setShopStatus(s.id, "approved")}>Approuver</Button>
                <Button size="sm" variant="outline" onClick={() => setShopStatus(s.id, "pending")}>En attente</Button>
                <Button size="sm" variant="destructive" onClick={() => setShopStatus(s.id, "suspended")}>Suspendre</Button>
                {s.deletion_requested_at && (
                  <>
                    <Button size="sm" variant="destructive" onClick={() => confirmDelete(s.id, s.name)}>Confirmer suppression</Button>
                    <Button size="sm" variant="outline" onClick={() => rejectDeletion(s.id)}>Refuser</Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
