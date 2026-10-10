import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, FileText, Trash2 } from 'lucide-react';
import Page from '../components/Page';
import { Badge, Button, Card, EmptyState, Modal, PageHeader, StatusBadge, useToast } from '../components/ui';
import { useScreenings } from '../hooks/useScreenings';
import { clearScreenings, deleteScreening } from '../services/storage';
import { candidateName, dateTime } from '../utils/format';

export default function HistoryPage() {
  const list = useScreenings(); const navigate = useNavigate(); const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const groups = list.reduce((m, r) => { const k = new Date(r.createdAt).toDateString(); (m[k] ||= []).push(r); return m; }, {});
  const label = (k) => { const d = new Date(k), t = new Date(); const diff = Math.round((new Date(t.toDateString()) - d) / 864e5); return diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }); };
  return (
    <Page>
      <PageHeader eyebrow="Audit trail" title={<>Screening <em>history.</em></>} description="Every analysis you’ve run, newest first."
        actions={list.length > 0 && <Button variant="secondary" onClick={() => setConfirm(true)}><Trash2 className="size-4" aria-hidden />Clear all</Button>} />
      {!list.length ? <Card><EmptyState icon={Clock} title="Nothing here yet" description="Completed screenings are logged here with the role and result." action={<Button as={Link} to="/app/screen">New screening</Button>} /></Card> : (
        <div className="space-y-8">
          {Object.entries(groups).map(([k, items]) => (
            <section key={k} aria-label={label(k)}><h2 className="eyebrow mb-3">{label(k)}</h2>
              <ul className="space-y-2">{items.map((r) => (
                <li key={r.id} className="card group flex flex-wrap items-center gap-x-4 gap-y-2 p-4 transition-shadow hover:shadow-lift">
                  <button onClick={() => navigate(`/app/report/${r.id}`)} className="flex min-w-0 flex-1 basis-64 items-center gap-3 text-left min-h-11">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sunken text-muted"><FileText className="size-5" aria-hidden /></span>
                    <span className="min-w-0"><span className="block truncate font-medium">{candidateName(r)} <span className="font-normal text-muted">for</span> {r.jobTitle}</span><span className="block truncate text-xs text-muted">{r.filename} · {dateTime(r.createdAt)}</span></span>
                  </button>
                  <span className="tnum text-lg font-semibold">{Math.round(r.screening.resume_job_match_score)}%</span>
                  <StatusBadge recommendation={r.screening.recommendation} />
                  {r.ml && <Badge tone="info">ML {r.ml.result.selection_probability.toFixed(0)}%</Badge>}
                  <Button variant="ghost" size="sm" aria-label={`Delete ${candidateName(r)}`} onClick={() => { deleteScreening(r.id); toast('Removed from history', 'info'); }}><Trash2 className="size-4" aria-hidden /></Button>
                </li>))}</ul></section>
          ))}
        </div>
      )}
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Clear all history?" footer={<><Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button><Button variant="danger" onClick={() => { clearScreenings(); setConfirm(false); toast('History cleared', 'info'); }}>Clear all</Button></>}><p className="text-sm text-muted">This permanently removes {list.length} screening{list.length === 1 ? '' : 's'} from this browser.</p></Modal>
    </Page>
  );
}
