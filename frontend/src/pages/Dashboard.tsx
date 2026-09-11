import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useToast } from '../components/Toast';
import { PageHeader, Section, Stat, SeverityPill, StatusDot, EmptyState, SkeletonRows, rowKeyboardProps } from '../components/ui';
import { SEVERITY_ORDER, SEVERITY_HEX, SEVERITY_BAR, normalizeSeverity } from '../utils/severity';
import {
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

interface ScrapeStatus {
  status: string;
  progress: number;
  total: number;
  success: number;
  failed: number;
  current_url: string;
}

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [scrapeStatus, setScrapeStatus] = useState<ScrapeStatus | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const isAdmin = user?.role === 'admin';

  const { data: stats, isLoading: statsLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/v1/stats/dashboard');
      setLastUpdated(new Date());
      return response.data;
    },
    refetchInterval: 30000,
  });

  const { data: recentLeaks } = useQuery({
    queryKey: ['recent-leaks'],
    queryFn: async () => {
      const response = await api.get('/v1/leaks', { params: { limit: 5 } });
      return response.data;
    },
  });

  const { data: actorsData } = useQuery({
    queryKey: ['top-actors'],
    queryFn: async () => {
      const response = await api.get('/v1/threat-actors', { params: { limit: 6 } });
      return response.data;
    },
  });

  useEffect(() => {
    if (!isScraping) return;
    let alive = true;
    const check = async () => {
      try {
        const response = await api.get('/v1/scrape/status');
        if (!alive) return;
        setScrapeStatus(response.data);
        const s = String(response.data?.status ?? '');
        setIsScraping(s === 'running' || s === 'starting');
      } catch {
        /* keep previous state; status endpoint is best-effort */
      }
    };
    check();
    const t = setInterval(check, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [isScraping]);

  const handleStartScrape = async () => {
    setIsScraping(true);
    try {
      await api.post('/v1/scrape/trigger');
      showToast('Scrape started via Tor.', 'success');
    } catch (err: any) {
      showToast('Failed to start scrape: ' + (err?.response?.data?.detail || err.message || 'Unknown'), 'error');
      setIsScraping(false);
    }
  };

  const handleStopScrape = async () => {
    try {
      await api.post('/v1/scrape/stop');
      showToast('Scrape stop requested.', 'warning');
      setIsScraping(false);
    } catch {
      showToast('Failed to stop scrape.', 'error');
    }
  };

  const severityBreakdown: Record<string, number> = stats?.leaks?.by_severity || {};
  const totalLeaks = Object.values(severityBreakdown).reduce((a, b) => a + (Number(b) || 0), 0);
  const progress =
    scrapeStatus && scrapeStatus.total > 0
      ? Math.min(Math.max((scrapeStatus.progress / scrapeStatus.total) * 100, 0), 100)
      : 0;

  return (
    <div className="min-h-full">
      <PageHeader
        title="Operations overview"
        description={
          <>
            Live dark-web posture at a glance. Last sync{' '}
            <span className="font-mono text-ink-100 tabular-nums">{formatTime(lastUpdated)}</span>
            {user?.role === 'viewer' && ' · read-only role'}.
          </>
        }
        actions={
          <>
            <button onClick={() => refetch()} disabled={isFetching} className="btn btn-secondary" title="Refresh">
              <ArrowPathIcon aria-hidden="true" className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {isAdmin &&
              (!isScraping ? (
                <button onClick={handleStartScrape} className="btn btn-primary">
                  <PlayIcon className="w-4 h-4" aria-hidden="true" />
                  Start scrape
                </button>
              ) : (
                <button onClick={handleStopScrape} className="btn btn-danger">
                  <StopIcon className="w-4 h-4" aria-hidden="true" />
                  Stop
                </button>
              ))}
          </>
        }
      />

      <div className="px-6 py-5 space-y-5 max-w-[1440px]">
        {isScraping && scrapeStatus && (
          <div className="nw-panel p-4" role="status">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <StatusDot state="degraded" label="Scraping via Tor" />
                <span className="nw-mono text-ink-400 truncate max-w-[420px]">
                  {scrapeStatus.current_url || 'initializing…'}
                </span>
              </div>
              <span className="font-mono text-[13px] text-white tabular-nums">
                {scrapeStatus.progress}/{scrapeStatus.total} · {Math.round(progress)}% · {scrapeStatus.success} ok / {scrapeStatus.failed} fail
              </span>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-night-950 overflow-hidden">
              <div className="h-full bg-brand transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {statsLoading ? (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="nw-panel p-4">
                <div className="h-3 w-20 rounded bg-night-700 animate-pulse" />
                <div className="h-8 w-16 rounded bg-night-700 animate-pulse mt-2" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            title="Could not load dashboard stats"
            hint="API /v1/stats/dashboard failed. Check backend, then retry."
            action={
              <button onClick={() => refetch()} className="btn btn-secondary">
                Retry
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <Stat
              label="Total leaks"
              value={(stats?.leaks?.total ?? 0).toLocaleString()}
              sub={`${stats?.leaks?.new_today ?? 0} new today`}
              onClick={() => navigate('/leaks')}
            />
            <Stat
              label="Threat actors"
              value={(stats?.threat_actors?.total ?? 0).toLocaleString()}
              sub={`${stats?.threat_actors?.active ?? 0} active`}
              onClick={() => navigate('/actors')}
            />
            <Stat
              label="IOCs"
              value={(stats?.iocs?.total ?? 0).toLocaleString()}
              sub="Indicators of compromise"
              onClick={() => navigate('/iocs')}
            />
            <Stat
              label="Active sources"
              value={(stats?.sources?.active ?? 0).toLocaleString()}
              sub="Tor + clearnet feeds"
              onClick={() => navigate('/sources')}
            />
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Section
            title="Severity distribution"
            hint={`${totalLeaks.toLocaleString()} leaks total`}
            className="xl:col-span-2"
            action={
              <button onClick={() => navigate('/leaks')} className="btn btn-ghost !px-2 !py-1 text-[12.5px]">
                Open leaks <ArrowRightIcon className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            }
          >
            {totalLeaks === 0 ? (
              <EmptyState title="No leaks yet" hint="Run a scrape to populate severity breakdown." />
            ) : (
              <div className="space-y-2.5">
                {SEVERITY_ORDER.map((sev) => {
                  const count = Number(severityBreakdown[sev] ?? 0);
                  const pct = totalLeaks > 0 ? (count / totalLeaks) * 100 : 0;
                  return (
                    <div key={sev} className="flex items-center gap-3">
                      <span className="w-16 flex-shrink-0">
                        <SeverityPill value={sev} />
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-night-950 overflow-hidden border border-night-700">
                        <div className={`h-full ${SEVERITY_BAR[sev]}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-20 text-right font-mono text-[12.5px] tabular-nums" style={{ color: SEVERITY_HEX[sev] }}>
                        {count}
                      </span>
                      <span className="w-12 text-right font-mono text-[11.5px] text-ink-500 tabular-nums">{pct.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          <Section
            title="Top threat actors"
            hint="By recent activity"
            action={
              <button onClick={() => navigate('/actors')} className="btn btn-ghost !px-2 !py-1 text-[12.5px]">
                View all <ArrowRightIcon className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            }
          >
            {!actorsData?.actors || actorsData.actors.length === 0 ? (
              <EmptyState title="No actors tracked" hint="Actors appear after the first successful scrape." />
            ) : (
              <ul className="divide-y divide-night-700/70 -m-4">
                {actorsData.actors.slice(0, 6).map((actor: any) => (
                  <li key={actor.id}>
                    <button onClick={() => navigate('/actors')} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02]">
                      <span className="w-8 h-8 rounded-md bg-night-950 border border-night-700 flex items-center justify-center font-mono text-[12px] font-bold text-ink-100 flex-shrink-0">
                        {String(actor.name ?? '?').slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold text-white truncate">{actor.name}</span>
                        <span className="block text-[11.5px] text-ink-500 capitalize">{actor.risk_level || 'medium'} risk</span>
                      </span>
                      <span className={`badge ${actor.is_active ? 'badge-low' : 'badge-neutral'}`}>
                        {actor.is_active ? 'Active' : 'Idle'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Section
            title="Recent leaks"
            hint="Latest 5 · click to investigate"
            className="xl:col-span-2 !p-0 overflow-hidden"
            action={
              <button onClick={() => navigate('/leaks')} className="btn btn-ghost !px-2 !py-1 text-[12.5px]">
                View all <ArrowRightIcon className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            }
          >
            {!recentLeaks?.leaks || recentLeaks.leaks.length === 0 ? (
              <div className="p-4">
                <EmptyState title="No leaks detected" hint="Start a scrape to collect the first batch." />
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Title</th>
                    <th>Victim</th>
                    <th className="text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeaks.leaks.slice(0, 5).map((leak: any) => {
                    const sev = normalizeSeverity(leak.severity);
                    return (
                      <tr
                        key={leak.id}
                        onClick={() => navigate('/leaks')}
                        className="cursor-pointer"
                        {...rowKeyboardProps(() => navigate('/leaks'), `Open leak ${leak.title}`)}
                      >
                        <td>
                          <SeverityPill value={sev} />
                        </td>
                        <td className="max-w-[320px]">
                          <span className="block truncate text-white font-medium">{leak.title}</span>
                        </td>
                        <td className="text-ink-400 truncate max-w-[160px]">{leak.victim_name || '—'}</td>
                        <td className="text-right font-mono text-[12px] text-ink-500 whitespace-nowrap">
                          {leak.created_at ? new Date(leak.created_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Section>

          <Section title="System status" hint="Best-effort local checks">
            <ul className="space-y-2.5">
              <li className="flex items-center justify-between nw-inset px-3 py-2.5">
                <span className="text-[13px] text-white">API server</span>
                <StatusDot state="online" label="Online" />
              </li>
              <li className="flex items-center justify-between nw-inset px-3 py-2.5">
                <span className="text-[13px] text-white">Tor circuit</span>
                <StatusDot state={isScraping ? 'degraded' : 'online'} label={isScraping ? 'Scraping' : 'Ready'} />
              </li>
              <li className="flex items-center justify-between nw-inset px-3 py-2.5">
                <span className="text-[13px] text-white">Scheduler</span>
                <StatusDot state={isScraping ? 'degraded' : 'offline'} label={isScraping ? 'Running' : 'Idle'} />
              </li>
            </ul>
            <div className="grid grid-cols-2 gap-2.5 mt-3">
              <div className="nw-inset p-3 text-center">
                <p className="text-[20px] font-semibold tabular-nums">{stats?.leaks?.total ?? 0}</p>
                <p className="nw-eyebrow mt-0.5">Records</p>
              </div>
              <div className="nw-inset p-3 text-center">
                <p className="text-[20px] font-semibold tabular-nums">{stats?.iocs?.total ?? 0}</p>
                <p className="nw-eyebrow mt-0.5">IOCs</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <button onClick={() => navigate('/leaks')} className="btn btn-secondary flex-1">
                View leaks
              </button>
              <button onClick={() => navigate('/alerts')} className="btn btn-secondary flex-1">
                View alerts
              </button>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
