import { useEffect, useRef } from 'react';
import { animate, useMotionValue, useMotionValueEvent, useReducedMotion } from 'motion/react';

/** Magic UI-style animated number for dashboard stat tiles. */
export default function AnimatedCounter({ value, className }: { value: number; className?: string }) {
  const shouldReduceMotion = useReducedMotion();
  const spanRef = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);

  useMotionValueEvent(motionValue, 'change', (latest) => {
    if (spanRef.current) spanRef.current.textContent = Math.round(latest).toLocaleString();
  });

  useEffect(() => {
    if (shouldReduceMotion) {
      if (spanRef.current) spanRef.current.textContent = value.toLocaleString();
      return;
    }
    const controls = animate(motionValue, value, { duration: 0.7, ease: 'easeOut' });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, shouldReduceMotion]);

  return <span ref={spanRef} className={className}>0</span>;
}
