"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Logo } from "@/components/ui/logo";
import { authClient } from "@/lib/auth-client";

// Shown when a signed-in user has no organization yet (the (app) layout sends
// them here). Creates a workspace and drops them into the app.
export default function OnboardingPage() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = () =>
    start(async () => {
      setError(null);
      const slug =
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "workspace";
      const org = await authClient.organization.create({
        name: name || "My workspace",
        slug: `${slug}-${Math.floor(performance.now())}`,
        logo: logo.trim() || undefined,
      });
      if (org.error) {
        setError(org.error.message ?? "Could not create the workspace");
        return;
      }
      if (org.data?.id) {
        await authClient.organization.setActive({
          organizationId: org.data.id,
        });
      }
      router.push("/dashboard");
      router.refresh();
    });

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <GlassCard className="flex w-full max-w-sm flex-col gap-5 p-7">
        <div className="flex flex-col gap-1">
          <Logo className="mb-1 size-9" />
          <h1 className="text-xl font-semibold tracking-tight">
            Create your workspace
          </h1>
          <p className="text-sm text-muted">
            One more step before you can watch the work happen.
          </p>
        </div>
        <label className="flex flex-col gap-1">
          <span className="font-geist text-xs text-faint">Workspace name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus-visible:border-faint"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-geist text-xs text-faint">
            Logo URL (optional)
          </span>
          <input
            type="url"
            value={logo}
            onChange={(e) => setLogo(e.target.value)}
            className="rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus-visible:border-faint"
          />
        </label>
        {error && <p className="text-sm text-blush-deep">{error}</p>}
        <Button disabled={pending || !name} onClick={create}>
          {pending ? "Creating" : "Create workspace"}
        </Button>
      </GlassCard>
    </div>
  );
}
