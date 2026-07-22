import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { SearchPalette } from "@/components/react/SearchPalette";
import { ThemeToggle } from "@/components/react/ThemeToggle";
import { SITE_NAME } from "@/lib/config/site";
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  FocusOffIcon,
  FocusOnIcon,
  FullscreenOffIcon,
  FullscreenOnIcon,
  GridIcon,
  InfoIcon,
  MenuIcon,
  ShieldCheckIcon,
} from "@/components/react/icons";

const SIDEBAR_COLLAPSED_KEY = "opentoolbox-sidebar-collapsed";

interface CategorySummary {
  id: string;
  name: string;
}

interface RelatedToolSummary {
  slug: string;
  name: string;
  categoryName?: string;
}

interface ToolSummaryProps {
  name: string;
  shortDescription: string;
  description: string[];
  usageNotes: string[];
  executionMode: "browser" | "server";
}

interface ToolWorkspaceShellProps {
  tool: ToolSummaryProps;
  category?: CategorySummary;
  categories: CategorySummary[];
  relatedTools: RelatedToolSummary[];
  children: ReactNode;
}

function PrivacyBadge({
  executionMode,
}: {
  executionMode: "browser" | "server";
}) {
  return (
    <div className="border-success/30 bg-success/10 text-success inline-flex w-fit items-center gap-2 rounded-md border px-2.5 py-1 text-xs">
      <ShieldCheckIcon className="h-3.5 w-3.5" />
      {executionMode === "browser"
        ? "Runs entirely in your browser — nothing you enter is sent anywhere."
        : "This tool sends data to a server to work — see the info panel for details."}
    </div>
  );
}

function iconButtonClass(active?: boolean) {
  return `inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors ${
    active
      ? "bg-accent/15 text-accent"
      : "text-text-muted hover:bg-bg-sunken hover:text-text"
  }`;
}

export function ToolWorkspaceShell({
  tool,
  category,
  categories,
  relatedTools,
  children,
}: ToolWorkspaceShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenSupported, setFullscreenSupported] = useState(false);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  const shellRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const drawerFirstLinkRef = useRef<HTMLAnchorElement>(null);
  const helpCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored === "true") setSidebarCollapsed(true);
    } catch {
      // localStorage unavailable (private browsing, disabled storage) — fall
      // back to the default expanded sidebar.
    }
    setFullscreenSupported(
      typeof document !== "undefined" && document.fullscreenEnabled,
    );
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    setIsDesktop(query.matches);
    function onChange(e: MediaQueryListEvent) {
      setIsDesktop(e.matches);
    }
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (drawerOpen) {
        setDrawerOpen(false);
        hamburgerRef.current?.focus();
      } else if (helpOpen) {
        setHelpOpen(false);
        helpButtonRef.current?.focus();
      } else if (focusMode) {
        setFocusMode(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen, helpOpen, focusMode]);

  useEffect(() => {
    if (drawerOpen) {
      requestAnimationFrame(() => drawerFirstLinkRef.current?.focus());
    }
  }, [drawerOpen]);

  useEffect(() => {
    if (helpOpen) {
      requestAnimationFrame(() => helpCloseRef.current?.focus());
    }
  }, [helpOpen]);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // Non-fatal — the preference just won't persist this session.
      }
      return next;
    });
  }, []);

  async function toggleFullscreen() {
    setFullscreenError(null);
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (shellRef.current) {
        await shellRef.current.requestFullscreen();
      }
    } catch {
      setFullscreenError(
        "Fullscreen wasn't allowed by the browser just now — you can still use Focus mode instead.",
      );
    }
  }

  const navLinkClass = (activeId: string | undefined, id: string) =>
    `flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
      activeId === id
        ? "bg-accent/10 text-accent font-medium"
        : "text-text-muted hover:bg-bg-sunken hover:text-text"
    }`;

  const sidebarContent = (
    <>
      <div className="flex flex-col gap-1 p-3">
        <a
          ref={drawerFirstLinkRef}
          href="/tools/"
          className={navLinkClass(undefined, "__all__")}
        >
          <GridIcon className="h-4 w-4 shrink-0" />
          <span className={sidebarCollapsed ? "md:hidden" : ""}>All tools</span>
        </a>
        <div
          className={`text-text-muted mt-2 px-2.5 text-xs font-semibold tracking-wide uppercase ${
            sidebarCollapsed ? "md:hidden" : ""
          }`}
        >
          Categories
        </div>
        {categories.map((c) => (
          <a
            key={c.id}
            href={`/categories/${c.id}/`}
            className={navLinkClass(category?.id, c.id)}
            aria-current={category?.id === c.id ? "page" : undefined}
          >
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                category?.id === c.id ? "bg-accent" : "bg-border-strong"
              }`}
              aria-hidden="true"
            />
            <span className={sidebarCollapsed ? "md:hidden" : "truncate"}>
              {c.name}
            </span>
          </a>
        ))}
      </div>

      {relatedTools.length > 0 && (
        <div
          className={`flex flex-col gap-1 p-3 pt-0 ${sidebarCollapsed ? "md:hidden" : ""}`}
        >
          <div className="text-text-muted px-2.5 text-xs font-semibold tracking-wide uppercase">
            Related tools
          </div>
          {relatedTools.map((t) => (
            <a
              key={t.slug}
              href={`/tools/${t.slug}/`}
              className="hover:bg-bg-sunken flex flex-col gap-0.5 rounded-md px-2.5 py-1.5 text-sm"
            >
              <span className="text-text truncate font-medium">{t.name}</span>
              {t.categoryName && (
                <span className="text-text-muted truncate text-xs">
                  {t.categoryName}
                </span>
              )}
            </a>
          ))}
        </div>
      )}
    </>
  );

  return (
    <div
      ref={shellRef}
      className="bg-bg text-text flex h-dvh flex-col overflow-hidden"
    >
      {!focusMode && (
        <header
          className="border-border bg-bg/95 flex shrink-0 items-center gap-2 border-b px-3 py-2 backdrop-blur"
          style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
        >
          <button
            ref={hamburgerRef}
            type="button"
            onClick={() => setDrawerOpen(true)}
            className={`${iconButtonClass()} md:hidden`}
            aria-label="Open navigation menu"
            aria-expanded={drawerOpen}
          >
            <MenuIcon className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            className={`${iconButtonClass()} hidden md:inline-flex`}
            aria-label={
              sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
            aria-pressed={sidebarCollapsed}
          >
            {sidebarCollapsed ? (
              <ChevronRightIcon className="h-5 w-5" />
            ) : (
              <ChevronLeftIcon className="h-5 w-5" />
            )}
          </button>

          <a
            href="/"
            className="text-text hidden shrink-0 items-center gap-2 text-sm font-bold sm:flex"
          >
            <span
              className="bg-accent text-accent-contrast flex h-7 w-7 items-center justify-center rounded-md font-mono text-sm"
              aria-hidden="true"
            >
              {"{}"}
            </span>
            <span className="hidden lg:inline">{SITE_NAME}</span>
          </a>

          <div className="min-w-0 flex-1 truncate px-1 text-sm">
            {category && (
              <a
                href={`/categories/${category.id}/`}
                className="text-text-muted hover:text-text hover:underline"
              >
                {category.name}
              </a>
            )}
            {category && <span className="text-text-muted mx-1">/</span>}
            <span className="text-text font-semibold">{tool.name}</span>
          </div>

          <div className="hidden w-56 sm:block">
            <SearchPalette />
          </div>

          <button
            ref={helpButtonRef}
            type="button"
            onClick={() => setHelpOpen((v) => !v)}
            className={iconButtonClass(helpOpen)}
            aria-label="Tool info and privacy details"
            aria-expanded={helpOpen}
          >
            <InfoIcon className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setFocusMode(true)}
            className={iconButtonClass()}
            aria-label="Enter focus mode"
          >
            <FocusOnIcon className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            disabled={!fullscreenSupported}
            title={
              fullscreenSupported
                ? undefined
                : "Fullscreen isn't supported in this browser"
            }
            aria-disabled={!fullscreenSupported}
            className={`${iconButtonClass()} disabled:cursor-not-allowed disabled:opacity-40`}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <FullscreenOffIcon className="h-5 w-5" />
            ) : (
              <FullscreenOnIcon className="h-5 w-5" />
            )}
          </button>

          <ThemeToggle />

          <a
            href="/tools/"
            className="border-border-strong text-text-muted hover:bg-bg-sunken hover:text-text ml-1 hidden shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm sm:inline-flex"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span className="hidden lg:inline">All tools</span>
          </a>
        </header>
      )}

      {focusMode && (
        <div
          className="border-border bg-bg/95 flex shrink-0 items-center gap-2 border-b px-3 py-2 backdrop-blur"
          style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
        >
          <button
            type="button"
            onClick={() => setFocusMode(false)}
            className="border-border-strong text-text inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium"
          >
            <FocusOffIcon className="h-4 w-4" />
            Exit focus mode
          </button>
          <span className="text-text-muted min-w-0 flex-1 truncate text-sm">
            {tool.name}
          </span>
          <ThemeToggle />
        </div>
      )}

      <div className="relative flex min-h-0 flex-1">
        {!focusMode && drawerOpen && (
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation menu"
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
          />
        )}

        {!focusMode && (
          <aside
            className={`border-border bg-bg-elevated fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-y-auto border-r transition-transform duration-200 md:static md:z-auto md:shrink-0 md:translate-x-0 md:transition-[width] ${
              drawerOpen ? "translate-x-0" : "-translate-x-full"
            } ${sidebarCollapsed ? "md:w-14" : "md:w-60"}`}
            style={{
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
            aria-label="Tool navigation"
            inert={!isDesktop && !drawerOpen ? true : undefined}
          >
            <div className="border-border flex items-center justify-between border-b p-3 md:hidden">
              <span className="text-text text-sm font-bold">{SITE_NAME}</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className={iconButtonClass()}
                aria-label="Close navigation menu"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            {sidebarContent}
          </aside>
        )}

        <main
          className="min-w-0 flex-1 overflow-y-auto"
          style={{
            paddingLeft: "env(safe-area-inset-left)",
            paddingRight: "env(safe-area-inset-right)",
          }}
        >
          <div className="mx-auto flex min-h-full max-w-[1600px] flex-col gap-4 p-4 sm:p-6">
            {!focusMode && (
              <div className="flex flex-col gap-2">
                <h1 className="text-text text-xl font-bold sm:text-2xl">
                  {tool.name}
                </h1>
                <p className="text-text-muted max-w-3xl text-sm">
                  {tool.shortDescription}
                </p>
                <PrivacyBadge executionMode={tool.executionMode} />
              </div>
            )}

            {fullscreenError && (
              <div
                role="alert"
                className="border-danger/40 bg-danger/10 text-danger rounded-md border px-3 py-2 text-sm"
              >
                {fullscreenError}
              </div>
            )}

            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          </div>
        </main>

        <aside
          className={`border-border bg-bg-elevated fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col overflow-y-auto border-l shadow-2xl transition-transform duration-200 ${
            helpOpen ? "translate-x-0" : "translate-x-full"
          }`}
          aria-label="Tool info and privacy details"
          inert={!helpOpen ? true : undefined}
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="border-border flex items-center justify-between border-b p-3">
            <span className="text-text text-sm font-semibold">
              About this tool
            </span>
            <button
              ref={helpCloseRef}
              type="button"
              onClick={() => setHelpOpen(false)}
              className={iconButtonClass()}
              aria-label="Close info panel"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-col gap-4 p-4 text-sm">
            <div className="text-text-muted flex flex-col gap-3">
              {tool.description.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <PrivacyBadge executionMode={tool.executionMode} />
            {tool.usageNotes.length > 0 && (
              <div>
                <h2 className="text-text-muted mb-2 text-xs font-semibold tracking-wide uppercase">
                  Usage notes
                </h2>
                <ul className="text-text-muted flex flex-col gap-1.5">
                  {tool.usageNotes.map((note) => (
                    <li key={note} className="flex gap-2">
                      <span aria-hidden="true">•</span>
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
