import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { WorkSession } from "../lib/types";

import { getProjectColor } from "../lib/project-colors";

const DAY_START_HOUR = 8;
const DAY_END_HOUR = 18;
const TOTAL_MINUTES = (DAY_END_HOUR - DAY_START_HOUR) * 60;

interface ConfidenceTimelineProps {
  sessions: WorkSession[];
  onAssignProject: (sessionId: string, project: string) => void;
}

const confColor = (conf: number, project?: string | null) => {
  const baseColor = getProjectColor(project);

  if (conf >= 80) return { 
    bg: baseColor.bgLight.replace("92%)", "60%)"), // Darken background slightly for solid blocks
    ring: baseColor.ring 
  };
  if (conf >= 50) return { 
    bg: baseColor.bgLight.replace("92%", "80%").replace("hsl", "hsla").replace(")", ", 0.6)"), 
    ring: baseColor.ring.replace("hsl", "hsla").replace(")", ", 0.5)") 
  };
  return { 
    bg: baseColor.bgLight.replace("hsl", "hsla").replace(")", ", 0.4)"), 
    ring: baseColor.ring.replace("hsl", "hsla").replace(")", ", 0.6)"),
    stripeBase: baseColor.bgLight.replace("92%)", "75%)").replace("hsl", "hsla").replace(")", ", 0.5)")
  };
};

export function ConfidenceTimeline({ sessions, onAssignProject }: ConfidenceTimelineProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="flex h-full w-full flex-col gap-2">
      {/* Track */}
      <div className="relative flex-1 rounded-xl bg-white/25 ring-1 ring-black/[0.03] overflow-visible">
        {/* Hour grid */}
        {Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }).map((_, i) => {
          const hour = DAY_START_HOUR + i;
          const top = (i * 60 / TOTAL_MINUTES) * 100;
          return (
            <div key={hour} className="absolute inset-x-0 z-0" style={{ top: `${top}%` }}>
              <div className="border-t border-black/[0.04]" />
              {hour % 3 === 0 && (
                <span className="absolute left-1 top-0.5 font-mono text-[8px] leading-none text-black/25 select-none">
                  {hour}
                </span>
              )}
            </div>
          );
        })}

        {/* Session blocks */}
        {sessions.map((session) => {
          const start = new Date(session.startedAt);
          const end = new Date(session.endedAt);
          const startMin = (start.getHours() - DAY_START_HOUR) * 60 + start.getMinutes();
          const durMin = (end.getTime() - start.getTime()) / 60000;

          let top = (startMin / TOTAL_MINUTES) * 100;
          let height = (durMin / TOTAL_MINUTES) * 100;
          if (top < 0) { height += top; top = 0; }
          if (top + height > 100) height = 100 - top;
          if (height <= 0 || top > 100) return null;

          const conf = session.confidence ?? 100;
          const isLow = conf < 50;
          const isHigh = conf >= 80;
          const colors = confColor(conf, session.project);
          const hovered = hoveredId === session.id;

          return (
            <div
              key={session.id}
              className="absolute inset-x-1 z-10"
              style={{ top: `${top}%`, height: `${Math.max(height, 3)}%` }}
              onMouseEnter={() => setHoveredId(session.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div
                className={`h-full w-full rounded-lg transition-all duration-200 ${
                  hovered && !isHigh ? "scale-105 shadow-md" : ""
                }`}
                style={{
                  backgroundColor: colors.bg,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.4), 0 1px 3px ${colors.ring}`,
                  border: `1px solid ${colors.ring}`,
                  ...(isLow && colors.stripeBase
                    ? {
                        backgroundImage:
                          `repeating-linear-gradient(135deg, transparent, transparent 3px, ${colors.stripeBase} 3px, ${colors.stripeBase} 6px)`,
                      }
                    : {}),
                }}
              >
                {/* Inline confidence % label when block is tall enough */}
                {height > 6 && (
                  <span className="block px-1 pt-1 font-mono text-[9px] font-bold leading-none text-white/80 drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]">
                    {Math.round(conf)}%
                  </span>
                )}
              </div>

              <AnimatePresence>
                {hovered && !isHigh && (
                  <motion.div
                    initial={{ opacity: 0, x: -6, scale: 0.97 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -4, scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 420, damping: 30 }}
                    className="absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 w-52 rounded-xl bg-white/95 backdrop-blur-2xl p-3 shadow-[0_8px_28px_rgba(82,75,64,0.16)] ring-1 ring-black/[0.06]"
                  >
                    <div className="pointer-events-none absolute -left-1 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rotate-45 bg-white/95 ring-1 ring-black/[0.06] shadow-[-1px_1px_2px_rgba(82,75,64,0.06)]" />

                    <p className="relative z-10 text-[11px] font-medium leading-snug text-[var(--text-primary)]">
                      <span className="font-mono font-bold">{Math.round(conf)}%</span> confident — which project?
                    </p>

                    <div className="relative z-10 mt-2 flex flex-col gap-1">
                      {session.alternativeProjects?.map((alt) => (
                        <button
                          key={alt}
                          onClick={() => onAssignProject(session.id, alt)}
                          className="flex w-full items-center justify-between rounded-md bg-black/[0.03] px-2 py-1.5 text-left text-[11px] font-medium text-[var(--text-primary)] ring-1 ring-black/[0.04] transition-all hover:bg-black/[0.06] hover:-translate-y-px hover:shadow-sm"
                        >
                          <span className="truncate">{alt}</span>
                          <span className="ml-1.5 shrink-0 text-[9px] font-bold uppercase text-[var(--ai-accent-base)]">Set</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
