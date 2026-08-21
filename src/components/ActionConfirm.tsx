import React from "react";
import { ResponseActionDef } from "../data/securityData";
import { useStore } from "../store";
import { Icon } from "./icons";
import { Btn, Modal, RiskTag } from "./ui";

export default function ActionConfirm({ def, onClose }: { def: ResponseActionDef | null; onClose: () => void }) {
  const { executeAction } = useStore();
  if (!def) return null;
  const dangerous = def.risk !== "safe";
  return (
    <Modal
      open
      onClose={onClose}
      kicker="Confirm containment action"
      title={<span className="flex items-center gap-3">{def.label} <RiskTag risk={def.risk} /></span>}
      width={580}
    >
      <div className="space-y-4">
        <div className="border border-edge rounded-sm bg-panel2/70 p-4">
          <div className="lbl mb-1.5">Target</div>
          <div className="font-mono text-[13.5px] text-ink">{def.target}</div>
        </div>
        <div>
          <div className="lbl mb-1.5">What will happen</div>
          <p className="text-[13.5px] text-ink leading-relaxed">{def.impact}</p>
        </div>
        <div>
          <div className="lbl mb-1.5">Why it is recommended</div>
          <p className="text-[13.5px] text-mut leading-relaxed">{def.why}</p>
        </div>
        <div>
          <div className="lbl mb-1.5">Potential consequences</div>
          <p className="text-[13.5px] text-mut leading-relaxed">{def.consequence}</p>
        </div>
        <div className={`flex items-start gap-3 border rounded-sm p-3.5 ${dangerous ? "border-crit/35 bg-crit/8 text-crit" : "border-sig/30 bg-sig/6 text-sig"}`}>
          <Icon name={dangerous ? "alertTriangle" : "check"} size={16} className="mt-0.5 shrink-0" />
          <p className="text-[12.5px] leading-relaxed">
            {dangerous
              ? "This action is destructive and can interrupt production traffic. It will be recorded in the audit trail with your identity."
              : "Low-risk action. It will be recorded in the audit trail."}
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn
            variant={dangerous ? "danger" : "solid"}
            onClick={() => {
              executeAction(def.id);
              onClose();
            }}
          >
            <Icon name="zap" size={13} /> Execute action
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
