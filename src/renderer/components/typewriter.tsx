import { useState, useRef, useEffect } from "react";

export function Typewriter({ text, speed = 18 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayed("");
    indexRef.current = 0;

    const timer = setInterval(() => {
      indexRef.current += 1;

      if (indexRef.current >= text.length) {
        setDisplayed(text);
        clearInterval(timer);
        return;
      }

      setDisplayed(text.slice(0, indexRef.current));
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  const isTyping = displayed.length < text.length;

  return (
    <span className={isTyping ? "typewriter-cursor" : ""}>
      {displayed}
    </span>
  );
}
