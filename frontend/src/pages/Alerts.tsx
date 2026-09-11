import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useToast } from '../components/Toast';
import { PageHeader, Stat, EmptyState, SkeletonRows, SeverityPill } from '../components/ui';
import { useQueryState, useQueryPage } from '../utils/querystate';
import { SEVERITY_ORDER } from '../utils/severity';
import {
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

export default function Alerts() {
  const [page, setPage] = useQueryPage();
  const [severity, setSeverity] = useQueryState('severity');
  const [tab, setTab] = useQueryState('tab');
  const tabValue = tab === 'unread' || tab === 'read' ? tab : 'all';
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const LIMIT = 20;

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['alerts', page, tab, severity],
    queryFn: async () => {
      const params: any = { skip: page * LIMIT, limit: LIMIT };
      if (tabValue !== 'all') params.is_read = tabValue === 'read';
      if (severity) params.severity = severity;
      return (await api.get('/v1/alerts', { params })).data;
    },
    refetchInterval: 30000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['alerts'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
  };

  const setRead = useMutation({
    mutationFn: async ({ id, is_read }: { id: number; is_read: boolean }) =>
      (await api.put(`/v1/alerts/${id}`, { is_read })).data,
    onSuccess: () => invalidate(),
    onError: () => showToast('Update failed.', 'error'),
  });

  const dismiss = useMutation({
    mutationFn: async (id: number) => (await api.put(`/v1/alerts/${id}`, { is_dismissed: true })).data,
    onSuccess: () => {
      invalidate();
      showToast('Alert dismissed.', 'success');
    },
    onError: () => showToast('Dismiss failed.', 'error'),
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const unread = (data?.alerts ?? []).filter((a: any) => !a.is_read && !a.is_dismissed);
      for (const a of unread) {
        try {
          await api.put(`/v1/alerts/${a.id}`, { is_read: true });
        } catch {
          /* best-effort per alert */
        }
      }
    },
    onSuccess: () => {
      invalidate();
      showToast('Visible alerts marked as read.', 'success');
    },
  });

  const unread: number = data?.unread ?? 0;
  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / LIMIT));

  return (
    <div className="min-h-full">
      <PageHeader
        title="Threat alerts"
        description={<>{unread > 0 ? <span className="text-sev-critical font-semibold">{unread} unread need attention.</span> : 'All caught up.'}</>}
        actions={
          <>
            <button onClick={() => refetch()} disabled={isFetching} className="btn btn-secondary">
              <ArrowPathIcon className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
            </button>
            {unread > 0 && (
              <button onClick={() => markAll.mutate()} disabled={markAll.isPending} className="btn btn-secondary">
                <CheckIcon className="w-4 h-4" aria-hidden="true" /> Mark page read
              </button>
            )}
          </>
        }
      />

      <div className="px-6 py-5 space-y-4 max-w-[1200px]">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Stat label="Total" value={data?.total ?? 0} />
          <Stat label="Unread" value={unread} />
          <Stat label="On page" value={data?.alerts?.length ?? 0} />
        </div>

        <div className="nw-panel p-3 flex flex-col md:flex-row gap-2.5 md:items-center">
          <div className="flex gap-1.5" role="tablist" aria-label="Read state">
            {(['all', 'unread', 'read'] as const).map((v) => (
              <button key={v} onClick={() => { setTab(v === 'all' ? '' : v); setPage(0); }} className={`nw-tab capitalize ${tabValue === v ? 'nw-tab-active' : ''}`}>
                {v}
                {v === 'unread' && unread > 0 && <span className="ml-1.5 font-mono tabular-nums text-sev-critical">{unread}</span>}
              </button>
            ))}
          </div>
          <span className="hidden md:block w-px h-6 bg-night-700" />
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
        </div>

        <div className="nw-panel overflow-hidden">
          {isLoading ? (
            <SkeletonRows rows={8} />
          ) : isError ? (
            <div className="p-4">
              <EmptyState title="Could not load alerts" hint="Check the API, then retry." action={<button onClick={() => refetch()} className="btn btn-secondary">Retry</button>} />
            </div>
          ) : !data?.alerts?.length ? (
            <div className="p-4">
              <EmptyState title={unread === 0 && tabValue !== 'read' ? 'All clear' : 'No alerts match'} hint="New alerts arrive from scrape runs and keyword matches." />
            </div>
          ) : (
            <ul className="divide-y divide-night-700/70">
              {data.alerts.map((a: any) => (
                <li
                  key={a.id}
                  className={`px-4 py-3.5 flex items-start gap-3 transition-colors hover:bg-white/[0.02] ${a.is_dismissed ? 'opacity-45' : ''}`}
                >
                  <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${a.is_read ? 'bg-night-600' : 'bg-brand'}`} title={a.is_read ? 'Read' : 'Unread'} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityPill value={a.severity} />
                      <span className={`text-[13.5px] ${a.is_read ? 'text-ink-400' : 'text-white font-semibold'}`}>{a.title}</span>
                    </div>
                    {(a.description ?? a.message) && <p className="text-[12.5px] text-ink-500 mt-1 line-clamp-2">{a.description ?? a.message}</p>}
                    <p className="font-mono text-[11px] text-ink-500 mt-1.5 tabular-nums">
                      {a.created_at ? new Date(a.created_at).toLocaleString() : '—'}
                      {a.is_dismissed ? ' · dismissed' : ''}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {!a.is_read && (
                      <button
                        onClick={() => setRead.mutate({ id: a.id, is_read: true })}
                        className="btn btn-ghost !px-2 !py-1.5 text-[12px]"
                        title="Mark read"
                        aria-label={`Mark alert ${a.title} as read`}
                      >
                        <CheckIcon className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}
                    {!a.is_dismissed && (
                      <button onClick={() => dismiss.mutate(a.id)} className="btn btn-ghost !px-2 !py-1.5 hover:!text-sev-critical" title="Dismiss" aria-label={`Dismiss alert ${a.title}`}>
                        <XMarkIcon className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-night-700">
            <button disabled={page === 0} onClick={() => setPage(Math.max(0, page - 1))} className="btn btn-secondary !py-1.5">
              <ChevronLeftIcon className="w-4 h-4" aria-hidden="true" /> Prev
            </button>
            <span className="font-mono text-[12px] text-ink-500 tabular-nums">
              {page + 1} / {totalPages}
            </span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="btn btn-secondary !py-1.5">
              Next <ChevronRightIcon className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
