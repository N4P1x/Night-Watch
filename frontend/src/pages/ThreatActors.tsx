import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { PageHeader, Stat, EmptyState, SkeletonRows, SeverityPill } from '../components/ui';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ArrowPathIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

// Curated seed set — diverse archetypes, not a dozen near-duplicate RaaS entries.
// Full historical catalog belongs in backend/seed.py, not the bundle.
const SEED_ACTORS = [
  {
    name: 'LockBit',
    aliases: ['LockBit 3.0', 'Team LockBit'],
    description: 'Prolific ransomware-as-a-service with double-extortion and aggressive affiliate program.',
    risk_level: 'critical',
    motivation: 'Financial',
    sophistication: 'High',
    resource_level: 'High',
    target_industries: ['Healthcare', 'Finance', 'Government', 'Critical Infrastructure'],
    target_regions: ['North America', 'Europe'],
    ttps: ['T1486', 'T1490', 'T1562', 'T1070'],
    associated_tools: ['LockBit Ransomware', 'StealBIT'],
    tags: ['ransomware', 'double-extortion', 'RaaS', 'active'],
  },
  {
    name: 'ALPHV/BlackCat',
    aliases: ['Noberus', 'ALPHV'],
    description: 'Rust-based RaaS known for healthcare and critical infrastructure targeting.',
    risk_level: 'critical',
    motivation: 'Financial',
    sophistication: 'Very High',
    resource_level: 'High',
    target_industries: ['Healthcare', 'Energy', 'Finance'],
    target_regions: ['North America', 'Europe'],
    ttps: ['T1486', 'T1490', 'T1059', 'T1021'],
    associated_tools: ['BlackCat Ransomware', 'Exmatter'],
    tags: ['ransomware', 'Rust', 'RaaS', 'active'],
  },
  {
    name: 'Clop',
    aliases: ['CLOP'],
    description: 'Ransomware group behind mass-exploitation campaigns (e.g. file-transfer zero-days).',
    risk_level: 'high',
    motivation: 'Financial',
    sophistication: 'High',
    resource_level: 'High',
    target_industries: ['Healthcare', 'Education', 'Finance'],
    target_regions: ['North America', 'Europe', 'Asia'],
    ttps: ['T1486', 'T1190', 'T1059'],
    associated_tools: ['Clop Ransomware'],
    tags: ['ransomware', 'double-extortion', 'active'],
  },
  {
    name: 'Lazarus Group',
    aliases: ['Hidden Cobra', 'APT38'],
    description: 'North Korean state-sponsored group: financial crime, espionage, destructive attacks.',
    risk_level: 'critical',
    motivation: 'Espionage',
    sophistication: 'Extremely High',
    resource_level: 'State-Level',
    target_industries: ['Finance', 'Government', 'Technology', 'Energy'],
    target_regions: ['North America', 'Europe', 'Asia'],
    ttps: ['T1059', 'T1070', 'T1005', 'T1021'],
    associated_tools: ['FALLCHILL', 'MANUSCript'],
    tags: ['apt', 'state-sponsored', 'financial-crime'],
  },
  {
    name: 'APT29',
    aliases: ['Cozy Bear', 'Nobelium'],
    description: 'Russian SVR-associated APT known for supply-chain compromise and political espionage.',
    risk_level: 'critical',
    motivation: 'Espionage',
    sophistication: 'Extremely High',
    resource_level: 'State-Level',
    target_industries: ['Government', 'Technology', 'Healthcare'],
    target_regions: ['North America', 'Europe'],
    ttps: ['T1059', 'T1070', 'T1560'],
    associated_tools: ['WellMess', 'NOBELIUM tooling'],
    tags: ['apt', 'state-sponsored', 'espionage'],
  },
  {
    name: 'Black Basta',
    aliases: ['Black Basta Ransomware'],
    description: 'RaaS with suspected Conti lineage, focused on critical infrastructure and healthcare.',
    risk_level: 'high',
    motivation: 'Financial',
    sophistication: 'High',
    resource_level: 'High',
    target_industries: ['Healthcare', 'Energy', 'Finance'],
    target_regions: ['North America', 'Europe'],
    ttps: ['T1486', 'T1490', 'T1021'],
    associated_tools: ['Black Basta Ransomware', 'QakBot'],
    tags: ['ransomware', 'double-extortion', 'active'],
  },
];

const EMPTY_FORM: any = {
  name: '',
  aliases: [],
  description: '',
  risk_level: 'high',
  motivation: 'Financial',
  sophistication: 'High',
  resource_level: 'Medium',
  primary_languages: [],
  target_industries: [],
  target_regions: [],
  ttps: [],
  associated_tools: [],
  associated_malware: [],
  tags: [],
  is_active: true,
};

function formFromActor(a: any) {
  const asList = (v: unknown): string[] => (Array.isArray(v) ? v : v ? [String(v)] : []);
  return {
    name: a.name ?? '',
    aliases: a.aliases ?? [],
    description: a.description ?? '',
    risk_level: a.risk_level ?? 'high',
    motivation: a.motivation ?? 'Financial',
    sophistication: a.sophistication ?? 'High',
    resource_level: a.resource_level ?? 'Medium',
    primary_languages: a.primary_languages ?? [],
    target_industries: a.target_industries ?? [],
    target_regions: a.target_regions ?? [],
    ttps: a.ttps ?? [],
    associated_tools: asList(a.associated_tools ?? (a as any).tools),
    associated_malware: asList(a.associated_malware),
    tags: a.tags ?? [],
    is_active: a.is_active ?? true,
  };
}

function csvCell(v: unknown) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

export default function ThreatActors() {
  const [search, setSearch] = useState('');
  const [risk, setRisk] = useState('');
  const [active, setActive] = useState<'all' | 'active' | 'idle'>('all');
  const [page, setPage] = useState(0);
  const [drawer, setDrawer] = useState<null | { mode: 'view'; actor: any } | { mode: 'add' } | { mode: 'edit'; actor: any }>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const { showToast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();
  const LIMIT = 20;

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['threat-actors', search, page],
    queryFn: async () =>
      (
        await api.get('/v1/threat-actors', {
          params: { search: search || undefined, skip: page * LIMIT, limit: LIMIT },
        })
      ).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['threat-actors'] });

  const actors: any[] = (data?.actors ?? []).filter((a: any) => {
    if (risk && a.risk_level !== risk) return false;
    if (active !== 'all' && Boolean(a.is_active) !== (active === 'active')) return false;
    return true;
  });

  const stats = {
    total: data?.total ?? 0,
    active: (data?.actors ?? []).filter((a: any) => a.is_active).length,
    critical: (data?.actors ?? []).filter((a: any) => a.risk_level === 'critical').length,
  };

  const seed = async () => {
    showToast('Seeding known actors…', 'info');
    let added = 0;
    for (const actor of SEED_ACTORS) {
      try {
        await api.post('/v1/threat-actors', actor);
        added++;
      } catch (e: any) {
        if (e?.response?.status !== 409) break;
      }
    }
    invalidate();
    showToast(`Seeded ${added} actors (409 = already exists).`, 'success');
  };

  const remove = async (actor: any) => {
    if (!window.confirm(`Delete ${actor.name}?`)) return;
    try {
      await api.delete(`/v1/threat-actors/${actor.id}`);
      invalidate();
      setDrawer(null);
      showToast(`${actor.name} deleted.`, 'success');
    } catch {
      showToast('Delete failed.', 'error');
    }
  };

  const toggle = async (actor: any) => {
    try {
      await api.put(`/v1/threat-actors/${actor.id}`, { is_active: !actor.is_active });
      invalidate();
    } catch {
      showToast('Update failed.', 'error');
    }
  };

  const save = async () => {
    if (!String(form.name).trim()) {
      showToast('Name is required.', 'error');
      return;
    }
    try {
      if (drawer?.mode === 'add') await api.post('/v1/threat-actors', form);
      else if (drawer?.mode === 'edit') await api.put(`/v1/threat-actors/${(drawer as any).actor.id}`, form);
      invalidate();
      setDrawer(null);
      showToast('Saved.', 'success');
    } catch (e: any) {
      showToast('Save failed: ' + (e?.response?.data?.detail || e.message), 'error');
    }
  };

  const exportCSV = () => {
    if (!actors.length) return;
    const head = 'name,risk,status,industries,regions';
    const rows = actors.map((a: any) =>
      [a.name, a.risk_level, a.is_active ? 'active' : 'idle', (a.target_industries ?? []).join('; '), (a.target_regions ?? []).join('; ')]
        .map(csvCell)
        .join(','),
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([[head, ...rows].join('\n')], { type: 'text/csv' }));
    a.download = `night-watch-actors-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / LIMIT));

  return (
    <div className="min-h-full">
      <PageHeader
        eyebrow="Intelligence · Actors"
        title="Threat actors"
        description={<>{stats.total.toLocaleString()} tracked groups · click a row for TTPs and tooling.</>}
        actions={
          <>
            <button onClick={() => refetch()} disabled={isFetching} className="btn btn-secondary">
              Refresh
            </button>
            <button onClick={exportCSV} className="btn btn-secondary">
              <ArrowDownTrayIcon className="w-4 h-4" /> Export
            </button>
            {isAdmin && (
              <button onClick={seed} className="btn btn-secondary" title="Admin only">
                Seed known
              </button>
            )}
            <button
              onClick={() => {
                setForm(EMPTY_FORM);
                setDrawer({ mode: 'add' });
              }}
              className="btn btn-primary"
            >
              <PlusIcon className="w-4 h-4" /> Add actor
            </button>
          </>
        }
      />

      <div className="px-6 py-5 space-y-4 max-w-[1440px]">
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Tracked" value={stats.total} />
          <Stat label="Active" value={stats.active} accent="low" />
          <Stat label="Critical" value={stats.critical} accent="critical" />
        </div>

        <div className="nw-panel p-3 flex flex-col md:flex-row gap-2.5 md:items-center">
          <label className="flex-1 flex items-center gap-2 nw-inset px-3 py-2 focus-within:border-brand/50">
            <MagnifyingGlassIcon className="w-4 h-4 text-ink-500" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search name or alias…"
              className="bg-transparent outline-none text-[13px] w-full placeholder:text-ink-500"
            />
            {search && (
              <button onClick={() => setSearch('')} aria-label="Clear" className="text-ink-500 hover:text-white">
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </label>
          <div className="flex gap-1.5">
            {(['all', 'active', 'idle'] as const).map((v) => (
              <button key={v} onClick={() => setActive(v)} className={`nw-tab capitalize ${active === v ? 'nw-tab-active' : ''}`}>
                {v}
              </button>
            ))}
          </div>
          <select value={risk} onChange={(e) => setRisk(e.target.value)} className="input !w-auto" aria-label="Risk">
            <option value="">All risk</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="nw-panel overflow-hidden">
          {isLoading ? (
            <SkeletonRows rows={8} />
          ) : isError ? (
            <div className="p-4">
              <EmptyState title="Could not load actors" hint="Check the API, then retry." action={<button onClick={() => refetch()} className="btn btn-secondary">Retry</button>} />
            </div>
          ) : !actors.length ? (
            <div className="p-4">
              <EmptyState
                title="No actors match"
                hint="Seed the curated set or add your first actor."
                action={<button onClick={seed} className="btn btn-secondary">Seed known actors</button>}
              />
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                    <th>Actor</th>
                    <th>Risk</th>
                    <th>Industries</th>
                    <th>Regions</th>
                    <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {actors.map((a: any) => (
                  <tr key={a.id} onClick={() => setDrawer({ mode: 'view', actor: a })} className="cursor-pointer">
                    <td className="max-w-[260px]">
                      <span className="block text-white font-medium truncate">{a.name}</span>
                      {!!a.aliases?.length && <span className="block text-[11.5px] text-ink-500 truncate">{a.aliases.slice(0, 3).join(' · ')}</span>}
                    </td>
                    <td>
                      <SeverityPill value={a.risk_level} />
                    </td>
                    <td className="text-ink-400 text-[12.5px] max-w-[180px] truncate">
                      {(a.target_industries ?? []).slice(0, 2).join(', ') || '—'}
                    </td>
                    <td className="text-ink-400 text-[12.5px] max-w-[140px] truncate">{(a.target_regions ?? []).slice(0, 2).join(', ') || '—'}</td>
                    <td>
                      <span className={`badge ${a.is_active ? 'badge-low' : 'badge-neutral'}`}>{a.is_active ? 'Active' : 'Idle'}</span>
                    </td>
                    <td className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggle(a)} className="btn btn-ghost !px-2 !py-1.5 text-[12.5px]">
                        {a.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => {
                          setForm(formFromActor(a));
                          setDrawer({ mode: 'edit', actor: a });
                        }}
                        className="btn btn-ghost !px-2 !py-1.5"
                        title="Edit"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <button onClick={() => remove(a)} className="btn btn-ghost !px-2 !py-1.5 hover:!text-sev-critical" title="Delete (admin)">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="flex items-center justify-between px-4 py-3 border-t border-night-700">
            <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="btn btn-secondary !py-1.5">
              <ChevronLeftIcon className="w-4 h-4" /> Prev
            </button>
            <span className="font-mono text-[12px] text-ink-500 tabular-nums">
              {page + 1} / {totalPages}
            </span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} className="btn btn-secondary !py-1.5">
              Next <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Actor detail">
          <div className="absolute inset-0 bg-black/70" onClick={() => setDrawer(null)} />
          <aside className="absolute right-0 top-0 bottom-0 w-full max-w-[480px] bg-night-900 border-l border-night-700 flex flex-col animate-slide-up">
            <header className="px-5 py-4 border-b border-night-700 flex items-center justify-between">
              <div>
                <p className="nw-eyebrow">{drawer.mode === 'add' ? 'New actor' : drawer.mode === 'edit' ? 'Edit actor' : 'Actor profile'}</p>
                <p className="text-[14px] font-semibold text-white mt-0.5">
                  {drawer.mode === 'view' ? (drawer as any).actor.name : drawer.mode === 'edit' ? (drawer as any).actor.name : 'Untitled'}
                </p>
              </div>
              <button onClick={() => setDrawer(null)} className="btn-ghost btn !px-2" aria-label="Close">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </header>

            {drawer.mode === 'view' ? (
              <ActorProfile
                actor={(drawer as any).actor}
                isAdmin={isAdmin}
                onEdit={() => {
                  const a = (drawer as any).actor;
                  setForm(formFromActor(a));
                  setDrawer({ mode: 'edit', actor: a });
                }}
                onToggle={() => {
                  toggle((drawer as any).actor);
                  setDrawer(null);
                }}
                onDelete={() => remove((drawer as any).actor)}
              />
            ) : (
              <ActorForm form={form} setForm={setForm} onCancel={() => setDrawer(null)} onSave={save} mode={drawer.mode} />
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function ActorProfile({ actor: a, isAdmin, onEdit, onToggle, onDelete }: any) {
  const list = (title: string, items?: string[], mono = false) => (
    <div>
      <p className="nw-label">{title}</p>
      {!items?.length ? (
        <p className="text-[13px] text-ink-500">—</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((t: string, i: number) => (
            <span key={i} className={`badge badge-neutral ${mono ? '!normal-case !tracking-normal font-mono' : ''}`}>
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
  return (
    <>
      <div className="flex-1 overflow-y-auto scrollbar p-5 space-y-4">
        <div className="flex items-center gap-2">
          <SeverityPill value={a.risk_level} />
          <span className={`badge ${a.is_active ? 'badge-low' : 'badge-neutral'}`}>{a.is_active ? 'Active' : 'Idle'}</span>
          <span className="badge badge-neutral">{a.motivation || 'Unknown motive'}</span>
        </div>
        {!!a.aliases?.length && (
          <p className="text-[12.5px] text-ink-500">
            Also known as: <span className="text-ink-100">{a.aliases.join(', ')}</span>
          </p>
        )}
        {a.description && <p className="text-[13px] leading-6 text-ink-400">{a.description}</p>}
        <dl className="grid grid-cols-2 gap-3">
          {[
            ['Languages', (a.primary_languages ?? []).join(', ') || '—'],
            ['Motivation', a.motivation || '—'],
            ['Sophistication', a.sophistication || '—'],
            ['Resources', a.resource_level || '—'],
          ].map(([k, v]) => (
            <div key={k} className="nw-inset p-3">
              <dt className="nw-eyebrow">{k}</dt>
              <dd className="text-[13px] text-white mt-1">{v}</dd>
            </div>
          ))}
        </dl>
        {list('Target sectors', a.target_industries)}
        {list('Target regions', a.target_regions)}
        {list('TTPs (MITRE)', a.ttps, true)}
        {list('Tooling', a.associated_tools ?? [])}
        {list('Malware', a.associated_malware ?? [])}
        {list('Tags', a.tags)}
      </div>
      <footer className="border-t border-night-700 p-4 flex gap-2">
        <button onClick={onToggle} className="btn btn-secondary flex-1">
          {a.is_active ? 'Deactivate' : 'Activate'}
        </button>
        <button onClick={onEdit} className="btn btn-secondary flex-1">
          <PencilIcon className="w-4 h-4" /> Edit
        </button>
        {isAdmin && (
          <button onClick={onDelete} className="btn btn-danger" title="Delete (admin)">
            <TrashIcon className="w-4 h-4" />
          </button>
        )}
      </footer>
    </>
  );
}

function ActorForm({ form, setForm, onCancel, onSave, mode }: any) {
  const set = (k: string, v: any) => setForm({ ...form, [k]: v });
  const arr = (k: string, v: string) =>
    set(
      k,
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
  return (
    <>
      <div className="flex-1 overflow-y-auto scrollbar p-5 space-y-4">
        <div>
          <label className="nw-label">Name *</label>
          <input
            className="input font-mono disabled:opacity-60"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            disabled={mode === 'edit'}
            title={mode === 'edit' ? 'Names are immutable (backend key)' : undefined}
          />
          {mode === 'edit' && <p className="nw-hint">Name is the identity key and cannot be renamed.</p>}
        </div>
        <div>
          <label className="nw-label">Aliases (comma-separated)</label>
          <input className="input" value={(form.aliases ?? []).join(', ')} onChange={(e) => arr('aliases', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="nw-label">Risk</label>
            <select className="input" value={form.risk_level} onChange={(e) => set('risk_level', e.target.value)}>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="nw-label">Industries (comma-separated)</label>
            <input className="input" value={(form.target_industries ?? []).join(', ')} onChange={(e) => arr('target_industries', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="nw-label">Description</label>
          <textarea className="input min-h-[72px]" value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="nw-label">Languages (comma-separated)</label>
            <input className="input" value={(form.primary_languages ?? []).join(', ')} onChange={(e) => arr('primary_languages', e.target.value)} />
          </div>
          <div>
            <label className="nw-label">Motivation</label>
            <input className="input" value={form.motivation} onChange={(e) => set('motivation', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="nw-label">TTPs (comma-separated MITRE IDs)</label>
          <input className="input font-mono" value={(form.ttps ?? []).join(', ')} onChange={(e) => arr('ttps', e.target.value)} placeholder="T1486, T1490" />
        </div>
        <div>
          <label className="nw-label">Tools (comma-separated)</label>
          <input className="input" value={(form.associated_tools ?? []).join(', ')} onChange={(e) => arr('associated_tools', e.target.value)} />
        </div>
        <div>
          <label className="nw-label">Malware (comma-separated)</label>
          <input className="input" value={(form.associated_malware ?? []).join(', ')} onChange={(e) => arr('associated_malware', e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-[13px] cursor-pointer">
          <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} className="w-4 h-4 accent-[#F0A832]" />
          Active
        </label>
      </div>
      <footer className="border-t border-night-700 p-4 flex justify-end gap-2">
        <button onClick={onCancel} className="btn btn-secondary">Cancel</button>
        <button onClick={onSave} className="btn btn-primary">{mode === 'add' ? 'Create' : 'Save'}</button>
      </footer>
    </>
  );
}
