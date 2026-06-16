import { describe, expect, it } from "vitest";

import { createId, ID_PREFIXES, type IdEntity } from "./ids";

describe("createId", () => {
  it("prefixes ids with the entity tag", () => {
    expect(createId("run")).toMatch(/^run_[0-9a-z]{16}$/);
    expect(createId("workflow")).toMatch(/^wf_[0-9a-z]{16}$/);
  });

  it("supports every registered entity", () => {
    for (const [entity, prefix] of Object.entries(ID_PREFIXES)) {
      expect(createId(entity as IdEntity)).toMatch(
        new RegExp(`^${prefix}_[0-9a-z]{16}$`),
      );
    }
  });

  it("does not collide across many ids", () => {
    const ids = new Set(
      Array.from({ length: 10_000 }, () => createId("workflow")),
    );
    expect(ids.size).toBe(10_000);
  });
});
