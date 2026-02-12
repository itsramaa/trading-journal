/**
 * AnimatedNumber - Smooth counting animation for numeric values
 * Used for dashboard stats, P&L displays, etc.
 */
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  colorize?: boolean; // green for positive, red for negative
  format?: (value: number) => string;
}

export function AnimatedNumber({
  value,
  duration = 800,
  decimals = 2,
  prefix = "",
  suffix = "",
  className,
  colorize = false,
  format: formatFn,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValue = useRef(0);
  const animationRef = useRef<number>();

  useEffect(() => {
    const start = prevValue.current;
    const end = value;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing: ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;

      setDisplayValue(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(end);
        prevValue.current = end;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  const formatted = formatFn
    ? formatFn(displayValue)
    : displayValue.toFixed(decimals);

  return (
    <span
      className={cn(
        "tabular-nums transition-colors",
        colorize && value > 0 && "text-profit",
        colorize && value < 0 && "text-loss",
        className
      )}
    >
      {prefix}{formatted}{suffix}
    </span>
  );
}
