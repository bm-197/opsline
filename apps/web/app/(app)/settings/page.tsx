import {
  ApiKeyCreate,
  ApiKeyRevoke,
  InviteForm,
  MemberRoleControl,
} from "@/components/settings";
import { GlassCard } from "@/components/ui/glass-card";
import { Chip } from "@/components/ui/chip";
import { CopyableId } from "@/components/ui/copyable-id";
import { can } from "@/lib/authz";
import { requireContext } from "@/lib/context";
import { formatStamp } from "@/lib/format";
import { listApiKeys, listMembers, listOrgWebhooks } from "@/lib/queries";

export default async function SettingsPage() {
  const ctx = await requireContext();
  const isAdmin = can(ctx.role, { member: ["create"] });
  const [members, keys, webhooks] = await Promise.all([
    listMembers(ctx.orgId),
    listApiKeys(ctx.orgId),
    listOrgWebhooks(ctx.orgId),
  ]);

  return (
    <main className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted">
          {ctx.orgName} · you are {ctx.role}.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-geist text-xs text-faint">Members</h2>
        {isAdmin && <InviteForm orgId={ctx.orgId} />}
        <GlassCard className="flex flex-col divide-y divide-line p-0">
          {members.map((m) => (
            <div
              key={m.memberId}
              className="flex items-center justify-between gap-3 px-5 py-3"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">{m.name}</span>
                <span className="font-geist text-xs text-faint">{m.email}</span>
              </div>
              <MemberRoleControl
                orgId={ctx.orgId}
                memberId={m.memberId}
                role={m.role}
                disabled={!isAdmin || m.userId === ctx.userId}
              />
            </div>
          ))}
        </GlassCard>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-geist text-xs text-faint">API keys</h2>
        {isAdmin ? (
          <ApiKeyCreate />
        ) : (
          <p className="text-sm text-muted">Only admins can manage API keys.</p>
        )}
        {keys.length === 0 ? (
          <p className="text-sm text-muted">No API keys yet.</p>
        ) : (
          <GlassCard className="flex flex-col divide-y divide-line p-0">
            {keys.map((k) => (
              <div
                key={k.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{k.name}</span>
                  <span className="font-geist text-xs text-faint">
                    created {formatStamp(k.createdAt)}
                  </span>
                </div>
                {isAdmin && <ApiKeyRevoke id={k.id} />}
              </div>
            ))}
          </GlassCard>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-geist text-xs text-faint">Webhooks</h2>
        {webhooks.length === 0 ? (
          <p className="text-sm text-muted">No webhook endpoints.</p>
        ) : (
          <GlassCard className="flex flex-col divide-y divide-line p-0">
            {webhooks.map((w) => (
              <div
                key={w.token}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{w.workflowName}</span>
                  <CopyableId id={`/api/webhooks/${w.token}`} />
                </div>
                <Chip>
                  {w.lastUsedAt
                    ? `used ${formatStamp(w.lastUsedAt)}`
                    : "unused"}
                </Chip>
              </div>
            ))}
          </GlassCard>
        )}
      </section>
    </main>
  );
}
