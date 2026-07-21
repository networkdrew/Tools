import { categorySchema, type Category } from "./schema";

/**
 * Every category a tool can belong to. A category only appears here once it
 * has at least one real tool — see docs/adding-a-tool.md.
 */
const rawCategories = [
  {
    id: "developer-tools",
    name: "Developer Tools",
    description:
      "Format, validate, and convert the data structures you work with daily.",
    icon: "terminal",
  },
  {
    id: "security-privacy",
    name: "Security & Privacy",
    description:
      "Generate secrets and check your data without it ever leaving your device.",
    icon: "lock",
  },
  {
    id: "text-writing",
    name: "Text & Writing",
    description: "Clean up, measure, and reshape text.",
    icon: "type",
  },
  {
    id: "converters",
    name: "Converters & Calculators",
    description: "Turn one unit, format, or representation into another.",
    icon: "repeat",
  },
  {
    id: "accessibility",
    name: "Accessibility",
    description:
      "Check your designs and content against accessibility guidelines.",
    icon: "contrast",
  },
] as const satisfies readonly Category[];

export const categories: readonly Category[] = rawCategories.map((c) =>
  categorySchema.parse(c),
);

export function getCategory(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}
