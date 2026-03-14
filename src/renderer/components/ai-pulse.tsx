import { motion, type Variants } from "framer-motion";

export type AiState = "idle" | "processing" | "success" | "error";

interface PulseOrbProps {
  state: AiState;
}

const variants: Variants = {
  idle: {
    scale: [1, 1.08, 1],
    opacity: [0.36, 0.56, 0.36],
    backgroundColor: "#5d71cf",
    boxShadow: "0 0 12px 2px rgba(93, 113, 207, 0.25)",
    transition: {
      duration: 4.4,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
  processing: {
    scale: [1, 1.2, 1],
    opacity: [0.62, 0.92, 0.62],
    backgroundColor: "#7d8de0",
    boxShadow: [
      "0 0 16px 4px rgba(125, 141, 224, 0.4), inset 0 0 4px rgba(255,255,255,0.2)",
      "0 0 24px 8px rgba(125, 141, 224, 0.55), inset 0 0 8px rgba(255,255,255,0.4)",
      "0 0 16px 4px rgba(125, 141, 224, 0.4), inset 0 0 4px rgba(255,255,255,0.2)",
    ],
    transition: {
      duration: 1.3,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
  success: {
    scale: [1, 1.5, 1],
    opacity: [1, 0],
    backgroundColor: "#34c759",
    boxShadow: "0 0 24px 12px rgba(52, 199, 89, 0.6)",
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
  error: {
    scale: [1, 1.2, 1, 1.2, 1],
    opacity: [0.8, 1, 0.8, 1, 0.8],
    backgroundColor: "#ff375f",
    boxShadow: "0 0 18px 8px rgba(255, 55, 95, 0.5)",
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
        className="absolute h-2 w-2 rounded-full bg-white/78 shadow-[0_0_4px_rgba(255,255,255,0.8)]"
        animate={{
          scale: state === "processing" ? [1, 0.72, 1] : 1,
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
