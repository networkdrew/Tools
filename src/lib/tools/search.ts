import Fuse, { type IFuseOptions } from "fuse.js";
import { tools } from "./registry";
import { getCategory } from "./categories";
import type { ToolMeta } from "./schema";

interface SearchableTool {
  tool: ToolMeta;
  name: string;
  shortDescription: string;
  categoryName: string;
  tags: string[];
  aliases: string[];
}

const searchableTools: SearchableTool[] = tools.map((tool) => ({
  tool,
  name: tool.name,
  shortDescription: tool.shortDescription,
  categoryName: getCategory(tool.categoryId)?.name ?? "",
  tags: tool.tags,
  aliases: tool.aliases,
}));

const fuseOptions: IFuseOptions<SearchableTool> = {
  includeScore: true,
  threshold: 0.35,
  ignoreLocation: true,
  keys: [
    { name: "name", weight: 3 },
    { name: "aliases", weight: 2.5 },
    { name: "tags", weight: 2 },
    { name: "shortDescription", weight: 1 },
    { name: "categoryName", weight: 1 },
  ],
};

let fuse: Fuse<SearchableTool> | undefined;

function getFuse(): Fuse<SearchableTool> {
  fuse ??= new Fuse(searchableTools, fuseOptions);
  return fuse;
}

/** Fuzzy-searches every tool by name, description, tags, aliases, and category name. */
export function searchTools(query: string): ToolMeta[] {
  const trimmed = query.trim();
  if (!trimmed) return [...tools];
  return getFuse()
    .search(trimmed)
    .map((result) => result.item.tool);
}
