import { ReactNode } from 'react';
import { SEVERITY_BADGE, normalizeSeverity } from '../utils/severity';

/** Page header — single pattern for every view. No gradients, no hero cards. */
export function PageHeader(props: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="border-b border-night-700 bg-night-900/60">
      <div className="px-6 py-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="nw-eyebrow">{props.eyebrow}</p>
          <h1 className="nw-h1 mt-1">{props.title}</h1>
          {props.description && <div className="nw-sub mt-1 max-w-2xl">{props.description}</div>}
          {props.meta && <div className="mt-2 flex flex-wrap items-center gap-2">{props.meta}</div>}
        </div>
        {props.actions && <div className="flex items-center gap-2 flex-shrink-0">{props.actions}</div>}
      </div>
    </div>
  );
}

export function Section(props: { title: string; hint?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`nw-panel ${props.className ?? ''}`}>
      <header className="px-4 py-3 border-b border-night-700 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-semibold text-white">{props.title}</h2>
          {props.hint && <p className="text-[12px] text-ink-500 mt-0.5">{props.hint}</p>}
        </div>
        {props.action}
      </header>
      <div className="p-4">{props.children}</div>
    </section>
  );
}

export function Stat(props: { label: string; value: ReactNode; sub?: ReactNode; onClick?: () => void; accent?: 'critical' | 'high' | 'medium' | 'low' | 'brand' }) {
  const bar =
    props.accent === 'critical' ? 'bg-sev-critical'
    : props.accent === 'high' ? 'bg-sev-high'
    : props.accent === 'medium' ? 'bg-sev-medium'
    : props.accent === 'low' ? 'bg-sev-low'
    : props.accent === 'brand' ? 'bg-brand'
    : 'bg-night-600';
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`nw-panel relative overflow-hidden p-4 text-left transition-colors hover:border-night-600 ${props.onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${bar}`} aria-hidden />
      <span className="nw-eyebrow">{props.label}</span>
      <span className="block mt-1 text-[26px] leading-8 font-semibold tracking-tight text-white tabular-nums">{props.value}</span>
      {props.sub && <span className="block mt-1 text-[12px] text-ink-500">{props.sub}</span>}
    </button>
  );
}

export function SeverityPill({ value }: { value: unknown }) {
  const sev = normalizeSeverity(value);
  return <span className={SEVERITY_BADGE[sev]}>{sev}</span>;
}

export function StatusDot({ state, label }: { state: 'online' | 'degraded' | 'offline'; label: string }) {
  const dot = state === 'online' ? 'bg-sev-low' : state === 'degraded' ? 'bg-sev-medium animate-pulse' : 'bg-sev-critical';
  const text = state === 'online' ? 'text-sev-low' : state === 'degraded' ? 'text-sev-medium' : 'text-sev-critical';
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium">
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span className={text}>{label}</span>
    </span>
  );
}

export function EmptyState(props: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="nw-inset px-6 py-12 text-center">
      <p className="text-[13px] font-semibold text-white">{props.title}</p>
      {props.hint && <p className="nw-sub mt-1 max-w-md mx-auto">{props.hint}</p>}
      {props.action && <div className="mt-4 flex justify-center">{props.action}</div>}
    </div>
  );
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-night-700/70" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3.5 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-night-700 animate-pulse" />
          <div className="h-3.5 rounded bg-night-700 animate-pulse flex-1" />
          <div className="h-3.5 w-20 rounded bg-night-700 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="mb-4 px-3.5 py-3 rounded-md bg-sev-critical/10 border border-sev-critical/30 text-[13px] text-sev-critical">
      {message}
    </div>
  );
}
