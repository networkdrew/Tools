/**
 * Single source of truth for site-wide identity and URLs.
 * `astro.config.mjs` imports SITE_URL from here to set Astro's `site` field,
 * so this file — not astro.config — is the one place to change the
 * production origin. Astro also exposes it at runtime as `Astro.site`.
 */

export const SITE_NAME = "OpenToolbox";

export const SITE_TAGLINE = "Fast, free, browser-based tools";

export const SITE_DESCRIPTION =
  "A free, ad-light collection of browser-based tools for everyday tasks — formatting, generating, and converting data without installing anything or handing your files to a server.";

/** Production canonical origin, no trailing slash. Mirrors astro.config.mjs `site`. */
export const SITE_URL = "https://tools.drewcassidy.dev";

export const GITHUB_URL: string | undefined = undefined;

export const NAV_LINKS = [
  { label: "All tools", href: "/tools" },
  { label: "Categories", href: "/tools#categories" },
] as const;
