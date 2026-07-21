import { lazy, Suspense, type ComponentType } from "react";

/**
 * Astro can only hydrate a component it can statically see imported in the
 * .astro file — it can't trace a dynamic import stored in plain data (like
 * the tool registry) back to a client bundle. This is the one place that
 * indirection is resolved: each tool id maps to its own `React.lazy` import,
 * so Astro only ever needs to know about this single component, while Vite
 * still code-splits every tool's JS into its own chunk.
 *
 * Add a tool here (see docs/adding-a-tool.md) whenever you add one to the
 * registry — the "every id has a loader" test in ToolIslandLoader.test.tsx
 * fails loudly if the two fall out of sync.
 */
const componentLoaders: Record<
  string,
  ComponentType<Record<string, unknown>>
> = {
  "json-formatter": lazy(() => import("@/islands/JsonFormatterTool")),
  "password-generator": lazy(() => import("@/islands/PasswordGeneratorTool")),
  "text-stats-cleanup": lazy(() => import("@/islands/TextStatsTool")),
  "timestamp-converter": lazy(() => import("@/islands/TimestampConverterTool")),
  "base64-encoder-decoder": lazy(() => import("@/islands/Base64Tool")),
  "qr-code-generator": lazy(() => import("@/islands/QrCodeGeneratorTool")),
  "color-contrast-checker": lazy(() => import("@/islands/ColorContrastTool")),
  "image-compressor": lazy(() => import("@/islands/ImageCompressorTool")),
  "image-format-converter": lazy(
    () => import("@/islands/ImageFormatConverterTool"),
  ),
  "csv-json-converter": lazy(() => import("@/islands/CsvJsonConverterTool")),
  "image-metadata-remover": lazy(
    () => import("@/islands/ImageMetadataRemoverTool"),
  ),
};

export function getToolIslandIds(): string[] {
  return Object.keys(componentLoaders);
}

interface Props {
  toolId: string;
}

export default function ToolIslandLoader({ toolId }: Props) {
  const Component = componentLoaders[toolId];
  if (!Component) return null;
  return (
    <Suspense
      fallback={<p className="text-text-muted text-sm">Loading tool…</p>}
    >
      <Component />
    </Suspense>
  );
}
