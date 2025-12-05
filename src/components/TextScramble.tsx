'use client';

import { useEffect, useRef, useState } from "react";

type Props = {
  text: string;
  duration?: number;
  className?: string;
  /**
   * Optional key to control when the scramble runs.
   * When provided, the animation only triggers when this key changes.
   */
  triggerKey?: string | number | boolean;
};

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function randomChar() {
  return CHARSET[Math.floor(Math.random() * CHARSET.length)] ?? "#";
}

export default function TextScramble({
  text,
  duration = 900,
  className,
  triggerKey,
}: Props) {
  const target = text.toUpperCase();
  const [output, setOutput] = useState(target);
  const frameRef = useRef<number>();
  const prevKey = useRef<typeof triggerKey | string>(triggerKey ?? target);

  useEffect(() => {
    const key = triggerKey ?? target;
    const triggerChanged = key !== prevKey.current;
    prevKey.current = key;
    const len = target.length;

    // If a triggerKey exists and hasn't changed, keep text stable (no animation).
    if (triggerKey !== undefined && !triggerChanged) {
      const id = requestAnimationFrame(() => {
        setOutput(target);
      });
      return () => cancelAnimationFrame(id);
    }

    // Left-to-right sweep: progressively reveal the target while scrambling the remainder.
    const start = performance.now();
    const totalFrames = Math.max(1, Math.round(duration / 16));

    const tick = () => {
      const elapsed = performance.now() - start;
      const progress = Math.min(1, elapsed / duration);
      const reveal = Math.min(len, Math.floor(progress * totalFrames * (len / totalFrames)) || 1);
      const visible = target.slice(0, reveal);
      const scrambled = Array.from({ length: len - reveal }, () => randomChar().toUpperCase()).join(
        ""
      );
      setOutput(visible + scrambled);

      if (reveal >= len) {
        cancelAnimationFrame(frameRef.current ?? 0);
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current ?? 0);
  }, [target, duration, triggerKey]);

  return <span className={className}>{output}</span>;
}

