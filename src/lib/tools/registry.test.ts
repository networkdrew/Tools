import { describe, expect, it } from "vitest";
import { tools } from "./registry";
import { categories } from "./categories";

describe("tool registry integrity", () => {
  it("has at least one tool", () => {
    expect(tools.length).toBeGreaterThan(0);
  });

  it("has unique ids", () => {
    const ids = tools.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique slugs", () => {
    const slugs = tools.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("only references categories that exist", () => {
    const categoryIds = new Set(categories.map((c) => c.id));
    for (const tool of tools) {
      expect(
        categoryIds.has(tool.categoryId),
        `${tool.id} -> ${tool.categoryId}`,
      ).toBe(true);
    }
  });

  it("only references related tools that exist", () => {
    const ids = new Set(tools.map((t) => t.id));
    for (const tool of tools) {
      for (const relatedId of tool.relatedTools) {
        expect(ids.has(relatedId), `${tool.id} -> related ${relatedId}`).toBe(
          true,
        );
      }
    }
  });

  it("never lists a tool as related to itself", () => {
    for (const tool of tools) {
      expect(tool.relatedTools).not.toContain(tool.id);
    }
  });

  it("keeps short descriptions within a reasonable meta-description length", () => {
    for (const tool of tools) {
      expect(tool.shortDescription.length).toBeLessThanOrEqual(160);
    }
  });

  it("has a valid, non-future addedAt date", () => {
    const now = Date.now();
    for (const tool of tools) {
      const parsed = new Date(`${tool.addedAt}T00:00:00Z`).getTime();
      expect(Number.isNaN(parsed), tool.id).toBe(false);
      expect(parsed).toBeLessThanOrEqual(now);
    }
  });
});

describe("category registry integrity", () => {
  it("has unique category ids", () => {
    const ids = categories.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has no empty categories", () => {
    for (const category of categories) {
      const count = tools.filter((t) => t.categoryId === category.id).length;
      expect(count, category.id).toBeGreaterThan(0);
    }
  });
});
