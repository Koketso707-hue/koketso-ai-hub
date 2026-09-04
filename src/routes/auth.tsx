import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import mark from "@/assets/koketso-mark.png";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Koketso AI Assistant" },
      {
        name: "description",
        content: "Sign in to your Koketso workspace to plan, research and chat with AI.",
      },
      { property: "og:title", content: "Sign in — Koketso AI Assistant" },
      {
        property: "og:description",
        content: "Sign in to your Koketso workspace to plan, research and chat with AI.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName.trim() || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Try email instead.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-brand-soft p-12 lg:flex">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={mark} alt="Koketso" width={40} height={40} className="size-10 rounded-2xl" />
          <span className="font-display text-xl font-semibold">Koketso</span>
        </Link>
        <div>
          <h2 className="max-w-md font-display text-4xl font-semibold leading-tight text-balance">
            Your plans, research and thinking — in one calm place.
          </h2>
          <p className="mt-4 max-w-md text-sm font-semibold text-foreground/70">
            Everything Koketso drafts stays editable, and everything you save stays in your own
            account.
          </p>
        </div>
        <p className="text-[11px] font-semibold text-foreground/60">
          AI can make mistakes. Review outputs before acting on them.
        </p>
      </div>

      <div className="flex items-center justify-center px-5 py-12">
        <div className="panel w-full max-w-md p-7">
          <Link to="/" className="mb-6 flex items-center gap-2.5 lg:hidden">
            <img src={mark} alt="Koketso" width={36} height={36} className="size-9 rounded-2xl" />
            <span className="font-display text-lg font-semibold">Koketso</span>
          </Link>

          {sent ? (
            <div>
              <h1 className="font-display text-2xl font-semibold">Check your email</h1>
              <p className="mt-3 text-sm font-semibold text-muted-foreground">
                We sent a confirmation link to <span className="text-foreground">{email}</span>.
                Click it to activate your workspace, then come back and sign in.
              </p>
              <button
                onClick={() => {
                  setSent(false);
                  setMode("signin");
                }}
                className="mt-6 w-full rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-semibold">
                {mode === "signin" ? "Welcome back" : "Create your workspace"}
              </h1>
              <p className="mt-2 text-sm font-semibold text-muted-foreground">
                {mode === "signin"
                  ? "Sign in to pick up your plans and conversations."
                  : "A few seconds now, and your work stays with you."}
              </p>

              <button
                onClick={onGoogle}
                className="mt-6 w-full rounded-full border border-border bg-card px-5 py-3 text-sm font-bold transition-colors hover:bg-secondary"
              >
                Continue with Google
              </button>

              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  or
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={onSubmit} className="space-y-3">
                {mode === "signup" && (
                  <Field
                    label="Display name"
                    value={displayName}
                    onChange={setDisplayName}
                    placeholder="Koketso M."
                  />
                )}
                <Field
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@company.com"
                  required
                />
                <Field
                  label="Password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="mt-2 w-full rounded-full bg-brand px-5 py-3 text-sm font-bold text-card transition-opacity disabled:opacity-60"
                >
                  {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
                </button>
              </form>

              <button
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="mt-5 w-full text-[13px] font-bold text-muted-foreground hover:text-foreground"
              >
                {mode === "signin"
                  ? "New here? Create an account"
                  : "Already have an account? Sign in"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-semibold outline-none transition-colors focus:border-ring focus:bg-card"
      />
    </label>
  );
}
