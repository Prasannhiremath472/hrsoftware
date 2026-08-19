import { useId } from 'react';

import { chartColor, labelField, numericField, type ChartDatum } from './chartPalette';

export type { ChartDatum };

export interface PieChartProps<T extends ChartDatum> {
  data: T[];
  labelKey: string;
  valueKey: string;
  size?: number;
}

/**
 * Hand-rolled SVG donut. Rendered as a donut rather than a full pie so the total
 * can sit in the middle — easier to read than comparing slice angles.
 */
export default function PieChart<T extends ChartDatum>({
  data,
  labelKey,
  valueKey,
  size = 176,
}: PieChartProps<T>) {
  const titleId = useId();

  if (!data || data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No data available</p>;
  }

  const total = data.reduce((sum, d) => sum + numericField(d, valueKey), 0);
  if (!total) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No data available</p>;
  }

  const cx = 60;
  const cy = 60;
  const radius = 50;
  const innerRadius = 30;
  let cumulative = 0;

  const slices = data.map((d, i) => {
    const value = numericField(d, valueKey);
    const fraction = value / total;
    const startAngle = cumulative * 2 * Math.PI;
    cumulative += fraction;
    const endAngle = cumulative * 2 * Math.PI;

    const point = (angle: number, r: number) => ({
      x: cx + r * Math.sin(angle),
      y: cy - r * Math.cos(angle),
    });

    const largeArc = fraction > 0.5 ? 1 : 0;

    // A full-circle slice can't be drawn with a single arc — split it in two.
    const path =
      fraction >= 0.999
        ? [
            `M ${cx} ${cy - radius}`,
            `A ${radius} ${radius} 0 1 1 ${cx} ${cy + radius}`,
            `A ${radius} ${radius} 0 1 1 ${cx} ${cy - radius}`,
            `M ${cx} ${cy - innerRadius}`,
            `A ${innerRadius} ${innerRadius} 0 1 0 ${cx} ${cy + innerRadius}`,
            `A ${innerRadius} ${innerRadius} 0 1 0 ${cx} ${cy - innerRadius}`,
            'Z',
          ].join(' ')
        : [
            `M ${point(startAngle, radius).x} ${point(startAngle, radius).y}`,
            `A ${radius} ${radius} 0 ${largeArc} 1 ${point(endAngle, radius).x} ${point(endAngle, radius).y}`,
            `L ${point(endAngle, innerRadius).x} ${point(endAngle, innerRadius).y}`,
            `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${point(startAngle, innerRadius).x} ${point(startAngle, innerRadius).y}`,
            'Z',
          ].join(' ');

    return {
      path,
      color: chartColor(i),
      label: labelField(d, labelKey),
      value,
      percent: Math.round(fraction * 100),
    };
  });

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 120 120" className="h-full w-full" role="img" aria-labelledby={titleId}>
          <title id={titleId}>Distribution of {valueKey} by {labelKey}</title>
          {slices.map((s) => (
            <path key={s.label} d={s.path} fill={s.color} fillRule="evenodd">
              <title>{`${s.label}: ${s.value} (${s.percent}%)`}</title>
            </path>
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold tabular leading-none">{total}</span>
          <span className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">Total</span>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-2">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5 text-sm">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: s.color }} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-muted-foreground" title={s.label}>
              {s.label}
            </span>
            <span className="font-semibold tabular">{s.value}</span>
            <span className="w-9 shrink-0 text-right text-xs tabular text-muted-foreground">{s.percent}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
