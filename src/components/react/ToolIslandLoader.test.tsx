import { describe, expect, it } from "vitest";
import { tools } from "@/lib/tools/registry";
import { getToolIslandIds } from "./ToolIslandLoader";

describe("ToolIslandLoader", () => {
  it("has exactly one component loader per registry tool", () => {
    const registryIds = tools.map((t) => t.id).sort();
    const loaderIds = getToolIslandIds().sort();
    expect(loaderIds).toEqual(registryIds);
  });
});
