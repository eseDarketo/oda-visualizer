"use client";

import { useEffect, useRef, useState } from "react";
import { formatDuration } from "@/lib/spotify-api";

interface ProgressBarProps {
  progressMs: number;
  durationMs: number;
  isPlaying: boolean;
  accentColor: string;
}

export function ProgressBar({ progressMs, durationMs, isPlaying, accentColor }: ProgressBarProps) {
  const [currentProgress, setCurrentProgress] = useState(progressMs);
  const lastUpdateTime = useRef(Date.now());
  const animationFrame = useRef<number | null>(null);

  // Update base progress when prop changes
  useEffect(() => {
    setCurrentProgress(progressMs);
    lastUpdateTime.current = Date.now();
  }, [progressMs]);

  // Smooth interpolation with requestAnimationFrame
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
      return;
    }

    const animate = () => {
      const now = Date.now();
      const elapsed = now - lastUpdateTime.current;
      const newProgress = Math.min(progressMs + elapsed, durationMs);
      setCurrentProgress(newProgress);
      animationFrame.current = requestAnimationFrame(animate);
    };

    animationFrame.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [isPlaying, progressMs, durationMs]);

  const percentage = Math.min((currentProgress / durationMs) * 100, 100);

  return (
    <div className="w-full space-y-2">
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-colors duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: `hsl(${accentColor})`,
            boxShadow: `0 0 12px hsl(${accentColor} / 0.5)`,
          }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground font-mono">
        <span>{formatDuration(currentProgress)}</span>
        <span>{formatDuration(durationMs)}</span>
      </div>
    </div>
  );
}
