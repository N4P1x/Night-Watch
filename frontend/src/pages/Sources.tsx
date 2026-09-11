import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useToast } from '../components/Toast';
import { PageHeader, EmptyState, SkeletonRows, rowKeyboardProps } from '../components/ui';
import { useQueryState, useQueryPage } from '../utils/querystate';
import {
  PlusIcon,
  XMarkIcon,
  PlayIcon,
  PencilIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

const SOURCE_TYPES = [
  { id: 'ransomware_gang', label: 'Ransomware gang' },
  { id: 'hacker_forum', label: 'Hacker forum' },
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'search_engine', label: 'Search engine' },
  { id: 'fraud', label: 'Fraud' },
  { id: 'rss', label: 'RSS' },
  { id: 'twitter', label: 'Twitter/X' },
  { id: 'darkweb', label: 'Dark web' },
  { id: 'leak_site', label: 'Leak site' },
  { id: 'data_breach', label: 'Data breach' },
  { id: 'threat_intel', label: 'Threat intel' },
  { id: 'other', label: 'Other' },
];

function typeLabel(id: string) {
  return SOURCE_TYPES.find((t) => t.id === id)?.label ?? id;
}

const EMPTY_FORM = {
  name: '',
  url: '',
  onion_url: '',
  type: 'darkweb',
  description: '',
  language: 'en',
  is_active: true,
  uses_tor: true,
  scrape_interval_minutes: 60,
};

export default function Sources() {
  const [page, setPage] = useQueryPage();
  const [sourceType, setSourceType] = useQueryState('type');
  const [activeFilter, setActiveFilter] = useQueryState('status');
  const activeValue = activeFilter === 'active' || activeFilter === 'inactive' ? activeFilter : 'all';
  const [drawer, setDrawer] = useState<null | { mode: 'add' } | { mode: 'edit'; source: any }>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const LIMIT = 20;

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawer(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['sources', page, sourceType, activeFilter],
    queryFn: async () => {
      const params: any = { skip: page * LIMIT, limit: LIMIT };
      if (sourceType) params.source_type = sourceType;
      if (activeValue !== 'all') params.is_active = activeValue === 'active';
      return (await api.get('/v1/sources', { params })).data;
    },
    refetchInterval: 30000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['sources'] });

  const createMut = useMutation({
    mutationFn: async (body: any) => (await api.post('/v1/sources', body)).data,
    onSuccess: () => {
      invalidate();
      setDrawer(null);
      setForm(EMPTY_FORM);
      showToast('Source created.', 'success');
    },
    onError: (e: any) => showToast('Create failed: ' + (e?.response?.data?.detail || e.message), 'error'),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, ...body }: any) => (await api.put(`/v1/sources/${id}`, body)).data,
    onSuccess: () => {
      invalidate();
      setDrawer(null);
      showToast('Source updated.', 'success');
    },
    onError: (e: any) => showToast('Update failed: ' + (e?.response?.data?.detail || e.message), 'error'),
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) =>
      (await api.put(`/v1/sources/${id}`, { is_active })).data,
    onSuccess: (_, v) => {
      invalidate();
      showToast(v.is_active ? 'Source enabled.' : 'Source disabled.', 'success');
    },
    onError: () => showToast('Toggle failed.', 'error'),
  });

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setDrawer({ mode: 'add' });
  };
  const openEdit = (s: any) => {
    setForm({
      name: s.name ?? '',
      url: s.url ?? '',
      onion_url: s.onion_url ?? '',
      type: s.type ?? 'darkweb',
      description: s.description ?? '',
      language: s.language ?? 'en',
      is_active: s.is_active ?? true,
      uses_tor: s.uses_tor ?? true,
      scrape_interval_minutes: s.scrape_interval_minutes ?? 60,
    });
    setDrawer({ mode: 'edit', source: s });
  };

  const save = () => {
    if (!String(form.name).trim() || (!String(form.url).trim() && !String(form.onion_url).trim())) {
      showToast('Name and at least one URL are required.', 'error');
      return;
    }
    if (drawer?.mode === 'add') createMut.mutate(form);
    else if (drawer?.mode === 'edit') updateMut.mutate({ id: (drawer as any).source.id, ...form });
  };

  const scrapeAll = async () => {
    try {
      await api.post('/v1/scrape/trigger');
      showToast('Scrape started.', 'success');
    } catch (err: any) {
      showToast('Scrape failed: ' + (err.message || 'Unknown'), 'error');
    }
  };

  const importDeepdark = async () => {
    try {
      const r = await api.post('/v1/sources/import-deepdarkcti');
      invalidate();
      showToast(`Imported ${r.data.added ?? 0} sources.`, 'success');
    } catch (err: any) {
      showToast('Import failed: ' + (err.message || 'Unknown'), 'error');
    }
  };

  const totalPages = Math.ceil((data?.total || 0) / LIMIT);
  const activeCount = (data?.sources ?? []).filter((s: any) => s.is_active).length;

  return (
    <div className="min-h-full">
      <PageHeader
        title="Data sources"
        description={
          <>{(data?.total ?? 0).toLocaleString()} sources · {activeCount} active on this page.</>
        }
        actions={
          <>
            <button onClick={() => refetch()} disabled={isFetching} className="btn btn-secondary">
              <ArrowPathIcon className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
            </button>
            <button onClick={importDeepdark} className="btn btn-secondary">Import deepdarkCTI</button>
            <button onClick={scrapeAll} className="btn btn-secondary">
              <PlayIcon className="w-4 h-4" aria-hidden="true" /> Scrape all
            </button>
            <button onClick={openAdd} className="btn btn-primary">
              <PlusIcon className="w-4 h-4" aria-hidden="true" /> Add source
            </button>
          </>
        }
      />

      <div className="px-6 py-5 space-y-4 max-w-[1440px]">
        <div className="nw-panel p-3 flex flex-col md:flex-row gap-2.5 md:items-center">
          <div className="flex gap-1.5" role="tablist" aria-label="Status">
            {(['all', 'active', 'inactive'] as const).map((v) => (
              <button
                key={v}
                onClick={() => {
                  setActiveFilter(v === 'all' ? '' : v);
                  setPage(0);
                }}
                className={`nw-tab capitalize ${activeValue === v ? 'nw-tab-active' : ''}`}
              >
                {v}
              </button>
            ))}
          </div>
          <span className="hidden md:block w-px h-6 bg-night-700" />
          <select value={sourceType} onChange={(e) => { setSourceType(e.target.value); setPage(0); }} className="input !w-auto" aria-label="Type">
            <option value="">All types</option>
            {SOURCE_TYPES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          {(sourceType || activeValue !== 'all') && (
            <button
              onClick={() => {
                setSourceType('');
                setActiveFilter('');
                setPage(0);
              }}
              className="btn btn-ghost text-[12.5px]"
            >
              Clear
            </button>
          )}
        </div>

        <div className="nw-panel overflow-hidden">
          {isLoading ? (
            <SkeletonRows rows={8} />
          ) : !data?.sources?.length ? (
            <div className="p-4">
              <EmptyState
                title="No sources match"
                hint="Add your first source to start collection."
                action={
                  <button onClick={openAdd} className="btn btn-primary">
                    <PlusIcon className="w-4 h-4" aria-hidden="true" /> Add source
                  </button>
                }
              />
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Route</th>
                  <th>Interval</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.sources.map((s: any) => {
                  const onion = Boolean(s.is_onion || s.onion_url);
                  return (
                    <tr key={s.id}>
                      <td className="max-w-[280px]">
                        <span className="block text-white font-medium truncate">{s.name}</span>
                        <span className="block text-[11.5px] text-ink-500 truncate">{s.description || 'No description'}</span>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="badge badge-neutral">{typeLabel(s.type)}</span>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className={`badge ${onion ? 'badge-brand' : 'badge-neutral'}`}>{onion ? 'Tor' : 'Clearnet'}</span>
                      </td>
                      <td className="font-mono text-[12px] text-ink-400 whitespace-nowrap">{s.scrape_interval_minutes ?? 60}m</td>
                      <td>
                        <span className={`badge ${s.is_active ? 'badge-low' : 'badge-neutral'}`}>
                          {s.is_active ? 'Active' : 'Off'}
                        </span>
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <button
                          onClick={() => toggleMut.mutate({ id: s.id, is_active: !s.is_active })}
                          className="btn btn-ghost !px-2 !py-1.5 text-[12.5px]"
                          title={s.is_active ? 'Disable' : 'Enable'}
                        >
                          {s.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button onClick={() => openEdit(s)} className="btn btn-ghost !px-2 !py-1.5" title="Edit" aria-label={`Edit ${s.name}`}>
                          <PencilIcon className="w-4 h-4" aria-hidden="true" />
                        </button>
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

      {drawer && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={drawer.mode === 'add' ? 'Add source' : 'Edit source'}>
          <div className="absolute inset-0 bg-black/70" onClick={() => setDrawer(null)} />
          <aside className="absolute right-0 top-0 bottom-0 w-full max-w-[480px] bg-night-900 border-l border-night-700 flex flex-col animate-fade-in overscroll-contain">
            <header className="px-5 py-4 border-b border-night-700 flex items-center justify-between">
              <div>
                <p className="nw-eyebrow">{drawer.mode === 'add' ? 'New source' : 'Edit source'}</p>
                <p className="text-[14px] font-semibold text-white mt-0.5">
                  {drawer.mode === 'add' ? 'Add collection target' : (drawer as any).source.name}
                </p>
              </div>
              <button onClick={() => setDrawer(null)} className="btn-ghost btn !px-2" aria-label="Close">
                <XMarkIcon className="w-5 h-5" aria-hidden="true" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto scrollbar p-5 space-y-4">
              <div>
                <label className="nw-label" htmlFor="src-name">Name *</label>
                <input id="src-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="BreachForums mirror" />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="nw-label" htmlFor="src-url">Surface URL</label>
                  <input id="src-url" type="url" inputMode="url" className="input font-mono" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" />
                </div>
                <div>
                  <label className="nw-label" htmlFor="src-onion">Onion URL</label>
                  <input id="src-onion" type="url" inputMode="url" className="input font-mono" value={form.onion_url} onChange={(e) => setForm({ ...form, onion_url: e.target.value })} placeholder="http://….onion" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="nw-label" htmlFor="src-type">Type</label>
                  <select id="src-type" className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {SOURCE_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="nw-label" htmlFor="src-lang">Language</label>
                  <select id="src-lang" className="input" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                    {['en', 'ru', 'zh', 'es', 'de', 'fr', 'other'].map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="nw-label" htmlFor="src-interval">Interval</label>
                <select
                  id="src-interval"
                  className="input"
                  value={form.scrape_interval_minutes}
                  onChange={(e) => setForm({ ...form, scrape_interval_minutes: parseInt(e.target.value, 10) })}
                >
                  {[[15, '15 min'], [30, '30 min'], [60, '1 hour'], [120, '2 hours'], [360, '6 hours'], [1440, '24 hours']].map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="nw-label" htmlFor="src-desc">Description</label>
                <textarea id="src-desc" className="input min-h-[72px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="flex gap-5">
                <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 accent-[#5e6ad2]" />
                  Active
                </label>
                <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                  <input type="checkbox" checked={form.uses_tor} onChange={(e) => setForm({ ...form, uses_tor: e.target.checked })} className="w-4 h-4 accent-[#5e6ad2]" />
                  Requires Tor
                </label>
              </div>
            </div>
            <footer className="border-t border-night-700 p-4 flex justify-end gap-2">
              <button onClick={() => setDrawer(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={save} disabled={createMut.isPending || updateMut.isPending} className="btn btn-primary">
                {drawer.mode === 'add' ? (createMut.isPending ? 'Creating…' : 'Create') : updateMut.isPending ? 'Saving…' : 'Save'}
              </button>
            </footer>
          </aside>
        </div>
      )}
    </div>
  );
}
