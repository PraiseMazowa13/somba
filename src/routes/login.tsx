import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Connexion — Zandu" }, { name: "description", content: "Connectez-vous à votre compte Zandu." }] }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Email invalide").max(255),
  password: z.string().min(6, "Au moins 6 caractères").max(72),
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Bienvenue !");
    navigate({ to: "/" });
  }

  async function google() {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) { toast.error("Échec de connexion Google"); return; }
    if (res.redirected) return;
    navigate({ to: "/" });
  }

  return (
    <div className="container-zandu py-16 max-w-md">
      <h1 className="text-3xl font-bold mb-2">Connexion</h1>
      <p className="text-muted-foreground mb-8">Heureux de vous revoir sur Zandu.</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div><Label>Mot de passe</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Connexion…" : "Se connecter"}</Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex-1 h-px bg-border" /> OU <div className="flex-1 h-px bg-border" />
      </div>
      <Button variant="outline" className="w-full" onClick={google}>Continuer avec Google</Button>

      <div className="mt-6 text-sm text-muted-foreground flex justify-between">
        <Link to="/reset-password" className="hover:text-foreground">Mot de passe oublié ?</Link>
        <Link to="/signup" className="hover:text-foreground">Créer un compte</Link>
      </div>
    </div>
  );
}
