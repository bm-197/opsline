import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
} from "better-auth/plugins/organization/access";

// Opsline resources layered on top of Better Auth's org-management statements.
export const statement = {
  ...defaultStatements,
  workflow: ["create", "read", "update", "delete", "run"],
  run: ["read", "cancel", "retry"],
  approval: ["read", "decide"],
  audit: ["read"],
  apiKey: ["create", "read", "delete"],
  webhook: ["create", "read", "delete"],
} as const;

export const ac = createAccessControl(statement);

// viewer: read-only across the product.
export const viewer = ac.newRole({
  workflow: ["read"],
  run: ["read"],
  approval: ["read"],
  audit: ["read"],
});

// operator: can run workflows and decide approvals, cannot edit definitions or org settings.
export const operator = ac.newRole({
  workflow: ["read", "run"],
  run: ["read", "cancel", "retry"],
  approval: ["read", "decide"],
  audit: ["read"],
});

// admin: everything, including org and member management.
export const admin = ac.newRole({
  ...adminAc.statements,
  workflow: ["create", "read", "update", "delete", "run"],
  run: ["read", "cancel", "retry"],
  approval: ["read", "decide"],
  audit: ["read"],
  apiKey: ["create", "read", "delete"],
  webhook: ["create", "read", "delete"],
});

export const roles = { admin, operator, viewer };
