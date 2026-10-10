import { useState } from 'react';
import { Download, Server, Trash2 } from 'lucide-react';
import Page from '../components/Page';
import { Badge, Button, Card, Modal, PageHeader, SectionHeader, useToast } from '../components/ui';
import { useHealth } from '../hooks/useHealth';
import { useScreenings } from '../hooks/useScreenings';
import { API_BASE_URL } from '../services/api';
import { clearScreenings } from '../services/storage';

export default function SettingsPage() {
  const online = useHealth(); const list = useScreenings(); const toast = useToast(); const [confirm, setConfirm] = useState(false);
  const exportJson = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `screenings-${new Date().toISOString().slice(0, 10)}.json` }); a.click(); URL.revokeObjectURL(url);
  };
  return (
    <Page>
      <PageHeader eyebrow="Management" title={<>Settings<em>.</em></>} description="Connection, data and keyboard shortcuts." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6"><SectionHeader eyebrow="Connection" title="Screening API" />
          <dl className="mt-5 space-y-4 text-sm"><div className="flex items-center justify-between gap-4"><dt className="text-muted">Base URL</dt><dd className="truncate font-mono text-[13px]">{API_BASE_URL}</dd></div>
            <div className="flex items-center justify-between"><dt className="text-muted">Status</dt><dd>{online === null ? <Badge>Checking…</Badge> : online ? <Badge tone="ok">Online</Badge> : <Badge tone="bad">Offline</Badge>}</dd></div></dl>
          <p className="mt-5 flex gap-2 border-t border-line pt-4 text-xs text-muted"><Server className="mt-0.5 size-3.5 shrink-0" aria-hidden />Change it with <code className="rounded bg-sunken px-1">VITE_API_BASE_URL</code> in <code className="rounded bg-sunken px-1">frontend/.env</code> and restart Vite.</p></Card>
        <Card className="p-6"><SectionHeader eyebrow="Your data" title="Stored in this browser" description="The API is stateless. Screenings, statuses and notes live only in this browser’s local storage." />
          <p className="tnum mt-5 text-3xl font-semibold">{list.length}<span className="ml-2 text-sm font-normal text-muted">saved screening{list.length === 1 ? '' : 's'}</span></p>
          <div className="mt-5 flex flex-wrap gap-2"><Button variant="secondary" onClick={exportJson} disabled={!list.length}><Download className="size-4" aria-hidden />Export JSON</Button><Button variant="secondary" onClick={() => setConfirm(true)} disabled={!list.length}><Trash2 className="size-4" aria-hidden />Delete all data</Button></div></Card>
        <Card className="p-6 lg:col-span-2"><SectionHeader eyebrow="Keyboard" title="Shortcuts" />
          <ul className="mt-4 grid gap-3 text-sm sm:grid-cols-2">{[['N', 'Start a new screening'], ['Esc', 'Close dialogs and panels'], ['Tab', 'Move through controls'], ['Enter', 'Open the selected candidate row']].map(([k, d]) => <li key={k} className="flex items-center gap-3"><kbd className="min-w-9 rounded-lg border border-line-strong bg-sunken px-2 py-1 text-center font-mono text-xs">{k}</kbd><span className="text-muted">{d}</span></li>)}</ul></Card>
      </div>
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Delete all stored data?" footer={<><Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button><Button variant="danger" onClick={() => { clearScreenings(); setConfirm(false); toast('All data deleted', 'info'); }}>Delete</Button></>}><p className="text-sm text-muted">This removes every saved screening from this browser.</p></Modal>
    </Page>
  );
}
