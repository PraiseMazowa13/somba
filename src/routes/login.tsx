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
  head: () => ({ meta: [{ title: "Connexion — Zandu" }, { name: "description", content: "Connectez-vous à votre compte Zandu." }, { property: "og:title", content: "Connexion — Zandu" }, { property: "og:description", content: "Connectez-vous à votre compte Zandu." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
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

  const [magicSent, setMagicSent] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);

  async function oauth(provider: "google" | "lovable" | "apple") {
    const res = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (res.error) { toast.error(`Échec de connexion ${provider === "google" ? "Google" : provider === "apple" ? "Apple" : "Lovable"}`); return; }
    if (res.redirected) return;
    navigate({ to: "/" });
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z.string().trim().email("Email invalide").max(255).safeParse(email);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setMagicLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data,
      options: { emailRedirectTo: window.location.origin },
    });
    setMagicLoading(false);
    if (error) { toast.error(error.message); return; }
    setMagicSent(true);
    toast.success("Lien envoyé ! Vérifiez votre boîte mail.");
  }

  return (
    <div className="container-zandu py-16 max-w-md">
      <h1 className="text-3xl font-bold mb-2">Connexion</h1>
      <p className="text-muted-foreground mb-8">Heureux de vous revoir sur Zandu.</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div><Label htmlFor="login-email">Email</Label><Input id="login-email" autoComplete="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div><Label htmlFor="login-password">Mot de passe</Label><Input id="login-password" autoComplete="current-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Connexion…" : "Se connecter"}</Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex-1 h-px bg-border" /> OU <div className="flex-1 h-px bg-border" />
      </div>
      <div className="space-y-2">
        <Button variant="outline" className="w-full bg-white text-[#1F1F1F] border-[#747775] hover:bg-[#F2F2F2] font-medium" onClick={() => oauth("google")}>
          <svg aria-hidden="true" className="h-[18px] w-[18px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
          Continuer avec Google
        </Button>
        <Button variant="outline" className="w-full bg-white text-black border-[#747775] hover:bg-[#F2F2F2] font-medium" onClick={() => oauth("apple")}>
          <svg aria-hidden="true" className="h-[18px] w-[18px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path fill="currentColor" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
          Continuer avec Apple
        </Button>
        <Button variant="outline" className="w-full" onClick={() => oauth("lovable")}>Continuer avec Lovable</Button>
      </div>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex-1 h-px bg-border" /> SANS MOT DE PASSE <div className="flex-1 h-px bg-border" />
      </div>
      {magicSent ? (
        <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted-foreground">
          Un lien de connexion a été envoyé à <span className="font-medium text-foreground">{email}</span>. Cliquez dessus pour vous connecter.
        </p>
      ) : (
        <form onSubmit={sendMagicLink} className="flex gap-2">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Votre email" required className="min-w-0 flex-1" />
          <Button type="submit" variant="secondary" disabled={magicLoading}>{magicLoading ? "Envoi…" : "Recevoir un lien"}</Button>
        </form>
      )}

      <div className="mt-6 text-sm text-muted-foreground flex justify-between">
        <Link to="/reset-password" className="hover:text-foreground">Mot de passe oublié ?</Link>
        <Link to="/signup" className="hover:text-foreground">Créer un compte</Link>
      </div>
    </div>
  );
}
