// Output style utility for scripts
// Supports token-efficient compact mode via CHITTY_OUTPUT_STYLE env var

export type OutputStyle = 'pretty' | 'compact';

export function getOutputStyle(): OutputStyle {
  const raw = (process.env.CHITTY_OUTPUT_STYLE || '').toLowerCase();
  return raw === 'compact' ? 'compact' : 'pretty';
}

// Override console.log in compact mode to reduce noise.
// Returns a restore function to bring back original logging when needed.
export function setupOutputStyle(): () => void {
  const style = getOutputStyle();
  if (style !== 'compact') {
    return () => {};
  }

  const originalLog = console.log.bind(console);
  // Keep console.error for visibility on failures
  // Suppress console.log spam for compact output
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  console.log = (() => {}) as any;

  return () => {
    console.log = originalLog as any;
  };
}

export function isCompact(): boolean {
  return getOutputStyle() === 'compact';
}

export function printJSONSummary(summary: unknown): void {
  // Minimal JSON without spacing for token efficiency
  process.stdout.write(JSON.stringify(summary) + "\n");
}

