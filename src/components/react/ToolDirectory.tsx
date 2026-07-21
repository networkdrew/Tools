import { useMemo, useState } from "react";
import { tools } from "@/lib/tools/registry";
import { categories, getCategory } from "@/lib/tools/categories";
import { isNewTool } from "@/lib/tools/registry";
import { searchTools } from "@/lib/tools/search";
import { buttonGhost, textField } from "./styles";

type SortMode = "name" | "recent";

export function ToolDirectory() {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | "all">("all");
  const [sort, setSort] = useState<SortMode>("name");

  const results = useMemo(() => {
    const base = query.trim() ? searchTools(query) : [...tools];
    const filtered =
      categoryId === "all"
        ? base
        : base.filter((t) => t.categoryId === categoryId);
    const sorted = [...filtered].sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : b.addedAt.localeCompare(a.addedAt),
    );
    return sorted;
  }, [query, categoryId, sort]);

  const hasFilters = query.trim() !== "" || categoryId !== "all";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <label htmlFor="directory-search" className="sr-only">
          Search tools
        </label>
        <input
          id="directory-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, tag, or category…"
          className={`${textField} max-w-md`}
        />

        <div
          role="group"
          aria-label="Filter by category"
          className="flex flex-wrap gap-2"
        >
          <button
            type="button"
            aria-pressed={categoryId === "all"}
            onClick={() => setCategoryId("all")}
            className={pillClass(categoryId === "all")}
          >
            All categories
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={categoryId === category.id}
              onClick={() => setCategoryId(category.id)}
              className={pillClass(categoryId === category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-text-muted text-sm" aria-live="polite">
            Showing {results.length} of {tools.length} tools
          </p>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-text-muted">Sort</span>
            <button
              type="button"
              aria-pressed={sort === "name"}
              onClick={() => setSort("name")}
              className={pillClass(sort === "name")}
            >
              Name
            </button>
            <button
              type="button"
              aria-pressed={sort === "recent"}
              onClick={() => setSort("recent")}
              className={pillClass(sort === "recent")}
            >
              Recently added
            </button>
          </div>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="border-border flex flex-col items-center gap-3 rounded-lg border border-dashed py-12 text-center">
          <p className="text-text">No tools match your search.</p>
          <p className="text-text-muted max-w-sm text-sm">
            Try a different word, or clear your filters to see everything
            available.
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategoryId("all");
              }}
              className={buttonGhost}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((tool) => {
            const category = getCategory(tool.categoryId);
            return (
              <li key={tool.id}>
                <a
                  href={`/tools/${tool.slug}/`}
                  className="border-border bg-bg-elevated hover:border-accent flex h-full flex-col gap-2 rounded-lg border p-4 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-text-muted text-xs font-medium">
                      {category?.name}
                    </span>
                    {isNewTool(tool) && (
                      <span className="bg-accent/10 text-accent rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                        New
                      </span>
                    )}
                  </div>
                  <h3 className="text-text font-semibold">{tool.name}</h3>
                  <p className="text-text-muted text-sm">
                    {tool.shortDescription}
                  </p>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function pillClass(active: boolean): string {
  return active
    ? "rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-accent-contrast"
    : "rounded-full border border-border-strong bg-bg-elevated px-3 py-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text";
}
