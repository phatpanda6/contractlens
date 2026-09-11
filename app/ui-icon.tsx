import type { SVGProps } from "react";

type IconName =
  | "lens"
  | "play"
  | "check"
  | "close"
  | "arrow"
  | "edit"
  | "code"
  | "clock"
  | "info"
  | "github";

const paths: Record<IconName, string> = {
  lens: "M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15ZM16 16l5 5M7 8l-2 2.5L7 13m7-5 2 2.5-2 2.5m-3-6-1 7",
  play: "m8 5 11 7-11 7V5Z",
  check: "m5 12 4 4L19 6",
  close: "m6 6 12 12M6 18 18 6",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  edit: "m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15v5Z",
  code: "m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 8v6m0-10v1",
  github:
    "M9 19c-4 1-4-2-6-2m12 5v-4a3.5 3.5 0 0 0-1-2.5c3.3-.4 6-1.6 6-6A4.7 4.7 0 0 0 19 6c.3-1 .2-2-.1-3 0 0-1.1-.3-3.5 1.3a12 12 0 0 0-6.8 0C6.2 2.7 5.1 3 5.1 3c-.3 1-.4 2-.1 3a4.7 4.7 0 0 0-1 3.5c0 4.4 2.7 5.6 6 6A3.5 3.5 0 0 0 9 18v4",
};

export function UiIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
