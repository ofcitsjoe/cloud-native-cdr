import React, { useState } from "react";
import Analyst from "./components/Analyst";
import { Icon, IconName } from "./components/icons";
import { StoreProvider, View, useStore } from "./store";
import AppShell from "./app/AppShell";
import Landing from "./landing/Landing";
import Dashboard from "./views/Dashboard";
import Threats from "./views/Threats";
import NovelThreats from "./views/NovelThreats";
import TrafficAnomaly from "./views/TrafficAnomaly";
import Incidents from "./views/Incidents";
import Events from "./views/Events";
import Infrastructure from "./views/Infrastructure";
import AttackPath from "./views/AttackPath";
import Response from "./views/Response";
import Rules from "./views/Rules";

const KIND_META: Record<string, { c: string; icon: IconName }> = {
  ok: { c: "#2FD6B5", icon: "check" },
  warn: { c: "#FFCE5C", icon: "alertTriangle" },
  crit: { c: "#FF5D55", icon: "alertCircle" },
  info: { c: "#5CB8FF", icon: "fileText" },
};

function ToastHost() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="fixed bottom-5 right-5 z-[95] space-y-2 w-[min(360px,calc(100vw-40px))]">
      {toasts.map((t) => {
        const m = KIND_META[t.kind];
        return (
          <div key={t.id} className="toast-in panel rounded-md px-4 py-3.5 flex items-start gap-3 shadow-xl shadow-abyss/60" style={{ borderColor: m.c + "44" }}>
            <span className="w-7 h-7 rounded-sm flex items-center justify-center shrink-0" style={{ background: m.c + "14", color: m.c }}>
              <Icon name={m.icon} size={14} />
            </span>
            <p className="text-[12.5px] text-ink leading-snug flex-1 pt-1">{t.msg}</p>
            <button onClick={() => dismissToast(t.id)} className="text-dim hover:text-ink transition-colors pt-1" aria-label="Dismiss notification">
              <Icon name="x" size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function Console() {
  const { view } = useStore();
  switch (view) {
    case "threats": return <Threats />;
    case "novel_threats": return <NovelThreats />;
    case "traffic_anomalies": return <TrafficAnomaly />;
    case "incidents": return <Incidents />;
    case "events": return <Events />;
    case "infrastructure": return <Infrastructure />;
    case "attackpath": return <AttackPath />;
    case "response": return <Response />;
    case "rules": return <Rules />;
    default: return <Dashboard />;
  }
}

function AppInner() {
  const [mode, setMode] = useState<"landing" | "console">("landing");
  const { go } = useStore();

  const enter = (v?: View) => {
    setMode("console");
    if (v) go(v);
    window.scrollTo({ top: 0 });
  };
  const exit = () => {
    setMode("landing");
    window.scrollTo({ top: 0 });
  };

  return (
    <>
      {mode === "landing" ? (
        <Landing onEnter={enter} />
      ) : (
        <AppShell onExit={exit}>
          <Console />
        </AppShell>
      )}
      <Analyst />
      <ToastHost />
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppInner />
    </StoreProvider>
  );
}
