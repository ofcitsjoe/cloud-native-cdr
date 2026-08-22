import React from "react";

export type IconName =
  | "shield" | "radar" | "pulse" | "server" | "box" | "database" | "cloud" | "network"
  | "user" | "key" | "alertTriangle" | "alertCircle" | "check" | "x" | "search" | "filter"
  | "chevronDown" | "chevronRight" | "chevronLeft" | "arrowRight" | "arrowUpRight" | "clock"
  | "globe" | "cpu" | "layers" | "terminal" | "zap" | "target" | "eye" | "activity"
  | "gitBranch" | "lock" | "ban" | "play" | "sparkle" | "send" | "fileText" | "crosshair"
  | "list" | "grid" | "radio" | "siren" | "route" | "settings" | "external"
  | "brain" | "waveform" | "gitMerge" | "shieldCheck" | "shieldAlert";

const P: Record<IconName, React.ReactNode> = {
  shield: <path d="M12 2.5 20 6v6c0 5-3.4 8.4-8 9.5C7.4 20.4 4 17 4 12V6l8-3.5Z" />,
  radar: <><path d="M12 3a9 9 0 1 0 9 9" /><path d="M12 7a5 5 0 1 0 5 5" /><path d="M12 12 18 6" /><circle cx="12" cy="12" r="0.8" fill="currentColor" /></>,
  pulse: <path d="M2 12h4l3-8 4 16 3-8h6" />,
  server: <><rect x="3" y="4" width="18" height="7" rx="1" /><rect x="3" y="13" width="18" height="7" rx="1" /><path d="M7 7.5h.01M7 16.5h.01" /></>,
  box: <><path d="m12 2 8 4.5v9L12 20l-8-4.5v-9L12 2Z" /><path d="M12 11 4 6.5M12 11l8-4.5M12 11v9" /></>,
  database: <><ellipse cx="12" cy="5.5" rx="8" ry="3" /><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13" /><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>,
  cloud: <path d="M7 18a5 5 0 0 1-.9-9.9A6.5 6.5 0 0 1 18.6 9.3 4.5 4.5 0 0 1 17.5 18H7Z" />,
  network: <><circle cx="12" cy="5" r="2.2" /><circle cx="5" cy="19" r="2.2" /><circle cx="19" cy="19" r="2.2" /><path d="M12 7.2v4.3m0 0-5.4 5.4m5.4-5.4 5.4 5.4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5c1.4-3.3 4.2-5 7.5-5s6.1 1.7 7.5 5" /></>,
  key: <><circle cx="8" cy="15" r="4.5" /><path d="m11.5 11.5 8-8M17 6l2.5 2.5M14 9l2 2" /></>,
  alertTriangle: <><path d="M12 3.5 22 20H2L12 3.5Z" /><path d="M12 10v4.5M12 17.4h.01" /></>,
  alertCircle: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5V13M12 16.4h.01" /></>,
  check: <path d="m4.5 12.5 5 5L19.5 7" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></>,
  filter: <path d="M4 5h16l-6.2 7.2V19l-3.6-2v-4.8L4 5Z" />,
  chevronDown: <path d="m6 9.5 6 6 6-6" />,
  chevronRight: <path d="m9.5 6 6 6-6 6" />,
  chevronLeft: <path d="m14.5 6-6 6 6 6" />,
  arrowRight: <path d="M4 12h15m-6-6 6 6-6 6" />,
  arrowUpRight: <path d="M7 17 17 7m-9 0h9v9" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.8 2.6 4 5.6 4 9s-1.2 6.4-4 9c-2.8-2.6-4-5.6-4-9s1.2-6.4 4-9Z" /></>,
  cpu: <><rect x="6" y="6" width="12" height="12" rx="1" /><rect x="10" y="10" width="4" height="4" /><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5M3 17.5l9 5 9-5" opacity="0.55" /></>,
  terminal: <><rect x="3" y="4" width="18" height="16" rx="1.5" /><path d="m7 9 3.5 3L7 15M13 15h4" /></>,
  zap: <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z" />,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="0.8" fill="currentColor" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></>,
  activity: <path d="M3 12h4l2.5-6.5L14 18l2.5-6H21" />,
  gitBranch: <><circle cx="6" cy="5" r="2.2" /><circle cx="6" cy="19" r="2.2" /><circle cx="18" cy="9" r="2.2" /><path d="M6 7.2v9.6M6 12c0-3 4-3 8.5-3" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="1.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>,
  ban: <><circle cx="12" cy="12" r="9" /><path d="M5.7 5.7l12.6 12.6" /></>,
  play: <path d="M7 4.5v15L19.5 12 7 4.5Z" />,
  sparkle: <><path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18l-1.8-5.4L4.5 10.8 10.2 9 12 3.5Z" /><path d="M19 15.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6Z" opacity="0.6" /></>,
  send: <path d="M21 3 10.5 13.5M21 3l-7 18-3.5-7.5L3 10 21 3Z" />,
  fileText: <><path d="M6 2.5h8L19 8v13.5H6V2.5Z" /><path d="M14 2.5V8h5M9 12.5h6M9 16h6" /></>,
  crosshair: <><circle cx="12" cy="12" r="8" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></>,
  list: <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />,
  grid: <><rect x="3" y="3" width="7.5" height="7.5" rx="1" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1" /></>,
  radio: <><circle cx="12" cy="12" r="2" /><path d="M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 19.1a10 10 0 0 1 0-14.2M19.1 4.9a10 10 0 0 1 0 14.2" /></>,
  siren: <><path d="M6 20v-6a6 6 0 0 1 12 0v6" /><path d="M4 20h16M12 3v2M4.5 6.5 6 8M19.5 6.5 18 8" /></>,
  route: <><circle cx="6" cy="19" r="2.2" /><circle cx="18" cy="5" r="2.2" /><path d="M8.2 19H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7" /></>,
  external: <><path d="M14 4h6v6" /><path d="M20 4 10.5 13.5" /><path d="M19 14v5.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-11A1.5 1.5 0 0 1 6.5 7H12" /></>,
  brain: <><path d="M9.5 2A2.5 2.5 0 0 0 7 4.5v.7A4.5 4.5 0 0 0 3 9.5c0 1.2.5 2.4 1.3 3.2A4.5 4.5 0 0 0 4 15.5a4.5 4.5 0 0 0 4.5 4.5h1" /><path d="M14.5 2A2.5 2.5 0 0 1 17 4.5v.7A4.5 4.5 0 0 1 21 9.5c0 1.2-.5 2.4-1.3 3.2A4.5 4.5 0 0 1 20 15.5a4.5 4.5 0 0 1-4.5 4.5h-1" /><path d="M12 4v16M8 8h3M13 8h3M7 13h4M13 13h4" /></>,
  waveform: <><path d="M2 10v4M6 6v12M10 3v18M14 8v8M18 5v14M22 10v4" /></>,
  gitMerge: <><circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M6 9v12M6 12a9 9 0 0 0 9 6" /></>,
  shieldCheck: <><path d="M12 2.5 20 6v6c0 5-3.4 8.4-8 9.5C7.4 20.4 4 17 4 12V6l8-3.5Z" /><path d="m9 12 2 2 4-4" /></>,
  shieldAlert: <><path d="M12 2.5 20 6v6c0 5-3.4 8.4-8 9.5C7.4 20.4 4 17 4 12V6l8-3.5Z" /><path d="M12 8v4M12 16h.01" /></>,
};

export function Icon({ name, size = 18, className = "", strokeWidth = 1.6 }: { name: IconName; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {P[name]}
    </svg>
  );
}

export function Wordmark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = size === "lg" ? 26 : size === "sm" ? 15 : 18;
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <svg width={s + 8} height={s + 8} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M16 3 27 8.4V16c0 6.6-4.8 11.4-11 13C9.8 27.4 5 22.6 5 16V8.4L16 3Z" stroke="#2FD6B5" strokeWidth="1.8" />
        <circle cx="16" cy="14.6" r="2.6" fill="#FF5D55" />
        <path d="M16 17.2V24" stroke="#2FD6B5" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <span className="font-disp font-bold tracking-tight leading-none" style={{ fontSize: s }}>
        SENTINEL<span className="text-sig">-X</span>
      </span>
    </span>
  );
}
