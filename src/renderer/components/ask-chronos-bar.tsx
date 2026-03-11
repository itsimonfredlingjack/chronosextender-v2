import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { interactiveStateClasses } from "../lib/theme-tokens";

interface AskChronosBarProps {
  onQueryChange: (query: string) => void;
  isProcessing?: boolean;
  nlSummary?: string | null;
}

export function AskChronosBar({ onQueryChange, isProcessing, nlSummary }: AskChronosBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce query to simulate brief "parsing"
  useEffect(() => {
    const timer = setTimeout(() => {
      onQueryChange(inputValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue, onQueryChange]);

  // Global hotkey (Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      {/* Background dimming overlay */}
      <AnimatePresence>
        {isFocused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
            onClick={() => inputRef.current?.blur()}
          />
        )}
      </AnimatePresence>

      <div className="relative z-50 flex w-full flex-col justify-start">
        <motion.div
          animate={{
            scale: isFocused ? 1.01 : 1,
            y: isFocused ? 2 : 0,
          }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className={`relative mx-auto w-full max-w-3xl rounded-2xl bg-white/75 p-1.5 backdrop-blur-3xl transition-all duration-300 ${
            isFocused
              ? "shadow-[0_32px_64px_-12px_rgba(82,75,64,0.35)] ring-1 ring-white/90"
              : "shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_4px_16px_rgba(82,75,64,0.1)] ring-1 ring-white/80 hover:bg-white/85 hover:shadow-[0_6px_24px_rgba(82,75,64,0.15)]"
          }`}
        >
          <div className="flex w-full items-center gap-2 rounded-xl bg-white/60 px-4 py-3 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] ring-1 ring-black/[0.04]">
            {/* Search Icon / Loader */}
            <div className="flex h-5 w-5 shrink-0 items-center justify-center text-[var(--text-secondary)]">
              {isProcessing ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>

            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask Chronos to filter your timeline (e.g. 'linear sessions last Tuesday')..."
              className="flex-1 bg-transparent text-[15px] font-medium text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />

            {/* Hint / Hotkey */}
            <AnimatePresence>
              {!inputValue && !isFocused && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex shrink-0 items-center gap-1 text-[10px] font-medium text-[var(--text-muted)]"
                >
                  <kbd className="rounded border border-black/10 bg-black/5 px-1 py-0.5 font-mono">⌘</kbd>
                  <kbd className="rounded border border-black/10 bg-black/5 px-1 py-0.5 font-mono">K</kbd>
                </motion.div>
              )}
              {inputValue && (
                <button
                  type="button"
                  onClick={() => {
                    setInputValue("");
                    inputRef.current?.focus();
                  }}
                  className={`flex shrink-0 items-center justify-center rounded-full bg-black/5 p-1 text-[var(--text-muted)] hover:bg-black/10 hover:text-[var(--text-primary)] ${interactiveStateClasses.focus}`}
                >
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </AnimatePresence>
          </div>

          {/* AI Conversational Summary */}
          <AnimatePresence>
            {nlSummary && isFocused && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden px-2 pb-1"
              >
                <div className="flex items-start gap-2.5 rounded-lg bg-[var(--accent-slate-500)]/5 p-3 text-sm ring-1 ring-[var(--accent-slate-500)]/20">
                  <div className="mt-0.5 flex h-4 w-4 shrink-0 justify-center text-[var(--accent-slate-500)]">
                    ✨
                  </div>
                  <p className="font-medium leading-relaxed text-[var(--text-primary)]">
                    {nlSummary}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
}
