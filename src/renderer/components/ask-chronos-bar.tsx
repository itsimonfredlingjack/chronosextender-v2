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
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-40 bg-black/28 backdrop-blur-[1.5px]"
            onClick={() => inputRef.current?.blur()}
          />
        )}
      </AnimatePresence>

      <div className="relative z-50 flex w-full flex-col justify-start">
        <motion.div
          animate={{
            scale: isFocused ? 1.008 : 1,
            y: isFocused ? 1 : 0,
          }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className={`relative mx-auto w-full max-w-3xl rounded-2xl p-1.5 transition-[background-color,border-color,box-shadow,transform,filter] duration-200 ease-out focus-within:ring-1 focus-within:ring-[var(--focus-ring)] focus-within:ring-offset-0 ${
            isFocused
              ? "glass-panel-strong shadow-[var(--glass-shadow)]"
              : "glass-panel hover:bg-[var(--surface-glass-hover)]"
          }`}
        >
          <div className="flex w-full items-center gap-3 rounded-xl px-4 py-3 bg-[var(--surface-subtle)] ring-1 ring-inset ring-[var(--border-subtle)]">
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
              aria-label="Ask Chronos — filter timeline"
              value={inputValue}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask Chronos to filter your timeline (e.g. 'linear sessions last Tuesday')..."
              className="flex-1 bg-transparent text-[15px] font-ui font-medium leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />

            {/* Hint / Hotkey */}
            <AnimatePresence>
              {!inputValue && !isFocused && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-[var(--text-muted)]"
                >
                  <kbd className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-1.5 py-0.5 font-mono">⌘</kbd>
                  <kbd className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-1.5 py-0.5 font-mono">K</kbd>
                </motion.div>
              )}
              {inputValue && (
                <button
                  type="button"
                  onClick={() => {
                    setInputValue("");
                    inputRef.current?.focus();
                  }}
                  className={`flex shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-glass-hover)] hover:text-[var(--text-primary)] ${interactiveStateClasses.focus}`}
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
                <div className="flex items-start gap-2.5 rounded-xl border border-[var(--category-media)]/30 bg-[var(--surface-subtle)] p-3.5 text-sm">
                  <div className="mt-0.5 flex h-4 w-4 shrink-0 justify-center text-[var(--category-media)]">
                    ✨
                  </div>
                  <p className="font-ui font-medium leading-6 text-[var(--text-primary)]">
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
