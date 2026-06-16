import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CommandPalette } from "@/components/command-palette";
import { Shell } from "@/components/sidebar";
import { can } from "@/lib/authz";
import { getContext } from "@/lib/context";
import { listMemberships } from "@/lib/queries";

// Authenticated shell. Middleware has already gated the session; here we
// resolve the org/role for the sidebar and send a sessioned-but-org-less user
// to onboarding. No per-page auth redirects.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getContext();
  if (!ctx) redirect("/onboarding");

  const [memberships, collapsed] = await Promise.all([
    listMemberships(ctx.userId),
    cookies().then((c) => c.get("opsline-sidebar")?.value === "collapsed"),
  ]);

  return (
    <>
      <Shell
        org={ctx.orgName}
        orgLogo={ctx.orgLogo}
        orgs={memberships}
        activeOrgId={ctx.orgId}
        userName={ctx.userName}
        canCreate={can(ctx.role, { workflow: ["create"] })}
        initialCollapsed={collapsed}
      >
        {children}
      </Shell>
      <CommandPalette />
    </>
  );
}
