import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export const Icon = {
  shield: (p: IconProps) => (
    <svg {...base(p)}><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" /><path d="m9 12 2 2 4-4" /></svg>
  ),
  spark: (p: IconProps) => (
    <svg {...base(p)}><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="M12 8a4 4 0 0 0 4 4 4 4 0 0 0-4 4 4 4 0 0 0-4-4 4 4 0 0 0 4-4z" /></svg>
  ),
  bolt: (p: IconProps) => (
    <svg {...base(p)}><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" /></svg>
  ),
  send: (p: IconProps) => (
    <svg {...base(p)}><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7z" /></svg>
  ),
  key: (p: IconProps) => (
    <svg {...base(p)}><circle cx="8" cy="15" r="4" /><path d="m10.5 12.5 7-7M17 5l3 3M15 7l2 2" /></svg>
  ),
  rocket: (p: IconProps) => (
    <svg {...base(p)}><path d="M5 13c-1.5.5-3 2-3 6 4 0 5.5-1.5 6-3" /><path d="M14 4c4 1 6 3 6 3s-1 6-5 9l-5-1-3-3 1-5c3-4 6-3 6-3z" /><circle cx="14.5" cy="9.5" r="1.5" /></svg>
  ),
  inbox: (p: IconProps) => (
    <svg {...base(p)}><path d="M3 12h5l2 3h4l2-3h5" /><path d="M5 5h14l2 7v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5l2-7z" /></svg>
  ),
  bot: (p: IconProps) => (
    <svg {...base(p)}><rect x="4" y="8" width="16" height="11" rx="3" /><path d="M12 8V4M9 13h.01M15 13h.01M2 13h2M20 13h2" /></svg>
  ),
  webhook: (p: IconProps) => (
    <svg {...base(p)}><path d="M9 7a3 3 0 1 1 4.5 2.6L11 14" /><path d="M7 14a3 3 0 1 0 3 3h6" /><path d="M16 11a3 3 0 1 1-1.5 5.6" /></svg>
  ),
  link: (p: IconProps) => (
    <svg {...base(p)}><path d="M10 14a4 4 0 0 0 6 .5l2-2A4 4 0 0 0 12 7l-1 1" /><path d="M14 10a4 4 0 0 0-6-.5l-2 2A4 4 0 0 0 12 17l1-1" /></svg>
  ),
  chart: (p: IconProps) => (
    <svg {...base(p)}><path d="M4 20V10M10 20V4M16 20v-6M22 20H2" /></svg>
  ),
  report: (p: IconProps) => (
    <svg {...base(p)}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z" /><path d="M14 3v6h6M9 14l2 2 4-4" /></svg>
  ),
  check: (p: IconProps) => (
    <svg {...base(p)}><path d="m5 12 5 5L20 7" /></svg>
  ),
  arrow: (p: IconProps) => (
    <svg {...base(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  ),
  whatsapp: (p: IconProps) => (
    <svg {...base(p)}><path d="M4 5h16v13H9l-5 3V5z" /><path d="M8 10h8M8 14h5" /></svg>
  ),
  facebook: (p: IconProps) => (
    <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M9 12h6M12 9v6" /></svg>
  ),
  menu: (p: IconProps) => (
    <svg {...base(p)}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
  ),
  close: (p: IconProps) => (
    <svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>
  ),
  sun: (p: IconProps) => (
    <svg {...base(p)}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
  ),
  moon: (p: IconProps) => (
    <svg {...base(p)}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
  ),
  doubleTick: (p: IconProps) => (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M2 12l5 5 9-11" /><path d="M9 14l1 1 9-11" />
    </svg>
  ),
};

export type IconName = keyof typeof Icon;
