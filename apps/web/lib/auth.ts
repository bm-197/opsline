import { consoleMailer, createRawId, createResendMailer } from "@opsline/core";
import { authSchema, createDrizzleRunStore, member } from "@opsline/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins/organization";
import { desc, eq } from "drizzle-orm";

import { db } from "./db";
import { ac, roles } from "./permissions";

// Send real email when Resend is configured; otherwise log to the console.
const mailer =
  process.env.RESEND_API_KEY && process.env.RESEND_EMAIL
    ? createResendMailer({
        apiKey: process.env.RESEND_API_KEY,
        from: process.env.RESEND_EMAIL,
      })
    : consoleMailer;

// Keep Better Auth ids in the same prefixed-nanoid shape as the rest of Opsline.
const MODEL_PREFIX: Record<string, string> = {
  user: "usr",
  session: "ses",
  account: "acc",
  verification: "ver",
  organization: "org",
  member: "mem",
  invitation: "inv",
};

// Org membership changes happen on Better Auth endpoints, not our server
// actions, so they are audited here via the org lifecycle hooks below.
const auditStore = createDrizzleRunStore(db);
async function audit(event: {
  orgId: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}) {
  // Audit logging must never block the org action that triggered it.
  try {
    await auditStore.recordAudit(event);
  } catch {}
}

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
  // CSRF origin allowlist. The dev origin is explicit so sign-in works even if
  // next dev does not load BETTER_AUTH_URL; production sets that env var.
  trustedOrigins: [
    "http://localhost:3000",
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
  ],
  emailAndPassword: { enabled: true, requireEmailVerification: true },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    async sendVerificationEmail({ user, token }) {
      const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
      const verifyUrl = `${base}/api/auth/verify-email?token=${token}&callbackURL=/runs`;
      await mailer.send({
        to: user.email,
        subject: "Verify your email for Opsline",
        body: `Confirm your email to start using Opsline.\n\nVerify: ${verifyUrl}`,
        idempotencyKey: `verify_${user.id}`,
      });
    },
  },
  // Built-in limiter (in-memory). Sign-in/sign-up are tightened against
  // brute force; everything else uses a generous default.
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
      "/send-verification-email": { window: 60, max: 3 },
    },
  },
  databaseHooks: {
    session: {
      create: {
        // Default the active org to the user's most recent membership on sign
        // in, so multitenant queries always have an org to scope to. Onboarding
        // and the workspace switcher override this with an explicit setActive.
        async before(session) {
          const [m] = await db
            .select({ orgId: member.organizationId })
            .from(member)
            .where(eq(member.userId, session.userId))
            .orderBy(desc(member.createdAt))
            .limit(1);
          return {
            data: { ...session, activeOrganizationId: m?.orgId ?? null },
          };
        },
      },
    },
  },
  advanced: {
    database: {
      generateId: ({ model }) =>
        createRawId(MODEL_PREFIX[model] ?? model.slice(0, 4)),
    },
  },
  plugins: [
    organization({
      ac,
      roles,
      creatorRole: "admin",
      allowUserToCreateOrganization: true,
      // Deletion wipes members, invitations, and teams. No UI exposes it yet,
      // so close the API path until there is an intentional, confirmed flow.
      disableOrganizationDeletion: true,
      organizationHooks: {
        async afterCreateOrganization({ organization, user }) {
          await audit({
            orgId: organization.id,
            actor: user.id,
            action: "org.created",
            entityType: "organization",
            entityId: organization.id,
            after: { name: organization.name },
          });
        },
        async afterCreateInvitation({ invitation, inviter, organization }) {
          await audit({
            orgId: organization.id,
            actor: inviter.id,
            action: "member.invited",
            entityType: "invitation",
            entityId: invitation.id,
            after: { email: invitation.email, role: invitation.role },
          });
        },
        async afterAcceptInvitation({ member: m, user, organization }) {
          await audit({
            orgId: organization.id,
            actor: user.id,
            action: "member.joined",
            entityType: "member",
            entityId: m.id,
            after: { role: m.role },
          });
        },
        async afterUpdateMemberRole({
          member: m,
          previousRole,
          user,
          organization,
        }) {
          await audit({
            orgId: organization.id,
            actor: user.id,
            action: "member.role_changed",
            entityType: "member",
            entityId: m.id,
            before: { role: previousRole },
            after: { role: m.role },
          });
        },
        async afterRemoveMember({ member: m, user, organization }) {
          await audit({
            orgId: organization.id,
            actor: user.id,
            action: "member.removed",
            entityType: "member",
            entityId: m.id,
            after: { role: m.role },
          });
        },
      },
      async sendInvitationEmail(data) {
        const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
        const acceptUrl = `${base}/accept-invite?id=${data.invitation.id}`;
        await mailer.send({
          to: data.email,
          subject: `Join ${data.organization.name} on Opsline`,
          body: `${data.inviter.user.name} invited you to join ${data.organization.name} on Opsline.\n\nAccept the invitation: ${acceptUrl}`,
          idempotencyKey: `invite_${data.invitation.id}`,
        });
      },
    }),
    nextCookies(),
  ],
});
