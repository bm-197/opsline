"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Logo } from "@/components/ui/logo";
import { authClient } from "@/lib/auth-client";

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInvite />
    </Suspense>
  );
}

function AcceptInvite() {
  const router = useRouter();
  const params = useSearchParams();
  const invitationId = params.get("id");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const accept = () =>
    start(async () => {
      setError(null);
      if (!invitationId) return;
      const res = await authClient.organization.acceptInvitation({
        invitationId,
      });
      if (res.error) {
        setError(res.error.message ?? "Could not accept. Are you signed in?");
      } else {
        router.push("/runs");
        router.refresh();
      }
    });

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <GlassCard className="flex w-full max-w-sm flex-col gap-4 p-7">
        <Logo className="size-9" />
        <h1 className="text-xl font-semibold tracking-tight">
          Join the workspace
        </h1>
        {invitationId ? (
          <p className="text-sm text-muted">
            You have an invitation. Sign in as the invited email, then accept.
          </p>
        ) : (
          <p className="text-sm text-muted">
            This invitation link is missing its id.
          </p>
        )}
        {error && <p className="text-sm text-blush-deep">{error}</p>}
        <Button disabled={pending || !invitationId} onClick={accept}>
          {pending ? "Accepting" : "Accept invitation"}
        </Button>
      </GlassCard>
    </div>
  );
}
