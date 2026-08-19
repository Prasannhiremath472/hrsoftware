/**
 * Categorical palette for the two hand-rolled SVG charts.
 *
 * Derived from the app's token hues rather than arbitrary brand colours: the
 * primary indigo leads, then a set of desaturated companions that stay legible
 * against the light card surface and keep the "compliance tool" tone. Kept as
 * literal HSL strings because SVG `fill` can't read Tailwind classes.
 */
export const CHART_COLORS = [
  'hsl(224 71% 40%)', // primary indigo
  'hsl(152 62% 30%)', // success green
  'hsl(33 90% 38%)', // warning amber
  'hsl(210 90% 40%)', // info blue
  'hsl(266 55% 45%)', // violet
  'hsl(188 70% 32%)', // teal
  'hsl(0 72% 45%)', // destructive red
  'hsl(215 16% 47%)', // neutral slate
] as const;

export function chartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

/**
 * A single row fed to either chart. Kept structurally loose so concrete API row
 * types (which don't carry an index signature) satisfy it directly.
 */
export type ChartDatum = object;

/** Read one field off a chart row and coerce it to a number. */
export function numericField(row: ChartDatum, key: string): number {
  const value = (row as Record<string, unknown>)[key];
  return Number(value) || 0;
}

/** Read one field off a chart row for display. */
export function labelField(row: ChartDatum, key: string): string {
  const value = (row as Record<string, unknown>)[key];
  return value == null ? '' : String(value);
}
