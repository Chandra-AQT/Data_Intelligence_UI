import { FormEvent, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { api, isAuthenticated, saveAuth } from "@/lib/aqt";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/register")({ component: Register });

function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const strength = Math.min(100, password.length * 12.5);

  // Already logged in â†’ go to dashboard
  useEffect(() => {
    if (isAuthenticated()) navigate({ to: "/dashboard" });
  }, [navigate]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    if (form.get("password") !== form.get("confirm")) return toast.error("Passwords do not match");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", { full_name: form.get("full_name"), email: form.get("email"), password: form.get("password") });
      saveAuth(data); toast.success("Account created"); navigate({ to: "/dashboard" });
    } catch { toast.error("Registration failed. Check backend connection."); }
    finally { setLoading(false); }
  }
  return <div className="cockpit-bg flex min-h-screen items-center justify-center px-4"><div className="w-full max-w-md rounded-2xl border border-panel-border bg-card p-7 shadow-cockpit"><div className="mb-6 text-center"><Link to="/" className="text-3xl font-black text-primary">AQT</Link><p className="font-bold text-foreground">Data Intelligence</p><p className="text-sm text-accent">Metadata Extractor</p><h1 className="mt-6 text-2xl font-black text-foreground">Create account</h1></div><form onSubmit={submit} className="space-y-4"><label className="grid gap-1 text-sm font-bold">Full Name<input name="full_name" className="h-11 rounded-lg border border-input bg-card px-3" /></label><label className="grid gap-1 text-sm font-bold">Email<input required name="email" type="email" className="h-11 rounded-lg border border-input bg-card px-3" /></label><label className="grid gap-1 text-sm font-bold">Password<input required minLength={8} name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-lg border border-input bg-card px-3" /><span className="h-2 overflow-hidden rounded-full bg-muted"><span className="block h-full bg-primary transition-all" style={{ width: `${strength}%` }} /></span></label><label className="grid gap-1 text-sm font-bold">Confirm Password<input required name="confirm" type="password" className="h-11 rounded-lg border border-input bg-card px-3" /></label><p className="rounded-xl bg-primary/10 p-3 text-xs text-primary">First registered user becomes admin automatically.</p><Button disabled={loading} className="w-full" size="lg">{loading && <Loader2 className="h-4 w-4 animate-spin" />}Create Account</Button><p className="text-center text-sm text-muted-foreground">Already have an account? <Link to="/login" className="font-bold text-primary">Sign In â†’</Link></p></form></div></div>;
}

