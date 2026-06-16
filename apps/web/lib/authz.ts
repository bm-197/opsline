import { type Context, requireContext } from "./context";
import { roles } from "./permissions";

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

type Permission = Parameters<(typeof roles)["admin"]["authorize"]>[0];

// Requires a signed-in user whose role grants the given permission. Returns the
// context on success, throws ForbiddenError otherwise. Mirrors the policies in
// lib/permissions.ts: viewer reads, operator runs/approves, admin everything.
export async function requirePermission(perm: Permission): Promise<Context> {
  const ctx = await requireContext();
  const role = roles[ctx.role as keyof typeof roles] ?? roles.viewer;
  if (!role.authorize(perm).success) {
    throw new ForbiddenError();
  }
  return ctx;
}

export function can(role: string, perm: Permission): boolean {
  const r = roles[role as keyof typeof roles] ?? roles.viewer;
  return r.authorize(perm).success;
}
