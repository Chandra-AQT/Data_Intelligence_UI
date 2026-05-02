import { FormEvent, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { api, isAuthenticated, saveAuth } from "@/lib/aqt";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

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
    } catch { setError("Unable to sign in. Check your credentials or backend connection."); toast.error("Login failed"); }
    finally { setLoading(false); }
  }

  if (forgotMode) {
    return (
      <AuthFrame title="Reset Password" subtitle="Enter your email to get reset instructions">
        {forgotSent ? (
          <div className="text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl mx-auto" style={{ backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <CheckCircle2 className="h-8 w-8" style={{ color: "#22c55e" }} />
            </div>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
              If an account exists for <strong className="text-white">{forgotEmail}</strong>, an admin can reset your password via the backend API.
            </p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              Contact your administrator with your email address to reset your password.
            </p>
            <button onClick={() => { setForgotMode(false); setForgotSent(false); }}
              className="w-full rounded-xl py-2.5 text-sm font-black text-white"
              style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
              Back to Sign In
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="grid gap-1 text-sm font-bold text-white">
              Email Address
              <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                placeholder="your@email.com" className="h-11 rounded-lg border border-input bg-card px-3" />
            </label>
            <button onClick={() => setForgotSent(true)} disabled={!forgotEmail}
              className="w-full rounded-xl py-2.5 text-sm font-black text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
              Send Reset Instructions
            </button>
            <button onClick={() => setForgotMode(false)} className="w-full text-sm text-center" style={{ color: "rgba(255,255,255,0.4)" }}>
              ← Back to Sign In
            </button>
          </div>
        )}
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="Sign in" subtitle="AQT Data Intelligence · PAD Extractor">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        <label className="grid gap-1 text-sm font-bold">
          Email
          <input required name="email" type="email" className="h-11 rounded-lg border border-input bg-card px-3" />
        </label>
        <label className="grid gap-1 text-sm font-bold">
          Password
          <div className="relative">
            <input required name="password" type={show ? "text" : "password"} className="h-11 w-full rounded-lg border border-input bg-card px-3 pr-10" />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-3 text-muted-foreground">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>
        <div className="flex justify-end">
          <button type="button" onClick={() => setForgotMode(true)} className="text-xs hover:underline" style={{ color: "#60a5fa" }}>
            Forgot password?
          </button>
        </div>
        <Button disabled={loading} className="w-full" size="lg">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}Sign In
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Don't have an account? <Link to="/register" className="font-bold text-primary">Register →</Link>
        </p>
      </form>
    </AuthFrame>
  );
}

function AuthFrame({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { return <div className="cockpit-bg flex min-h-screen items-center justify-center px-4"><div className="w-full max-w-md rounded-2xl border border-panel-border bg-card p-7 shadow-cockpit"><div className="mb-6 text-center"><Link to="/" className="text-3xl font-black text-primary">AQT</Link><p className="font-bold text-foreground">Data Intelligence</p><p className="text-sm text-accent">PAD Extractor</p><h1 className="mt-6 text-2xl font-black text-foreground">{title}</h1><p className="text-sm text-muted-foreground">{subtitle}</p></div>{children}</div></div>; }
