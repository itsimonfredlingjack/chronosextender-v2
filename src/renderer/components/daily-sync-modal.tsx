import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import type { WorkSession } from "../lib/types";
import { interactiveStateClasses } from "../lib/theme-tokens";
import { Typewriter } from "./typewriter";

interface DailySyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: WorkSession[];
}

export function DailySyncModal({ isOpen, onClose, sessions }: DailySyncModalProps) {
  const [isCopied, setIsCopied] = useState(false);

  // Generate the story based on the sessions
  const story = generateDailyStory(sessions);

  // Fallback to close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopy = () => {
    navigator.clipboard.writeText(story);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white/75 p-6 shadow-[0_32px_64px_-12px_rgba(82,75,64,0.35)] ring-1 ring-white/90 backdrop-blur-3xl"
          >
            <div className="flex items-start justify-between border-b border-[var(--border-soft)] pb-4">
              <div>
                <p className="font-display text-xs font-bold uppercase tracking-[0.15em] text-[var(--accent-slate-500)]">
                  End of Day Recap
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                  Your Daily Sync
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className={`flex h-8 w-8 items-center justify-center rounded-full bg-black/5 hover:bg-black/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors ${interactiveStateClasses.focus}`}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-6 min-h-[120px] rounded-2xl bg-[var(--bg-shell)]/50 p-5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] ring-1 ring-black/[0.04]">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 text-xl">✨</span>
                <p className="text-[15px] leading-relaxed text-[var(--text-primary)]">
                  {isOpen ? <Typewriter text={story} speed={25} /> : null}
                </p>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end gap-3 border-t border-[var(--border-soft)] pt-5">
              <button
                type="button"
                onClick={handleCopy}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  isCopied
                    ? "bg-green-50 text-green-700 ring-1 ring-green-600/20"
                    : `bg-white/60 text-[var(--text-primary)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_4px_rgba(82,75,64,0.05)] ring-1 ring-black/[0.04] hover:bg-white/80 ${interactiveStateClasses.focus}`
                }`}
              >
                {isCopied ? (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 text-[var(--text-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Export to Slack
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className={`rounded-xl bg-[var(--accent-slate-500)] px-5 py-2 text-sm font-medium text-white shadow-[0_4px_12px_rgba(82,75,64,0.1)] hover:bg-[var(--accent-slate-600)] transition-colors ${interactiveStateClasses.focus}`}
              >
                Complete Sync
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Mock generative logic based on real data
function generateDailyStory(sessions: WorkSession[]): string {
  if (sessions.length === 0) return "You didn't log any work today.";

  const totalMinutes = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  const projects = new Set(sessions.map((s) => s.project).filter(Boolean));
  const reviewIssues = sessions.filter((s) => s.reviewState === "resolved").length;

  let story = `Today was a productive day. You spent ${totalHours} hours actively logged across `;
  
  if (projects.size === 1) {
    story += `one primary focus: ${Array.from(projects)[0]}. `;
  } else if (projects.size > 1) {
    story += `${projects.size} different projects, jumping between contexts. `;
  }

  if (reviewIssues > 0) {
    story += `You also took the time to resolve ${reviewIssues} timeline uncertainties, ensuring your tracking logs are perfectly accurate. `;
  }

  // Get the longest session
  const longestSession = [...sessions].sort((a, b) => b.durationMinutes - a.durationMinutes)[0];
  if (longestSession && longestSession.durationMinutes > 60) {
    story += `Your deepest focus block was ${formatHours(longestSession.durationMinutes / 60)} spent on "${longestSession.summary}". `;
  }

  story += "Great work today! All your sessions are compiled and ready for invoicing.";

  return story;
}

const formatHours = (value: number) => `${value.toFixed(1)}h`;
