import { FormEvent, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { api, isAuthenticated, saveAuth } from "@/lib/aqt";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Already logged in → go to dashboard
  useEffect(() => {
    if (isAuthenticated()) navigate({ to: "/dashboard" });
  }, [navigate]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const { data } = await api.post("/auth/login", { email: form.get("email"), password: form.get("password") });
      saveAuth(data); toast.success("Signed in"); navigate({ to: "/dashboard" });
    } catch (err) { setError("Unable to sign in. Check your credentials or backend connection."); toast.error("Login failed"); }
    finally { setLoading(false); }
  }
  return <AuthFrame title="Sign in" subtitle="AQT Data Intelligence · PAD Extractor"><form onSubmit={submit} className="space-y-4">{error && <div className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}<label className="grid gap-1 text-sm font-bold">Email<input required name="email" type="email" className="h-11 rounded-lg border border-input bg-card px-3" /></label><label className="grid gap-1 text-sm font-bold">Password<div className="relative"><input required name="password" type={show ? "text" : "password"} className="h-11 w-full rounded-lg border border-input bg-card px-3 pr-10" /><button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-3 text-muted-foreground">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label><Button disabled={loading} className="w-full" size="lg">{loading && <Loader2 className="h-4 w-4 animate-spin" />}Sign In</Button><p className="text-center text-sm text-muted-foreground">Don't have an account? <Link to="/register" className="font-bold text-primary">Register →</Link></p></form></AuthFrame>;
}

function AuthFrame({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { return <div className="cockpit-bg flex min-h-screen items-center justify-center px-4"><div className="w-full max-w-md rounded-2xl border border-panel-border bg-card p-7 shadow-cockpit"><div className="mb-6 text-center"><Link to="/" className="text-3xl font-black text-primary">AQT</Link><p className="font-bold text-foreground">Data Intelligence</p><p className="text-sm text-accent">PAD Extractor</p><h1 className="mt-6 text-2xl font-black text-foreground">{title}</h1><p className="text-sm text-muted-foreground">{subtitle}</p></div>{children}</div></div>; }
