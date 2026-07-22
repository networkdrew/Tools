/**
 * Small inline SVG icon set for React islands that can't reach Icon.astro's
 * build-time glob (that mechanism only runs in .astro files). Path data is
 * copied from the same lucide-static set Icon.astro draws from, so the two
 * icon sources stay visually consistent.
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function makeIcon(paths: string[]) {
  return function Icon({ className, ...rest }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={className}
        {...rest}
      >
        {paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    );
  };
}

export const MenuIcon = makeIcon(["M4 5h16", "M4 12h16", "M4 19h16"]);

export const CloseIcon = makeIcon(["M18 6 6 18", "m6 6 12 12"]);

export const ChevronLeftIcon = makeIcon(["m15 18-6-6 6-6"]);

export const ChevronRightIcon = makeIcon(["m9 18 6-6-6-6"]);

export const FocusOnIcon = makeIcon([
  "M15 3h6v6",
  "m21 3-7 7",
  "m3 21 7-7",
  "M9 21H3v-6",
]);

export const FocusOffIcon = makeIcon([
  "m14 10 7-7",
  "M20 10h-6V4",
  "m3 21 7-7",
  "M4 14h6v6",
]);

export const FullscreenOnIcon = makeIcon([
  "m15 15 6 6",
  "m15 9 6-6",
  "M21 16v5h-5",
  "M21 8V3h-5",
  "M3 16v5h5",
  "m3 21 6-6",
  "M3 8V3h5",
  "M9 9 3 3",
]);

export const FullscreenOffIcon = makeIcon([
  "m15 15 6 6m-6-6v4.8m0-4.8h4.8",
  "M9 19.8V15m0 0H4.2M9 15l-6 6",
  "M15 4.2V9m0 0h4.8M15 9l6-6",
  "M9 4.2V9m0 0H4.2M9 9 3 3",
]);

export function InfoIcon({ className, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <circle cx={12} cy={12} r={10} />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

export const HomeIcon = makeIcon([
  "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",
  "M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
]);

export const GridIcon = function Icon({ className, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <rect width={7} height={7} x={3} y={3} rx={1} />
      <rect width={7} height={7} x={14} y={3} rx={1} />
      <rect width={7} height={7} x={14} y={14} rx={1} />
      <rect width={7} height={7} x={3} y={14} rx={1} />
    </svg>
  );
};

export const ArrowLeftIcon = makeIcon(["m12 19-7-7 7-7", "M19 12H5"]);

export function ShieldCheckIcon({ className, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
