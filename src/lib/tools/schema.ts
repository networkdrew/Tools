import { z } from "zod";

/**
 * How a tool gets its work done. Every tool today is "browser" — the
 * enum exists so a future tool that genuinely needs a server round-trip
 * (and must say so honestly in its privacy badge) has somewhere to live.
 */
export const executionModeSchema = z.enum(["browser", "server"]);
export type ExecutionMode = z.infer<typeof executionModeSchema>;

export const toolMetaSchema = z.object({
  /** Permanent internal identifier. Never reuse or repurpose after publishing. */
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id must be kebab-case"),
  /** URL path segment under /tools/. Usually equal to id; kept distinct so a
   *  tool can be renamed for SEO without breaking its permanent id. */
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug must be kebab-case"),
  name: z.string().min(1),
  shortDescription: z.string().min(1).max(160),
  /** Paragraphs shown in the tool page's intro. */
  description: z.array(z.string().min(1)).min(1),
  categoryId: z.string().min(1),
  tags: z.array(z.string().min(1)).default([]),
  /** Alternate search wording ("json to text", "obj minifier", etc). */
  aliases: z.array(z.string().min(1)).default([]),
  executionMode: executionModeSchema,
  featured: z.boolean().default(false),
  /** ISO date (YYYY-MM-DD) the tool was published. Drives "new" badges and sort. */
  addedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "addedAt must be YYYY-MM-DD"),
  /** ids of other tools to surface as "related". */
  relatedTools: z.array(z.string()).default([]),
  /** Short, practical tips shown below the tool UI. */
  usageNotes: z.array(z.string().min(1)).default([]),
  seo: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
    })
    .default({}),
});

export type ToolMeta = z.infer<typeof toolMetaSchema>;

export const categorySchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id must be kebab-case"),
  name: z.string().min(1),
  description: z.string().min(1),
  /** lucide icon name, rendered via lucide-static. */
  icon: z.string().min(1),
});

export type Category = z.infer<typeof categorySchema>;
