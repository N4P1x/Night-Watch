import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useToast } from '../components/Toast';
import { PageHeader, Section, EmptyState, SkeletonRows, SearchInput, rowKeyboardProps } from '../components/ui';
import { useQueryState, useQueryPage } from '../utils/querystate';
import {
  MagnifyingGlassIcon,
  ClipboardDocumentIcon,
  XMarkIcon,
  PlayIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

const IOC_TYPES = [
  { id: 'ip', label: 'IP', color: '#4CC2FF' },
  { id: 'domain', label: 'Domain', color: '#A78BFA' },
  { id: 'file_hash', label: 'File hash', color: '#D946EF' },
  { id: 'cve', label: 'CVE', color: '#FF5C5C' },
  { id: 'crypto_wallet', label: 'Wallet', color: '#FF9F43' },
  { id: 'email', label: 'Email', color: '#3DDC97' },
  { id: 'url', label: 'URL', color: '#38BDF8' },
  { id: 'onion_url', label: 'Onion', color: '#F472B6' },
] as const;

function typeColor(id: string) {
  return IOC_TYPES.find((t) => t.id === id)?.color ?? '#8A94A6';
}
function typeLabel(id: string) {
  return IOC_TYPES.find((t) => t.id === id)?.label ?? id;
}

export default function IOCs() {
  const [search, setSearch] = useQueryState('q');
  const [iocType, setIocType] = useQueryState('type');
  const [source, setSource] = useQueryState('source');
  const [page, setPage] = useQueryPage();
  const [selected, setSelected] = useState<any>(null);
  const [isScraping, setIsScraping] = useState(false);
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const LIMIT = 25;

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  const { data: sourcesData } = useQuery({
    queryKey: ['ioc-sources'],
    queryFn: async () => (await api.get('/v1/sources/names')).data,
  });

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['iocs', search, iocType, source, page],
    queryFn: async () =>
      (
        await api.get('/v1/iocs', {
          params: { search, ioc_type: iocType || undefined, source: source || undefined, skip: page * LIMIT, limit: LIMIT },
        })
      ).data,
    placeholderData: (prev) => prev,
  });

  const totalPages = Math.ceil((data?.total || 0) / LIMIT);
  const counts: Record<string, number> = {};
  (data?.iocs ?? []).forEach((i: any) => {
    counts[i.type] = (counts[i.type] ?? 0) + 1;
  });
  const maxCount = Math.max(1, ...Object.values(counts));

  const copy = (v: string) => {
    navigator.clipboard.writeText(v);
    showToast('Copied to clipboard.', 'success');
  };

  const exportCSV = () => {
    if (!data?.iocs?.length) return;
    const rows = data.iocs.map((i: any) =>
      [i.type, `"${String(i.value).replace(/"/g, '""')}"`, i.source_name ?? i.source ?? '', `${((i.confidence || 0) * 100).toFixed(0)}%`].join(','),
    );
    const blob = new Blob([['type,value,source,confidence', ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `night-watch-iocs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast('IOCs exported to CSV.', 'success');
  };

  const handleScrape = async () => {
    setIsScraping(true);
    try {
      await api.post('/v1/scrape/trigger');
      showToast('Scrape started.', 'success');
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['iocs'] });
        setIsScraping(false);
      }, 30000);
    } catch (err: any) {
      showToast('Scrape failed: ' + (err.message || 'Unknown'), 'error');
      setIsScraping(false);
    }
  };

  return (
    <div className="min-h-full">
      <PageHeader
        title="Indicators of compromise"
        description={<>{(data?.total ?? 0).toLocaleString()} IOCs · click a row for detail, hover for copy.</>}
        actions={
          <>
            <button onClick={() => refetch()} disabled={isFetching} className="btn btn-secondary">
              <ArrowPathIcon className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
            </button>
            <button onClick={exportCSV} className="btn btn-secondary">
              <ArrowDownTrayIcon className="w-4 h-4" aria-hidden="true" /> CSV
            </button>
            <button onClick={handleScrape} disabled={isScraping} className="btn btn-primary">
              <PlayIcon className="w-4 h-4" aria-hidden="true" /> {isScraping ? 'Scraping…' : 'Scrape'}
            </button>
          </>
        }
      />

      <div className="px-6 py-5 space-y-4 max-w-[1440px]">
        <Section title="Breakdown" hint="Current page · click to filter">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2.5">
            {IOC_TYPES.map((t) => {
              const c = counts[t.id] ?? 0;
              const active = iocType === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setIocType(active ? '' : t.id);
                    setPage(0);
                  }}
                  className={`flex items-center gap-2.5 text-left px-2 py-1.5 rounded-md transition-colors ${active ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.color }} />
                  <span className="text-[12.5px] text-ink-400 w-20">{t.label}</span>
                  <span className="flex-1 h-1 rounded-full bg-night-950 border border-night-700 overflow-hidden">
                    <span className="block h-full" style={{ width: `${(c / maxCount) * 100}%`, background: t.color }} />
                  </span>
                  <span className="font-mono text-[12px] tabular-nums w-8 text-right" style={{ color: t.color }}>
                    {c}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        <div className="nw-panel p-3 flex flex-col xl:flex-row gap-2.5">
          <SearchInput
            id="iocs-search"
            label="Search IOCs by value, hash, or CVE"
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(0);
            }}
            placeholder="Search value, hash, CVE…"
            icon={<MagnifyingGlassIcon className="w-4 h-4 text-ink-500 flex-shrink-0" aria-hidden="true" />}
          />
          <div className="flex gap-2">
            <select value={iocType} onChange={(e) => { setIocType(e.target.value); setPage(0); }} className="input !w-auto" aria-label="Type">
              <option value="">All types</option>
              {IOC_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <select value={source} onChange={(e) => { setSource(e.target.value); setPage(0); }} className="input !w-auto max-w-[180px]" aria-label="Source">
              <option value="">All sources</option>
              {(sourcesData?.names ?? []).map((n: string) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            {(search || iocType || source) && (
              <button
                onClick={() => {
                  setSearch('');
                  setIocType('');
                  setSource('');
                  setPage(0);
                }}
                className="btn btn-ghost text-[12.5px]"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="nw-panel overflow-hidden">
          {isLoading ? (
            <SkeletonRows rows={8} />
          ) : !data?.iocs?.length ? (
            <div className="p-4">
              <EmptyState title="No IOCs match" hint="Loosen filters or run a scrape." />
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Value</th>
                  <th>Type</th>
                  <th>Source</th>
                  <th>Confidence</th>
                  <th className="text-right">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {data.iocs.map((ioc: any) => {
                  const open = () => setSelected(ioc);
                  return (
                  <tr key={ioc.id} onClick={open} className="cursor-pointer group" {...rowKeyboardProps(open, `Open IOC ${ioc.value}`)}>
                    <td className="max-w-[420px]">
                      <code className="nw-mono text-ink-100 break-all">{ioc.value}</code>
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: typeColor(ioc.type) }} />
                        <span style={{ color: typeColor(ioc.type) }}>{typeLabel(ioc.type)}</span>
                      </span>
                    </td>
                    <td className="text-ink-400 text-[12.5px] max-w-[160px] truncate">{ioc.source_name ?? ioc.source ?? '—'}</td>
                    <td>
                      <span className="flex items-center gap-2">
                        <span className="w-16 h-1.5 rounded-full bg-night-950 border border-night-700 overflow-hidden">
                          <span className="block h-full bg-brand" style={{ width: `${(Number(ioc.confidence) || 0) * 100}%` }} />
                        </span>
                        <span className="font-mono text-[11.5px] text-ink-400 tabular-nums">
                          {((Number(ioc.confidence) || 0) * 100).toFixed(0)}%
                        </span>
                      </span>
                    </td>
                    <td className="text-right font-mono text-[12px] text-ink-500 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        {ioc.last_seen ? new Date(ioc.last_seen).toLocaleDateString() : '—'}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copy(ioc.value);
                          }}
                          onKeyDown={(e) => e.stopPropagation()}
                          className="p-1.5 rounded text-ink-500 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-brand hover:bg-brand/10"
                          title="Copy value"
                          aria-label={`Copy ${ioc.value}`}
                        >
                          <ClipboardDocumentIcon className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </span>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-night-700">
              <button disabled={page === 0} onClick={() => setPage(Math.max(0, page - 1))} className="btn btn-secondary !py-1.5">
                <ChevronLeftIcon className="w-4 h-4" aria-hidden="true" /> Prev
              </button>
              <span className="font-mono text-[12px] text-ink-500 tabular-nums">
                {page + 1} / {totalPages} · {(data?.total ?? 0).toLocaleString()} total
              </span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="btn btn-secondary !py-1.5">
                Next <ChevronRightIcon className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="IOC detail">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSelected(null)} />
          <aside className="absolute right-0 top-0 bottom-0 w-full max-w-[440px] bg-night-900 border-l border-night-700 flex flex-col animate-fade-in overscroll-contain">
            <header className="px-5 py-4 border-b border-night-700 flex items-center justify-between">
              <div>
                <p className="nw-eyebrow">IOC detail</p>
                <p className="text-[14px] font-semibold text-white mt-0.5" style={{ color: typeColor(selected.type) }}>
                  {typeLabel(selected.type)}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="btn-ghost btn !px-2" aria-label="Close">
                <XMarkIcon className="w-5 h-5" aria-hidden="true" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto scrollbar p-5 space-y-4">
              <div>
                <p className="nw-label">Value</p>
                <div className="nw-inset p-3 flex items-start gap-2">
                  <code className="nw-mono break-all flex-1">{selected.value}</code>
                  <button onClick={() => copy(selected.value)} className="btn btn-secondary !px-2 !py-1.5" title="Copy" aria-label="Copy IOC value">
                    <ClipboardDocumentIcon className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-3">
                <div className="nw-inset p-3">
                  <dt className="nw-eyebrow">Source</dt>
                  <dd className="text-[13px] text-white mt-1 break-words">{selected.source_name ?? selected.source ?? '—'}</dd>
                </div>
                {(
                  [
                    ['Confidence', `${((Number(selected.confidence) || 0) * 100).toFixed(0)}%`],
                    ['First seen', selected.first_seen ? new Date(selected.first_seen).toLocaleString() : '—'],
                    ['Last seen', selected.last_seen ? new Date(selected.last_seen).toLocaleString() : '—'],
                  ] as [string, string][]
                ).map(([k, v]) => (
                  <div key={k} className="nw-inset p-3">
                    <dt className="nw-eyebrow">{k}</dt>
                    <dd className="text-[13px] text-white mt-1 break-words">{v}</dd>
                  </div>
                ))}
              </dl>
              {!!selected.tags?.length && (
                <div>
                  <p className="nw-label">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.tags.map((t: string, i: number) => (
                      <span key={i} className="badge badge-neutral">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
