import { motion, AnimatePresence } from "framer-motion";
import { interactiveStateClasses } from "../lib/theme-tokens";

interface AiNudgeToastProps {
  isOpen: boolean;
  onDismiss: () => void;
  onAction: (actionType: "split" | "pause") => void;
}

export function AiNudgeToast({ isOpen, onDismiss, onAction }: AiNudgeToastProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-6 right-6 z-[100] w-full max-w-sm rounded-2xl bg-white/75 p-5 shadow-[0_32px_64px_-12px_rgba(82,75,64,0.35)] ring-1 ring-white/90 backdrop-blur-3xl"
        >
          <div className="flex items-start gap-4">
            {/* Animated Orb Icon */}
            <div className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--ai-accent-base)]/10 ring-1 ring-[var(--ai-accent-base)]/20">
              <div className="absolute inset-0 rounded-full bg-[var(--ai-accent-base)] opacity-20 blur-md animate-pulse" />
              <div className="relative h-3 w-3 rounded-full bg-[var(--ai-accent-base)] shadow-[0_0_12px_var(--ai-accent-base)]" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-display text-base font-semibold tracking-tight text-[var(--text-primary)]">
                Context Drift Detected
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                Hey, it looks like your context has drifted from "Refactoring API" to browsing Reddit. Should I split this session to keep your timesheet clean?
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onAction("split")}
                  className={`rounded-xl bg-[var(--ai-accent-base)] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(82,75,64,0.1)] hover:bg-[var(--ai-accent-strong)] transition-colors ${interactiveStateClasses.focus}`}
                >
                  Split Session
                </button>
                <button
                  type="button"
                  onClick={() => onAction("pause")}
                  className={`rounded-xl bg-white/60 px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_4px_rgba(82,75,64,0.05)] ring-1 ring-black/[0.04] hover:bg-white/80 transition-colors ${interactiveStateClasses.focus}`}
                >
                  Pause Timer
                </button>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={onDismiss}
                  className={`rounded-xl px-2 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 transition-colors ${interactiveStateClasses.focus}`}
                >
                  Ignore
                </button>
              </div>
            </div>
            
            {/* Close Cross */}
            <button
              type="button"
              onClick={onDismiss}
              className={`absolute right-3 top-3 rounded-full p-1 text-[var(--text-muted)] hover:bg-black/5 hover:text-[var(--text-primary)] transition-colors ${interactiveStateClasses.focus}`}
            >
               <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
               </svg>
            </button>
            
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
