"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { createApiKeyAction, revokeApiKeyAction } from "@/lib/settings-actions";

const ROLES = ["admin", "operator", "viewer"] as const;

export function InviteForm({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("operator");
  const [note, setNote] = useState<string | null>(null);

  const invite = () =>
    start(async () => {
      setNote(null);
      const res = await authClient.organization.inviteMember({
        email,
        role,
        organizationId: orgId,
      });
      if (res.error) {
        setNote(res.error.message ?? "Invite failed");
      } else {
        setNote(
          `Invited ${email}. The invitation link was sent to their email.`,
        );
        setEmail("");
        router.refresh();
      }
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@email.com"
          type="email"
          className="flex-1 rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus-visible:border-faint"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
          className="rounded-xl border border-line bg-canvas px-3 py-2 text-sm"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <Button size="sm" disabled={pending || !email} onClick={invite}>
          Invite
        </Button>
      </div>
      {note && <p className="text-sm text-muted">{note}</p>}
    </div>
  );
}

export function MemberRoleControl({
  orgId,
  memberId,
  role,
  disabled,
}: {
  orgId: string;
  memberId: string;
  role: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const change = (next: string) =>
    start(async () => {
      await authClient.organization.updateMemberRole({
        memberId,
        role: next as (typeof ROLES)[number],
        organizationId: orgId,
      });
      router.refresh();
    });

  if (disabled) {
    return <span className="font-geist text-xs text-muted">{role}</span>;
  }
  return (
    <select
      value={role}
      disabled={pending}
      onChange={(e) => change(e.target.value)}
      className="rounded-lg border border-line bg-canvas px-2 py-1 text-xs"
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </select>
  );
}

export function ApiKeyCreate() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [created, setCreated] = useState<string | null>(null);

  const create = () =>
    start(async () => {
      const key = await createApiKeyAction(name);
      setCreated(key);
      setName("");
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name"
          className="flex-1 rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus-visible:border-faint"
        />
        <Button size="sm" disabled={pending} onClick={create}>
          Create key
        </Button>
      </div>
      {created && (
        <div className="rounded-xl bg-butter px-3 py-2">
          <p className="text-xs font-medium">
            Copy this now, it will not be shown again:
          </p>
          <code className="font-geist text-xs break-all">{created}</code>
        </div>
      )}
    </div>
  );
}

export function ApiKeyRevoke({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await revokeApiKeyAction(id);
          router.refresh();
        })
      }
      className="font-geist text-xs text-muted underline-offset-4 hover:text-ink hover:underline"
    >
      revoke
    </button>
  );
}
