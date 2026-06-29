"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Logo } from "@/components/ui/logo";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifySent, setVerifySent] = useState(false);

  const submit = () =>
    start(async () => {
      setError(null);
      try {
        if (mode === "signin") {
          const res = await authClient.signIn.email({ email, password });
          if (res.error) throw new Error(res.error.message ?? "Sign in failed");
          router.push("/dashboard");
          router.refresh();
        } else {
          const res = await authClient.signUp.email({ email, password, name });
          if (res.error) throw new Error(res.error.message ?? "Sign up failed");
          // Verification is required, so there is no session yet. The workspace
          // is created at /onboarding once the user verifies and signs in.
          setVerifySent(true);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <GlassCard className="flex w-full max-w-sm flex-col gap-5 p-7">
        {verifySent ? (
          <div className="flex flex-col gap-4">
            <Logo className="mb-1 size-9" />
            <h1 className="text-xl font-semibold tracking-tight">
              Check your email
            </h1>
            <p className="text-sm text-muted">
              We sent a verification link to{" "}
              <span className="font-medium text-ink">{email}</span>. Verify it,
              then sign in to set up your workspace.
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                setVerifySent(false);
                setMode("signin");
              }}
            >
              Back to sign in
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <Logo className="mb-1 size-9" />
              <h1 className="text-xl font-semibold tracking-tight">Opsline</h1>
              <p className="text-sm text-muted">
                {mode === "signin"
                  ? "Sign in to watch your work happen."
                  : "Create your account to get started."}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {mode === "signup" && (
                <Field label="Name" value={name} onChange={setName} />
              )}
              <Field
                label="Email"
                value={email}
                onChange={setEmail}
                type="email"
              />
              <Field
                label="Password"
                value={password}
                onChange={setPassword}
                type="password"
              />
            </div>

            {error && <p className="text-sm text-blush-deep">{error}</p>}

            <Button disabled={pending} onClick={submit}>
              {pending
                ? "Working"
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </Button>

            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
              className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
            >
              {mode === "signin"
                ? "Need an account? Sign up"
                : "Have an account? Sign in"}
            </button>
          </>
        )}
      </GlassCard>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-geist text-xs text-faint">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus-visible:border-faint"
      />
    </label>
  );
}
