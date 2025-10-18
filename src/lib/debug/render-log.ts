export const isDebugRenders = process.env.NEXT_PUBLIC_DEBUG_RENDERS === '1';

type Details = Record<string, unknown> | undefined;

export function logRender(name: string, details?: Details): void {
  if (!isDebugRenders) return;
  try {
    const t = typeof performance !== 'undefined' ? performance.now().toFixed(1) : 'n/a';
    if (details) {
      // Shallow clone to avoid Proxy-like objects cluttering logs
      const clean: Record<string, unknown> = {};
      for (const k of Object.keys(details)) {
        const v = (details as Record<string, unknown>)[k];
        if (typeof v === 'object' && v !== null) {
          if (Array.isArray(v)) {
            clean[k] = `Array(${v.length})`;
          } else {
            clean[k] = '{…}';
          }
        } else {
          clean[k] = v as unknown;
        }
      }
      // eslint-disable-next-line no-console
      console.log(`[render] ${name} @ ${t}ms`, clean);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[render] ${name} @ ${t}ms`);
    }
  } catch {
    // ignore
  }
}

export function logPhase(name: string, phase: string, details?: Details): void {
  if (!isDebugRenders) return;
  try {
    const t = typeof performance !== 'undefined' ? performance.now().toFixed(1) : 'n/a';
    if (details) {
      // eslint-disable-next-line no-console
      console.log(`[phase] ${name}:${phase} @ ${t}ms`, details);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[phase] ${name}:${phase} @ ${t}ms`);
    }
  } catch {
    // ignore
  }
}

