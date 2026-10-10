import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, Brain, FolderKanban, History, LayoutGrid, Menu, Plus, Settings, Users, X } from 'lucide-react';
import { Logo } from '../components/Brand';
import { Button, Tooltip, cn } from '../components/ui';
import { useHealth } from '../hooks/useHealth';
import { useScreenings } from '../hooks/useScreenings';

const NAV = [
  { group: 'Workspace', items: [
    { to: '/app', label: 'Overview', icon: LayoutGrid, end: true },
    { to: '/app/screen', label: 'New screening', icon: Plus },
    { to: '/app/candidates', label: 'Candidates', icon: Users, count: true },
    { to: '/app/history', label: 'History', icon: History },
    { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  ] },
  { group: 'Management', items: [
    { to: '/app/model', label: 'Model card', icon: Brain },
    { to: '/app/settings', label: 'Settings', icon: Settings },
  ] },
];

function Nav({ onNavigate }) {
  const total = useScreenings().length;
  return (
    <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3 py-2 scroll-thin">
      {NAV.map((g) => (
        <div key={g.group} className="mb-6">
          <div className="eyebrow mb-2 px-3 !text-white/35">{g.group}</div>
          <ul className="space-y-0.5">
            {g.items.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} end={n.end} onClick={onNavigate}
                  className={({ isActive }) => cn('group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-11', isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white')}>
                  {({ isActive }) => (<>
                    {isActive && <motion.span layoutId="nav-active" className="absolute -left-3 top-2 bottom-2 w-1 rounded-r bg-lime" />}
                    <n.icon className={cn('size-[18px]', isActive ? 'text-lime' : 'text-white/45 group-hover:text-white/80')} aria-hidden />
                    <span className="flex-1">{n.label}</span>
                    {n.count && total > 0 && <span className="tnum rounded-md bg-white/10 px-1.5 text-[11px] text-white/70">{total}</span>}
                  </>)}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function ApiStatus({ compact }) {
  const online = useHealth();
  const [label, dot] = online === null ? ['Checking API…', 'bg-white/30'] : online ? ['API online', 'bg-[#4ade80]'] : ['API offline', 'bg-[#ff6b61]'];
  return (
    <Tooltip text={online === false ? 'Start the FastAPI backend (see README)' : 'FastAPI backend connection'}>
      <span className={cn('inline-flex items-center gap-2 text-xs', compact ? 'text-muted' : 'text-white/60')} role="status">
        <span className={cn('size-2 rounded-full', online === false ? (compact ? 'bg-bad' : dot) : online ? (compact ? 'bg-ok' : dot) : dot, online && 'shadow-[0_0_0_3px_rgb(74_222_128/0.2)]')} aria-hidden />{label}
      </span>
    </Tooltip>
  );
}

const TITLES = { '/app': 'Overview', '/app/screen': 'New screening', '/app/candidates': 'Candidates', '/app/history': 'Screening history', '/app/analytics': 'Analytics', '/app/model': 'Model card', '/app/settings': 'Settings' };

export default function WorkspaceLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => { setOpen(false); window.scrollTo({ top: 0 }); }, [pathname]);
  useEffect(() => {
    const onKey = (e) => { if ((e.key === 'n' || e.key === 'N') && !e.metaKey && !e.ctrlKey && !/input|textarea|select/i.test(e.target.tagName) && !e.target.isContentEditable) navigate('/app/screen'); };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);
  const title = TITLES[pathname] || (pathname.startsWith('/app/report') ? 'Candidate report' : 'Workspace');

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-ink focus:px-3 focus:py-2 focus:text-white">Skip to content</a>
      {/* Desktop sidebar */}
      <aside className="on-dark no-print sticky top-0 hidden h-dvh flex-col bg-ink lg:flex">
        <div className="px-5 pb-4 pt-6"><Logo to="/" dark /></div>
        <div className="px-4 pb-4"><Button as={NavLink} to="/app/screen" variant="accent" className="w-full"><Plus className="size-4" aria-hidden />New screening<kbd className="ml-auto rounded bg-ink/10 px-1.5 font-mono text-[10px]">N</kbd></Button></div>
        <Nav />
        <div className="border-t border-white/10 p-5"><ApiStatus /></div>
      </aside>

      {/* Mobile top bar */}
      <header className="no-print sticky top-0 z-40 flex items-center justify-between border-b border-line bg-paper/90 px-4 py-2.5 backdrop-blur lg:hidden pt-[max(0.625rem,env(safe-area-inset-top))]">
        <button onClick={() => setOpen(true)} aria-label="Open navigation" aria-expanded={open} className="grid size-11 place-items-center rounded-xl text-ink hover:bg-sunken"><Menu className="size-5" /></button>
        <Logo to="/app" />
        <Button as={NavLink} to="/app/screen" variant="primary" size="sm" aria-label="New screening" className="size-11 !p-0 rounded-xl"><Plus className="size-5" /></Button>
      </header>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[60] lg:hidden on-dark">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-ink/60" onClick={() => setOpen(false)} aria-hidden />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 32, stiffness: 320 }} className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-ink pt-[env(safe-area-inset-top)]" role="dialog" aria-modal="true" aria-label="Navigation">
              <div className="flex items-center justify-between px-5 pb-3 pt-5"><Logo to="/" dark /><button onClick={() => setOpen(false)} aria-label="Close navigation" className="grid size-10 place-items-center rounded-lg text-white/70 hover:bg-white/10"><X className="size-5" /></button></div>
              <Nav onNavigate={() => setOpen(false)} />
              <div className="border-t border-white/10 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"><ApiStatus /></div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="min-w-0">
        <div className="no-print hidden items-center justify-between border-b border-line px-8 py-3 lg:flex">
          <div className="flex items-center gap-2 text-sm"><FolderKanban className="size-4 text-subtle" aria-hidden /><span className="text-muted">Recruiter workspace</span><span className="text-line-strong">/</span><span className="font-medium">{title}</span></div>
          <ApiStatus compact />
        </div>
        <div id="main" tabIndex={-1} className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 pb-[max(2rem,env(safe-area-inset-bottom))]"><Outlet /></div>
      </div>
    </div>
  );
}
