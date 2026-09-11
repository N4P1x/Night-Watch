import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import {
  HomeIcon,
  CircleStackIcon,
  UserGroupIcon,
  BellIcon,
  ServerStackIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

type NavItem = { name: string; href: string; icon: any; roles: string[]; kbd?: string };
type NavGroup = { label: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/', icon: HomeIcon, roles: ['admin', 'analyst', 'viewer'], kbd: 'G D' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { name: 'Leaks', href: '/leaks', icon: ServerStackIcon, roles: ['admin', 'analyst', 'viewer'], kbd: 'G L' },
      { name: 'Threat Actors', href: '/actors', icon: UserGroupIcon, roles: ['admin', 'analyst', 'viewer'], kbd: 'G A' },
      { name: 'IOCs', href: '/iocs', icon: CircleStackIcon, roles: ['admin', 'analyst', 'viewer'], kbd: 'G I' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { name: 'Sources', href: '/sources', icon: MagnifyingGlassIcon, roles: ['admin', 'analyst'], kbd: 'G S' },
      { name: 'Alerts', href: '/alerts', icon: BellIcon, roles: ['admin', 'analyst', 'viewer'], kbd: 'G E' },
    ],
  },
];

const CRUMB: Record<string, string> = {
  '/': 'Dashboard',
  '/leaks': 'Leaks',
  '/actors': 'Threat Actors',
  '/iocs': 'IOCs',
  '/sources': 'Sources',
  '/alerts': 'Alerts',
  '/settings': 'Settings',
};

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function BrandMark() {
  return (
    <span className="w-7 h-7 rounded-md bg-brand flex items-center justify-center flex-shrink-0" aria-hidden="true">
      <span className="w-3.5 h-3.5 rounded-full border-[2.5px] border-white" />
    </span>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { isConnected } = useWebSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const now = useClock();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // G+D/L/A/I/S/E quick nav, Cmd+K focuses global search input if present
  useEffect(() => {
    let g = false;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        const el = document.getElementById('nw-global-search') as HTMLInputElement | null;
        if (el) {
          e.preventDefault();
          el.focus();
        }
        return;
      }
      if (typing) return;
      if (e.key.toLowerCase() === 'g') {
        g = true;
        setTimeout(() => (g = false), 800);
        return;
      }
      if (g) {
        const map: Record<string, string> = { d: '/', l: '/leaks', a: '/actors', i: '/iocs', s: '/sources', e: '/alerts' };
        const dest = map[e.key.toLowerCase()];
        if (dest) {
          const allowed =
            (dest === '/sources' && user && ['admin', 'analyst'].includes(user.role)) || dest !== '/sources';
          if (allowed) navigate(dest);
        }
        g = false;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, user]);

  const { data: alertsData } = useQuery({
    queryKey: ['alerts', 'unread'],
    queryFn: async () => {
      const response = await api.get('/v1/alerts', { params: { is_read: false, limit: 1 } });
      return response.data;
    },
    refetchInterval: 30000,
  });
  const unreadAlerts: number = alertsData?.unread ?? alertsData?.total ?? 0;

  const crumb = CRUMB[location.pathname] ?? 'Night-Watch';

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-night-700 flex-shrink-0">
        <BrandMark />
        {!collapsed && (
          <span className="min-w-0">
            <span className="block text-[13px] font-bold tracking-[0.14em] text-white leading-4">NIGHT-WATCH</span>
            <span className="block text-[10px] font-mono text-ink-500 tracking-wider leading-4">THREAT INTEL · v1.0</span>
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar px-2.5 py-3 space-y-4" aria-label="Primary">
        {NAV.map((group) => {
          const items = group.items.filter((i) => user && i.roles.includes(user.role));
          if (items.length === 0) return null;
          return (
            <div key={group.label}>
              {!collapsed && <p className="nw-eyebrow px-2 mb-1.5">{group.label}</p>}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = location.pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        title={collapsed ? item.name : undefined}
                        aria-current={active ? 'page' : undefined}
                        className={`group relative flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium transition-colors duration-150 ${
                          active ? 'bg-white/[0.06] text-white' : 'text-ink-500 hover:text-white hover:bg-white/[0.04]'
                        }`}
                      >
                        <span
                          className={`absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full ${active ? 'bg-brand' : 'bg-transparent'}`}
                          aria-hidden="true"
                        />
                        <item.icon className="w-[18px] h-[18px] flex-shrink-0" aria-hidden="true" />
                        {!collapsed && <span className="truncate">{item.name}</span>}
                        {!collapsed && item.name === 'Alerts' && unreadAlerts > 0 && (
                          <span className="ml-auto min-w-[20px] px-1.5 py-0.5 rounded text-[11px] font-bold text-center bg-sev-critical/15 text-sev-critical border border-sev-critical/30 tabular-nums">
                            {unreadAlerts > 99 ? '99+' : unreadAlerts}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}

        {user?.role === 'admin' && (
          <div>
            {!collapsed && <p className="nw-eyebrow px-2 mb-1.5">System</p>}
            <Link
              to="/settings"
              aria-current={location.pathname === '/settings' ? 'page' : undefined}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium transition-colors duration-150 ${
                location.pathname === '/settings'
                  ? 'bg-white/[0.06] text-white'
                  : 'text-ink-500 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Cog6ToothIcon className="w-[18px] h-[18px] flex-shrink-0" aria-hidden="true" />
              {!collapsed && 'Settings'}
            </Link>
          </div>
        )}
      </nav>

      <div className="border-t border-night-700 p-2.5 flex-shrink-0">
        <div className={`flex items-center gap-2.5 px-2 py-1.5 ${collapsed ? 'justify-center' : ''}`}>
          <span className="w-7 h-7 rounded-full bg-night-700 border border-night-600 flex items-center justify-center text-[11px] font-bold text-ink-100 flex-shrink-0" aria-hidden="true">
            {(user?.username ?? '?').slice(0, 1).toUpperCase()}
          </span>
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-semibold text-white truncate">{user?.username}</span>
              <span className="block text-[11px] text-ink-500 truncate">
                {user?.role} · {user?.email}
              </span>
            </span>
          )}
          {!collapsed && (
            <button onClick={logout} title="Sign out" aria-label="Sign out" className="p-1.5 rounded-md text-ink-500 hover:text-sev-critical hover:bg-sev-critical/10 transition-colors duration-150">
              <ArrowRightOnRectangleIcon className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
        {collapsed && (
          <button onClick={logout} title="Sign out" aria-label="Sign out" className="mt-1 w-full flex justify-center p-1.5 rounded-md text-ink-500 hover:text-sev-critical hover:bg-sev-critical/10">
            <ArrowRightOnRectangleIcon className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-night-950">
      <a href="#nw-main" className="nw-skip">
        Skip to content
      </a>
      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col flex-shrink-0 bg-night-900 border-r border-night-700 transition-colors duration-150 ${collapsed ? 'w-[60px]' : 'w-[232px]'}`}>
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[280px] bg-night-900 border-r border-night-700 animate-fade-in overscroll-contain" aria-label="Menu">
            <div className="flex justify-end p-2">
              <button onClick={() => setMobileOpen(false)} className="btn-ghost btn !px-2" aria-label="Close menu">
                <XMarkIcon className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="h-[calc(100%-48px)]">{sidebar}</div>
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top command bar */}
        <header className="h-14 flex items-center gap-3 px-4 border-b border-night-700 bg-night-900/80 backdrop-blur sticky top-0 z-40">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden btn-ghost btn !px-2" aria-label="Open menu">
            <Bars3Icon className="w-5 h-5" aria-hidden="true" />
          </button>
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="hidden lg:inline-flex btn-ghost btn !px-2"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Bars3Icon className="w-5 h-5" aria-hidden="true" />
          </button>

          <nav className="flex items-center gap-1.5 text-[12.5px] min-w-0" aria-label="Breadcrumb">
            <span className="text-ink-500">Night-Watch</span>
            <ChevronRightIcon className="w-3.5 h-3.5 text-ink-500" aria-hidden="true" />
            <span className="text-white font-semibold truncate">{crumb}</span>
          </nav>

          <div className="ml-auto flex items-center gap-2.5">
            <label className="hidden md:flex items-center gap-2 nw-inset px-2.5 py-1.5 w-56 focus-within:border-brand/50" htmlFor="nw-global-search">
              <MagnifyingGlassIcon className="w-4 h-4 text-ink-500" aria-hidden="true" />
              <span className="sr-only">Search leaks</span>
              <input
                id="nw-global-search"
                placeholder="Search leaks… (⌘K)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate(`/leaks?q=${encodeURIComponent((e.target as HTMLInputElement).value)}`);
                }}
                className="bg-transparent outline-none text-[12.5px] w-full placeholder:text-ink-500"
              />
            </label>

            <span className="hidden xl:inline font-mono text-[12px] text-ink-500 tabular-nums">
              {new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC' }).format(now)}Z
            </span>

            <span
              title={isConnected ? 'Live channel connected' : 'Live channel reconnecting'}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-night-700 bg-night-950 text-[11.5px] font-semibold"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-sev-low' : 'bg-sev-medium animate-pulse'}`} aria-hidden="true" />
              <span className={isConnected ? 'text-sev-low' : 'text-sev-medium'}>{isConnected ? 'LIVE' : 'RETRY'}</span>
            </span>

            <Link
              to="/alerts"
              className="relative p-2 rounded-md text-ink-500 hover:text-white hover:bg-white/5"
              title="Alerts"
              aria-label={unreadAlerts > 0 ? `Alerts, ${unreadAlerts} unread` : 'Alerts'}
            >
              <BellIcon className="w-[18px] h-[18px]" aria-hidden="true" />
              {unreadAlerts > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] px-1 rounded-full bg-sev-critical text-white text-[10px] font-bold text-center tabular-nums">
                  {unreadAlerts > 99 ? '99+' : unreadAlerts}
                </span>
              )}
            </Link>

            <span className="badge-neutral badge">{user?.role}</span>
          </div>
        </header>

        <main id="nw-main" className="flex-1 min-w-0 overflow-auto scrollbar">
          <Outlet />
        </main>

        <footer className="border-t border-night-700 px-4 py-2 flex items-center gap-3 text-[11px] font-mono text-ink-500">
          <span>NIGHT-WATCH v1.0</span>
          <span aria-hidden="true">·</span>
          <span>{isConnected ? 'channel: live' : 'channel: retrying'}</span>
          <span className="ml-auto hidden sm:inline">G+D dashboard · G+L leaks · G+A actors · G+I iocs · ⌘K search</span>
        </footer>
      </div>
    </div>
  );
}
