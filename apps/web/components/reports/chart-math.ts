export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export type ChartBox = { width: number; height: number; padding: number };
export type ScaledPoint = { x: number; y: number };

/**
 * Map values onto an SVG box (y grows downward): min → bottom edge, max → top
 * edge inside the padding. A flat series sits on the vertical middle.
 */
export function scaleSeries(values: readonly number[], box: ChartBox): ScaledPoint[] {
  const { width, height, padding } = box;
  if (values.length === 0) return [];
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const stepX = values.length > 1 ? innerW / (values.length - 1) : 0;
  return values.map((value, i) => ({
    x: values.length > 1 ? padding + stepX * i : width / 2,
    y: span === 0 ? height / 2 : padding + innerH - ((value - min) / span) * innerH,
  }));
}

/** Y coordinate for a reference value on the same scale as `scaleSeries(values)`. */
export function scaleValue(value: number, values: readonly number[], box: ChartBox): number {
  const { height, padding } = box;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  if (span === 0) return height / 2;
  return padding + (height - padding * 2) - ((value - min) / span) * (height - padding * 2);
}
