import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Store } from "lucide-react";

export const Route = createFileRoute("/shops")({
  head: () => ({ meta: [{ title: "Boutiques — Zandu" }, { name: "description", content: "Toutes les boutiques de la marketplace Zandu." }] }),
  component: ShopsPage,
});

function ShopsPage() {
  const { data: shops } = useQuery({
    queryKey: ["shops-approved"],
    queryFn: async () => {
      const { data } = await supabase.from("shops").select("id,name,slug,description,logo_url,banner_url").eq("status", "approved").order("name");
      return data ?? [];
    },
  });

  return (
    <div className="container-zandu py-10">
      <h1 className="text-3xl font-bold">Toutes les boutiques</h1>
      <p className="text-muted-foreground mt-2">{shops?.length ?? 0} boutique(s) approuvée(s)</p>
      <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shops?.map((s) => (
          <Link key={s.id} to="/shops/$slug" params={{ slug: s.slug }} className="card-zandu p-5 flex gap-4 hover:border-brand transition">
            <div className="h-14 w-14 rounded-md bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
              {s.logo_url ? <img src={s.logo_url} alt={s.name} className="h-full w-full object-cover" /> : <Store className="h-6 w-6 text-muted-foreground" />}
            </div>
            <div className="min-w-0">
              <div className="font-semibold">{s.name}</div>
              <p className="text-sm text-muted-foreground line-clamp-2">{s.description}</p>
            </div>
          </Link>
        ))}
        {shops && shops.length === 0 && <div className="card-zandu p-12 text-center text-muted-foreground col-span-full">Aucune boutique pour l'instant.</div>}
      </div>
    </div>
  );
}
