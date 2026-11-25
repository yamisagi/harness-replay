"use client";

import { useState, useSyncExternalStore } from "react";
import { Gauge } from "lucide-react";
import {
  estimateSessionQuota,
  getPlansForHarness,
  loadSavedPlanId,
  savePlanId,
} from "@/src/lib/quota";
import { HarnessType, NormalizedSession, SessionAnalytics } from "@/src/types/session";
import { SWARM_STYLES } from "./SwarmStyles";

interface QuotaImpactCardProps {
  session: NormalizedSession;
  analytics: SessionAnalytics;
}

function barTone(pct: number): { bar: string; text: string } {
  if (pct >= 60) return { bar: "bg-rose-400", text: "text-rose-400" };
  if (pct >= 25) return { bar: "bg-amber-400", text: "text-amber-400" };
  return { bar: "bg-emerald-400", text: "text-emerald-400" };
}

function fmtPct(pct: number): string {
  return pct < 0.1 && pct > 0 ? "<0.1" : pct.toFixed(1);
}

const subscribeNoop = () => () => {};

export function QuotaImpactCard({ session, analytics }: QuotaImpactCardProps) {
  const plans = getPlansForHarness(session.harness);
  const [selectedPlans, setSelectedPlans] = useState<Partial<Record<HarnessType, string>>>({});
  const savedPlanId = useSyncExternalStore(
    subscribeNoop,
    () => loadSavedPlanId(session.harness),
    () => null
  );

  const candidateId = selectedPlans[session.harness] ?? savedPlanId;
  const activePlan = plans.find((p) => p.id === candidateId) ?? plans[0];
  const impact = estimateSessionQuota(session, analytics, activePlan);
  const tone5h = barTone(impact.used5hPct ?? 0);
  const tone7d = barTone(impact.used7dPct);

  const showCacheNote =
    impact.cacheSaved7dPct >= 0.05 || (impact.cacheSaved5hPct !== null && impact.cacheSaved5hPct >= 0.1);

  return (
    <div className={SWARM_STYLES.card}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Gauge className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
            Estimated Quota Impact
          </span>
        </div>

        <select
          aria-label="Subscription plan"
          value={activePlan.id}
          onChange={(e) => {
            const nextId = e.target.value;
            setSelectedPlans((prev) => ({ ...prev, [session.harness]: nextId }));
            savePlanId(session.harness, nextId);
          }}
          className="rounded border border-[#252830] bg-[#090a0c] px-2 py-1 text-[11px] font-mono text-zinc-200 focus:outline-none focus:border-zinc-500 cursor-pointer"
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="rounded border border-[#1e2026] bg-[#090a0c] p-2.5 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-zinc-400">5H Window</span>
            <span className={impact.used5hPct === null ? "text-zinc-500" : tone5h.text}>
              {impact.used5hPct === null ? "No 5H cap" : `~${fmtPct(impact.used5hPct)}%`}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-xs bg-[#181b22] overflow-hidden">
            {impact.used5hPct !== null && (
              <div
                className={`h-full ${tone5h.bar}`}
                style={{ width: `${Math.min(100, Math.max(2, impact.used5hPct))}%` }}
              />
            )}
          </div>
        </div>

        <div className="rounded border border-[#1e2026] bg-[#090a0c] p-2.5 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-zinc-400">7D Weekly</span>
            <span className={tone7d.text}>~{fmtPct(impact.used7dPct)}%</span>
          </div>
          <div className="h-1.5 w-full rounded-xs bg-[#181b22] overflow-hidden">
            <div
              className={`h-full ${tone7d.bar}`}
              style={{ width: `${Math.min(100, Math.max(2, impact.used7dPct))}%` }}
            />
          </div>
        </div>
      </div>

      {(showCacheNote || impact.whatIf) && (
        <div className="flex flex-col gap-1 pt-0.5 text-[11px] font-mono">
          {showCacheNote && (
            <p className="text-emerald-400/90">
              Prompt cache saved{" "}
              {impact.cacheSaved5hPct !== null ? `~${fmtPct(impact.cacheSaved5hPct)}% of 5H (` : ""}
              ~{fmtPct(impact.cacheSaved7dPct)}% of 7D{impact.cacheSaved5hPct !== null ? ")" : ""}.
            </p>
          )}
          {impact.whatIf && (
            <p className="text-amber-300/90">
              Could use{" "}
              {impact.whatIf.saved5hPct !== null ? `~${fmtPct(impact.whatIf.saved5hPct)}% less 5H (` : ""}
              ~{fmtPct(impact.whatIf.saved7dPct)}% less 7D{impact.whatIf.saved5hPct !== null ? ")" : ""} —{" "}
              {impact.whatIf.reason}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
