import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { useToast } from '../components/Toast';
import { PageHeader, EmptyState, SkeletonRows, SeverityPill } from '../components/ui';
import { SEVERITY_ORDER, normalizeSeverity } from '../utils/severity';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  PlayIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentDuplicateIcon,
  ArrowsUpDownIcon,
} from '@heroicons/react/24/outline';

function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

export default function Leaks() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [severity, setSeverity] = useState('');
  const [route, setRoute] = useState<'all' | 'onion' | 'clear'>('all');
  const [sort, setSort] = useState<'date' | 'severity'>('date');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<any>(null);
  const [isScraping, setIsScraping] = useState(false);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const LIMIT = 20;

  useEffect(() => {
    setSearch(searchParams.get('q') ?? '');
    setPage(0);
  }, [searchParams]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['leaks', search, severity, route, page],
    queryFn: async () => {
      const params: any = { search: search || undefined, skip: page * LIMIT, limit: LIMIT };
      if (severity) params.severity = severity;
      if (route !== 'all') params.is_onion = route === 'onion';
      return (await api.get('/v1/leaks', { params })).data;
    },
    placeholderData: (prev) => prev,
  });

  const rows = useMemo(() => {
    const list = [...(data?.leaks ?? [])];
    if (sort === 'severity') {
      const rank = (s: string) => SEVERITY_ORDER.indexOf(normalizeSeverity(s));
      list.sort((a, b) => rank(a.severity) - rank(b.severity));
    } else {
      list.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    }
    return list;
  }, [data, sort]);

  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / LIMIT));

  const scrape = async () => {
    setIsScraping(true);
    try {
      await api.post('/v1/scrape/trigger');
      showToast('Deep scan started via Tor.', 'success');
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['leaks'] });
        setIsScraping(false);
      }, 30000);
    } catch (err: any) {
      showToast('Scan failed: ' + (err.message || 'Unknown'), 'error');
      setIsScraping(false);
    }
  };

  const exportCSV = () => {
    if (!rows.length) return;
    const head = 'title,victim,severity,source_url,created';
    const body = rows.map((l: any) =>
      [l.title, l.victim_name || '', l.severity, l.source_url || '', l.created_at]
        .map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`)
        .join(','),
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([[head, ...body].join('\n')], { type: 'text/csv' }));
    a.download = `night-watch-leaks-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast('Leaks exported.', 'success');
  };

  const copy = (t: string) => {
    navigator.clipboard.writeText(t);
    showToast('Copied.', 'success');
  };

  return (
    <div className="min-h-full">
      <PageHeader
        eyebrow="Intelligence · Breaches"
        title="Data leaks"
        description={<>{(data?.total ?? 0).toLocaleString()} leaks across surface and dark web · click a row for the full report.</>}
        actions={
          <>
            <button onClick={() => refetch()} disabled={isFetching} className="btn btn-secondary">
              <ArrowPathIcon className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={exportCSV} className="btn btn-secondary">
              <ArrowDownTrayIcon className="w-4 h-4" /> Export
            </button>
            <button onClick={scrape} disabled={isScraping} className="btn btn-primary">
              <PlayIcon className="w-4 h-4" /> {isScraping ? 'Scanning…' : 'Deep scan'}
            </button>
          </>
        }
      />

      <div className="px-6 py-5 space-y-4 max-w-[1440px]">
        <div className="nw-panel p-3 flex flex-col xl:flex-row gap-2.5 xl:items-center">
          <label className="flex-1 flex items-center gap-2 nw-inset px-3 py-2 focus-within:border-brand/50">
            <MagnifyingGlassIcon className="w-4 h-4 text-ink-500 flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search victims, titles, actors…"
              className="bg-transparent outline-none text-[13px] w-full placeholder:text-ink-500"
            />
            {search && (
              <button onClick={() => setSearch('')} aria-label="Clear" className="text-ink-500 hover:text-white">
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </label>
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => { setSeverity(''); setPage(0); }} className={`nw-tab ${!severity ? 'nw-tab-active' : ''}`}>
              All severities
            </button>
            {SEVERITY_ORDER.map((s) => (
              <button key={s} onClick={() => { setSeverity(severity === s ? '' : s); setPage(0); }} className={`nw-tab capitalize ${severity === s ? 'nw-tab-active' : ''}`}>
                {s}
              </button>
            ))}
          </div>
          <span className="hidden xl:block w-px h-6 bg-night-700" />
          <div className="flex gap-1.5">
            {(['all', 'onion', 'clear'] as const).map((v) => (
              <button key={v} onClick={() => { setRoute(v); setPage(0); }} className={`nw-tab ${route === v ? 'nw-tab-active' : ''}`}>
                {v === 'all' ? 'All routes' : v === 'onion' ? 'Tor' : 'Clearnet'}
              </button>
            ))}
            <button onClick={() => setSort(sort === 'date' ? 'severity' : 'date')} className="nw-tab" title="Toggle sort">
              <span className="inline-flex items-center gap-1.5">
                <ArrowsUpDownIcon className="w-3.5 h-3.5" /> {sort === 'date' ? 'Newest' : 'Severity'}
              </span>
            </button>
          </div>
        </div>

        <div className="nw-panel overflow-hidden">
          {isLoading ? (
            <SkeletonRows rows={10} />
          ) : !rows.length ? (
            <div className="p-4">
              <EmptyState title="No leaks match" hint="Loosen filters or run a deep scan." />
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Title</th>
                  <th>Victim</th>
                  <th>Route</th>
                  <th className="text-right">Detected</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l: any) => {
                  const onion = String(l.source_url ?? '').includes('.onion');
                  return (
                    <tr key={l.id} onClick={() => setSelected(l)} className="cursor-pointer">
                      <td>
                        <SeverityPill value={l.severity} />
                      </td>
                      <td className="max-w-[380px]">
                        <span className="block text-white font-medium truncate">{l.title}</span>
                        <span className="block text-[12px] text-ink-500 truncate">{stripHtml(l.description || '').slice(0, 120)}</span>
                      </td>
                      <td className="text-ink-400 text-[12.5px] max-w-[160px] truncate">{l.victim_name || '—'}</td>
                      <td>
                        <span className={`badge ${onion ? 'badge-brand' : 'badge-neutral'}`}>{onion ? 'Tor' : 'Web'}</span>
                      </td>
                      <td className="text-right font-mono text-[12px] text-ink-500 whitespace-nowrap">
                        {l.created_at ? new Date(l.created_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <div className="flex items-center justify-between px-4 py-3 border-t border-night-700">
            <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="btn btn-secondary !py-1.5">
              <ChevronLeftIcon className="w-4 h-4" /> Prev
            </button>
            <span className="font-mono text-[12px] text-ink-500 tabular-nums">
              {page + 1} / {totalPages} · {(data?.total ?? 0).toLocaleString()} total
            </span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} className="btn btn-secondary !py-1.5">
              Next <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Leak report">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSelected(null)} />
          <aside className="absolute right-0 top-0 bottom-0 w-full max-w-[560px] bg-night-900 border-l border-night-700 flex flex-col animate-slide-up">
            <header className="px-5 py-4 border-b border-night-700">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <SeverityPill value={selected.severity} />
                  <span className="font-mono text-[11px] text-ink-500">ID {selected.id}</span>
                  <span className={`badge ${String(selected.source_url ?? '').includes('.onion') ? 'badge-brand' : 'badge-neutral'}`}>
                    {String(selected.source_url ?? '').includes('.onion') ? 'Tor' : 'Web'}
                  </span>
                </div>
                <button onClick={() => setSelected(null)} className="btn-ghost btn !px-2" aria-label="Close">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <h2 className="text-[17px] font-semibold tracking-tight text-white mt-2">{selected.title}</h2>
            </header>
            <div className="flex-1 overflow-y-auto scrollbar p-5 space-y-4">
              <dl className="grid grid-cols-3 gap-3">
                {[
                  ['Victim', selected.victim_name || 'Classified'],
                  ['Confidence', `${((Number(selected.confidence) || 0.85) * 100).toFixed(0)}%`],
                  ['Detected', selected.created_at ? new Date(selected.created_at).toLocaleDateString() : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="nw-inset p-3">
                    <dt className="nw-eyebrow">{k}</dt>
                    <dd className="text-[13px] text-white mt-1 break-words">{v}</dd>
                  </div>
                ))}
              </dl>
              <div>
                <p className="nw-label">Technical analysis</p>
                <div className="nw-inset p-4">
                  <p className="text-[13px] leading-6 text-ink-400 whitespace-pre-wrap">
                    {stripHtml(selected.description || 'No technical detail available.')}
                  </p>
                </div>
              </div>
              {selected.source_url && (
                <div>
                  <p className="nw-label">Source URL</p>
                  <div className="nw-inset p-3 flex items-start gap-2">
                    <code className="nw-mono break-all flex-1 select-all">{selected.source_url}</code>
                    <button onClick={() => copy(selected.source_url)} className="btn btn-secondary !px-2 !py-1.5" title="Copy URL">
                      <DocumentDuplicateIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
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
            <footer className="border-t border-night-700 p-4 flex justify-end">
              <button onClick={() => setSelected(null)} className="btn btn-secondary">Close report</button>
            </footer>
          </aside>
        </div>
      )}
    </div>
  );
}
