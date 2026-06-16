import { member, organization } from "@opsline/db";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { cache } from "react";

import { auth } from "./auth";
import { db } from "./db";

export type Context = {
  userId: string;
  userName: string;
  orgId: string;
  orgName: string;
  orgLogo: string | null;
  role: string;
};

// The signed-in user and their active organization, from the Better Auth
// session. Null when logged out or not yet in an org.
export const getContext = cache(async (): Promise<Context | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const activeOrgId = session.session.activeOrganizationId ?? null;
  const [m] = await db
    .select({
      orgId: member.organizationId,
      role: member.role,
      orgName: organization.name,
      orgLogo: organization.logo,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(
      activeOrgId
        ? and(
            eq(member.userId, session.user.id),
            eq(member.organizationId, activeOrgId),
          )
        : eq(member.userId, session.user.id),
    )
    .limit(1);
  if (!m) return null;

  return {
    userId: session.user.id,
    userName: session.user.name,
    orgId: m.orgId,
    orgName: m.orgName,
    orgLogo: m.orgLogo,
    role: m.role,
  };
});

// Returns the context for pages/actions that need it. Auth is gated by
// middleware (redirect to /login) and the (app) layout (redirect to
// /onboarding when org-less), so this throws only if reached without context,
// which should not happen for protected routes.
export async function requireContext(): Promise<Context> {
  const ctx = await getContext();
  if (!ctx) throw new Error("No org context: route is not gated correctly.");
  return ctx;
}
