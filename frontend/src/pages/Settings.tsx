import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { PageHeader, Section, EmptyState } from '../components/ui';
import { PlusIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function Settings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [newKeyword, setNewKeyword] = useState('');
  const [fullName, setFullName] = useState<string | null>(null);

  const { data: userData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => (await api.get('/v1/auth/me')).data,
  });

  const updateProfile = useMutation({
    mutationFn: async (body: any) => (await api.put('/v1/auth/me', body)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      showToast('Settings saved.', 'success');
    },
    onError: (e: any) => showToast('Save failed: ' + (e?.response?.data?.detail || e.message), 'error'),
  });

  const addKeyword = () => {
    const kw = newKeyword.trim();
    if (!kw) return;
    const cur: string[] = userData?.alert_keywords ?? [];
    if (cur.includes(kw)) {
      showToast('Keyword already exists.', 'warning');
      return;
    }
    updateProfile.mutate({ alert_keywords: [...cur, kw] });
    setNewKeyword('');
  };

  const removeKeyword = (kw: string) => {
    const cur: string[] = userData?.alert_keywords ?? [];
    updateProfile.mutate({ alert_keywords: cur.filter((k) => k !== kw) });
  };

  return (
    <div className="min-h-full">
      <PageHeader
        eyebrow="System · Preferences"
        title="Settings"
        description={<>Signed in as <span className="font-mono text-ink-100">{user?.username}</span> · role <span className="badge badge-neutral ml-1">{userData?.role ?? user?.role}</span></>}
        actions={
          <button onClick={() => refetch()} disabled={isFetching} className="btn btn-secondary">
            <ArrowPathIcon className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </button>
        }
      />

      <div className="px-6 py-5 grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-[1200px]">
        <Section title="Profile" hint="Username and email are managed by your admin.">
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-9 rounded-md bg-night-700 animate-pulse" />
              <div className="h-9 rounded-md bg-night-700 animate-pulse" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="nw-label">Username</label>
                <input className="input font-mono opacity-60" value={userData?.username ?? ''} disabled />
              </div>
              <div>
                <label className="nw-label">Email</label>
                <input className="input opacity-60" value={userData?.email ?? ''} disabled />
              </div>
              <div>
                <label className="nw-label" htmlFor="settings-fullname">Full name</label>
                <input
                  id="settings-fullname"
                  className="input"
                  defaultValue={userData?.full_name ?? ''}
                  onChange={(e) => setFullName(e.target.value)}
                  onBlur={() => {
                    if (fullName !== null && fullName !== (userData?.full_name ?? '')) {
                      updateProfile.mutate({ full_name: fullName });
                    }
                  }}
                  placeholder="Jane Analyst"
                />
                <p className="nw-hint">Saved on blur.</p>
              </div>
            </div>
          )}
        </Section>

        <Section title="Alert keywords" hint="Notified when these appear in new leaks.">
          <div className="flex gap-2">
            <input
              className="input font-mono"
              placeholder="e.g. lockbit, CVE-2024-, .onion"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addKeyword();
              }}
            />
            <button onClick={addKeyword} className="btn btn-primary flex-shrink-0" aria-label="Add keyword">
              <PlusIcon className="w-4 h-4" /> Add
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(userData?.alert_keywords ?? []).map((kw: string) => (
              <span key={kw} className="badge badge-brand !normal-case !tracking-normal font-mono">
                {kw}
                <button onClick={() => removeKeyword(kw)} className="hover:text-sev-critical ml-0.5" aria-label={`Remove ${kw}`}>
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
            {!(userData?.alert_keywords ?? []).length && (
              <p className="text-[13px] text-ink-500">No keywords yet — add one above.</p>
            )}
          </div>
        </Section>

        <Section title="Notifications" hint="Local browser preferences for this device.">
          <NotifRow id="nw-n-email" label="Email notifications" desc="Critical alerts via SMTP, if configured." defaultOn />
          <NotifRow id="nw-n-push" label="Live toasts" desc="In-app toasts for leaks and alerts." defaultOn />
          <NotifRow id="nw-n-digest" label="Daily digest" desc="One summary email per day." defaultOn={false} />
        </Section>

        <Section title="System" hint="Build and session info.">
          <dl className="divide-y divide-night-700/70">
            {[
              ['Version', 'v1.0.0'],
              ['Role', userData?.role ?? user?.role ?? '—'],
              ['Last login', userData?.last_login ? new Date(userData.last_login).toLocaleString() : '—'],
              ['API base', '/api · WS /ws'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2.5 text-[13px]">
                <dt className="text-ink-500">{k}</dt>
                <dd className="text-ink-100 font-mono">{v}</dd>
              </div>
            ))}
          </dl>
          {!(userData?.alert_keywords ?? []).length && <div className="hidden" />}
          {!userData && !isLoading && <EmptyState title="Could not load profile" hint="Retry from the header." />}
        </Section>
      </div>
    </div>
  );
}

function NotifRow({ id, label, desc, defaultOn }: { id: string; label: string; desc: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(() => {
    const saved = localStorage.getItem(id);
    return saved === null ? !!defaultOn : saved === '1';
  });
  return (
    <label className="flex items-center justify-between gap-4 py-2.5 border-b border-night-700/70 last:border-0 cursor-pointer">
      <span>
        <span className="block text-[13px] text-white font-medium">{label}</span>
        <span className="block text-[12px] text-ink-500">{desc}</span>
      </span>
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => {
          setOn(e.target.checked);
          localStorage.setItem(id, e.target.checked ? '1' : '0');
        }}
        className="w-4 h-4 accent-[#F0A832]"
        aria-label={label}
      />
    </label>
  );
}
