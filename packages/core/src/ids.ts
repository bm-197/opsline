import { customAlphabet } from "nanoid";

const nano = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 16);

export const ID_PREFIXES = {
  workflow: "wf",
  workflowVersion: "wfv",
  run: "run",
  stepRun: "step",
  approval: "apr",
  auditEvent: "aud",
  webhookEndpoint: "whk",
  apiKey: "key",
  organization: "org",
  membership: "mem",
  user: "usr",
  session: "ses",
  account: "acc",
  verification: "ver",
  invitation: "inv",
} as const;

export type IdEntity = keyof typeof ID_PREFIXES;
export type IdPrefix = (typeof ID_PREFIXES)[IdEntity];

export function createRawId(prefix: string): string {
  return `${prefix}_${nano()}`;
}

export function createId(entity: IdEntity): string {
  return createRawId(ID_PREFIXES[entity]);
}
