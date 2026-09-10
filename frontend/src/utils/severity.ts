// Central severity + status styling — static Tailwind classes only.
// Dynamic `bg-${color}` interpolation does NOT work with Tailwind JIT and
// silently renders unstyled. Every consumer must use these maps.

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low'];

export const SEVERITY_HEX: Record<Severity, string> = {
  critical: '#FF5C5C',
  high: '#FF9F43',
  medium: '#EACD3B',
  low: '#3DDC97',
};

export const SEVERITY_BADGE: Record<Severity, string> = {
  critical: 'badge badge-critical',
  high: 'badge badge-high',
  medium: 'badge badge-medium',
  low: 'badge badge-low',
};

export const SEVERITY_DOT: Record<Severity, string> = {
  critical: 'bg-sev-critical',
  high: 'bg-sev-high',
  medium: 'bg-sev-medium',
  low: 'bg-sev-low',
};

export const SEVERITY_BAR: Record<Severity, string> = {
  critical: 'bg-sev-critical',
  high: 'bg-sev-high',
  medium: 'bg-sev-medium',
  low: 'bg-sev-low',
};

export function normalizeSeverity(v: unknown): Severity {
  const s = String(v ?? '').toLowerCase();
  if (s === 'critical' || s === 'high' || s === 'medium' || s === 'low') return s;
  return 'medium';
}

export type ConnState = 'online' | 'degraded' | 'offline';

export const CONN_DOT: Record<ConnState, string> = {
  online: 'bg-sev-low',
  degraded: 'bg-sev-medium',
  offline: 'bg-sev-critical',
};

export const CONN_TEXT: Record<ConnState, string> = {
  online: 'text-sev-low',
  degraded: 'text-sev-medium',
  offline: 'text-sev-critical',
};
