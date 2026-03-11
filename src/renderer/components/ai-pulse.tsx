import { motion } from "framer-motion";

export type AiState = "idle" | "processing" | "success" | "error";

interface PulseOrbProps {
  state: AiState;
}

const variants = {
  idle: {
    scale: [1, 1.15, 1],
    opacity: [0.4, 0.7, 0.4],
    backgroundColor: "rgba(110, 124, 140, 1)", // accent-slate-500
    boxShadow: "0 0 12px 2px rgba(110, 124, 140, 0.3)",
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
  processing: {
    scale: [1, 1.3, 1],
    opacity: [0.7, 1, 0.7],
    backgroundColor: "rgba(93, 107, 122, 1)", // accent-slate-600 with more intensity
    boxShadow: [
      "0 0 16px 4px rgba(93, 107, 122, 0.5), inset 0 0 4px rgba(255,255,255,0.4)",
      "0 0 24px 8px rgba(93, 107, 122, 0.8), inset 0 0 8px rgba(255,255,255,0.8)",
      "0 0 16px 4px rgba(93, 107, 122, 0.5), inset 0 0 4px rgba(255,255,255,0.4)",
    ],
    transition: {
      duration: 1.2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
  success: {
    scale: [1, 1.5, 1],
    opacity: [1, 0],
    backgroundColor: "rgba(100, 160, 120, 1)", // soft green
    boxShadow: "0 0 24px 12px rgba(100, 160, 120, 0.8)",
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
  error: {
    scale: [1, 1.2, 1, 1.2, 1],
    opacity: [0.8, 1, 0.8, 1, 0.8],
    backgroundColor: "rgba(203, 175, 164, 1)", // criticalBorder from theme-tokens
    boxShadow: "0 0 16px 6px rgba(203, 175, 164, 0.6)",
    transition: {
      duration: 0.5,
      repeat: 3,
      ease: "easeInOut",
    },
  },
};

export function PulseOrb({ state }: PulseOrbProps) {
  return (
    <div className="relative flex h-5 w-5 items-center justify-center">
      {/* Outer Glow */}
      <motion.div
        className="absolute inset-0 rounded-full"
        variants={variants}
        initial="idle"
        animate={state}
      />
      
      {/* Inner solid core */}
      <motion.div
        className="absolute h-2 w-2 rounded-full bg-white/80 shadow-[0_0_4px_rgba(255,255,255,1)]"
        animate={{
          scale: state === "processing" ? [1, 0.6, 1] : 1,
          opacity: state === "success" ? 0 : 1,
        }}
        transition={{
          duration: state === "processing" ? 1.2 : 0.3,
          repeat: state === "processing" ? Infinity : 0,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
