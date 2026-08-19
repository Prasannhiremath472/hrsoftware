import { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';

import { chartColor, labelField, numericField, type ChartDatum } from './chartPalette';

export type { ChartDatum };

export interface BarChartProps<T extends ChartDatum> {
  data: T[];
  labelKey: string;
  valueKey: string;
  height?: number;
}

/**
 * Hand-rolled SVG bar chart — deliberately not a charting library, since the
 * dashboard only needs a small categorical comparison.
 *
 * Bars are drawn in a normalised 0-100 user space and stretched by
 * `preserveAspectRatio="none"`, so labels live in a separate unscaled layer
 * below the plot to avoid distorted text.
 */
export default function BarChart<T extends ChartDatum>({
  data,
  labelKey,
  valueKey,
  height = 220,
}: BarChartProps<T>) {
  const shouldReduceMotion = useReducedMotion();
  const titleId = useId();

  if (!data || data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No data available</p>;
  }

  const max = Math.max(...data.map((d) => numericField(d, valueKey)), 1);
  const slotWidth = 100 / data.length;
  const barWidth = Math.min(slotWidth * 0.62, 14);

  return (
    <div>
      <div className="relative" style={{ height }}>
        {/* Gridlines at 0 / 50 / 100% of the max */}
        <div className="absolute inset-0 flex flex-col justify-between" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="border-t border-dashed border-border" />
          ))}
        </div>

        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-labelledby={titleId}
        >
          <title id={titleId}>Bar chart of {valueKey} by {labelKey}</title>
          {data.map((d, i) => {
            const value = numericField(d, valueKey);
            const barHeight = (value / max) * 100;
            const x = i * slotWidth + (slotWidth - barWidth) / 2;
            return (
              <motion.rect
                key={labelField(d, labelKey) + i}
                x={x}
                width={barWidth}
                fill={chartColor(i)}
                initial={shouldReduceMotion ? false : { y: 100, height: 0 }}
                animate={{ y: 100 - barHeight, height: barHeight }}
                transition={{ duration: 0.5, delay: shouldReduceMotion ? 0 : i * 0.04, ease: 'easeOut' }}
              >
                <title>{`${labelField(d, labelKey)}: ${value}`}</title>
              </motion.rect>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex gap-1">
        {data.map((d, i) => (
          <div key={labelField(d, labelKey) + i} className="min-w-0 flex-1 text-center">
            <div className="truncate text-xs text-muted-foreground" title={labelField(d, labelKey)}>
              {labelField(d, labelKey)}
            </div>
            <div className="text-sm font-semibold tabular">{numericField(d, valueKey)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
