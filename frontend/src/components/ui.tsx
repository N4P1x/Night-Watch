import { ReactNode, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { SEVERITY_BADGE, normalizeSeverity } from '../utils/severity';

/** Page header — title + description + actions. No eyebrows (rationed system-wide). */
export function PageHeader(props: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="border-b border-night-700 bg-night-900/60">
      <div className="px-6 py-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="nw-h1">{props.title}</h1>
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

/** Neutral KPI — color means severity or nothing, so stats stay monochrome. */
export function Stat(props: { label: string; value: ReactNode; sub?: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`nw-panel p-4 text-left transition-colors duration-150 hover:border-night-600 ${props.onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
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
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} aria-hidden="true" />
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
          <div className="w-2 h-2 rounded-full bg-night-600 animate-pulse" aria-hidden="true" />
          <div className="h-3.5 rounded bg-night-600 animate-pulse flex-1" aria-hidden="true" />
          <div className="h-3.5 w-20 rounded bg-night-600 animate-pulse" aria-hidden="true" />
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

/** Labeled search field — never placeholder-only. */
export function SearchInput(props: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <label
      htmlFor={props.id}
      className={`flex flex-1 items-center gap-2 nw-inset px-3 py-2 focus-within:border-brand/50 ${props.className ?? ''}`}
    >
      <span className="sr-only">{props.label}</span>
      {props.icon}
      <input
        id={props.id}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        spellCheck={false}
        autoComplete="off"
        className="bg-transparent outline-none text-[13px] w-full placeholder:text-ink-500"
      />
      {props.value && (
        <button
          type="button"
          onClick={() => props.onChange('')}
          aria-label={`Clear ${props.label}`}
          className="text-ink-500 hover:text-white flex-shrink-0"
        >
          <XMarkIcon className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </label>
  );
}

/** Two-click destructive confirm. Replaces window.confirm everywhere. */
export function ConfirmButton(props: {
  onConfirm: () => void;
  label: string;
  armedLabel?: string;
  title?: string;
  className?: string;
  children?: ReactNode;
}) {
  const [armed, setArmed] = useState(false);
  return (
    <button
      type="button"
      title={props.title}
      aria-live="polite"
      onClick={() => {
        if (armed) {
          setArmed(false);
          props.onConfirm();
        } else {
          setArmed(true);
          setTimeout(() => setArmed(false), 4000);
        }
      }}
      onBlur={() => setArmed(false)}
      className={`${props.className ?? 'btn btn-ghost !px-2 !py-1.5 hover:!text-sev-critical'}`}
    >
      {armed ? (props.armedLabel ?? 'Confirm?') : (props.children ?? props.label)}
    </button>
  );
}

/** Keyboard path for clickable table rows (mouse keeps onClick). */
export function rowKeyboardProps(onOpen: () => void, label: string) {
  return {
    tabIndex: 0,
    role: 'button' as const,
    'aria-label': label,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onOpen();
      }
    },
  };
}
