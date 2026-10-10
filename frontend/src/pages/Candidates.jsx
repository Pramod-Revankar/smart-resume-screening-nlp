import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Users } from 'lucide-react';
import Page from '../components/Page';
import { Button, Card, DataTable, EmptyState, Input, PageHeader, PipelineBadge, ProgressBar, StatusBadge, cn } from '../components/ui';
import { useScreenings } from '../hooks/useScreenings';
import { candidateName, dateShort, toneOf } from '../utils/format';

const FILTERS = [['all', 'All'], ['Strong Match', 'Strong'], ['Moderate Match', 'Moderate'], ['Weak Match', 'Weak']];

export default function Candidates() {
  const list = useScreenings(); const navigate = useNavigate();
  const [q, setQ] = useState(''); const [f, setF] = useState('all');
  const rows = useMemo(() => list.filter((r) => (f === 'all' || r.screening.recommendation === f) && (`${candidateName(r)} ${r.jobTitle} ${r.screening.resume_analysis.candidate.email || ''}`).toLowerCase().includes(q.toLowerCase())), [list, q, f]);
  const columns = [
    { key: 'name', header: 'Candidate', sort: (r) => candidateName(r).toLowerCase(), render: (r) => <div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-sm font-semibold text-lime">{candidateName(r).charAt(0).toUpperCase()}</span><div className="min-w-0"><div className="truncate font-medium">{candidateName(r)}</div><div className="truncate text-xs text-muted">{r.screening.resume_analysis.candidate.email || r.filename}</div></div></div> },
    { key: 'role', header: 'Role', sort: (r) => r.jobTitle, render: (r) => <span className="text-muted">{r.jobTitle}</span> },
    { key: 'score', header: 'Match', sort: (r) => r.screening.resume_job_match_score, render: (r) => <div className="flex w-36 items-center gap-3"><ProgressBar value={r.screening.resume_job_match_score} tone={toneOf(r.screening.recommendation)} /><span className="tnum w-10 text-right font-semibold">{Math.round(r.screening.resume_job_match_score)}%</span></div> },
    { key: 'rec', header: 'Decision', render: (r) => <StatusBadge recommendation={r.screening.recommendation} /> },
    { key: 'ml', header: 'ML probability', sort: (r) => r.ml?.result.selection_probability ?? -1, render: (r) => r.ml ? <span className="tnum">{r.ml.result.selection_probability.toFixed(0)}%</span> : <span className="text-subtle">—</span> },
    { key: 'status', header: 'Status', render: (r) => <PipelineBadge status={r.status} /> },
    { key: 'date', header: 'Screened', sort: (r) => r.createdAt, align: 'right', render: (r) => <span className="text-muted">{dateShort(r.createdAt)}</span> },
  ];
  return (
    <Page>
      <PageHeader eyebrow="Candidate directory" title={<>Candidates<em>.</em></>} description="Everyone you’ve screened, ranked by Resume–Job Match." actions={<Button as={Link} to="/app/screen"><Plus className="size-4" aria-hidden />New screening</Button>} />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="relative min-w-52 flex-1"><Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden /><Input aria-label="Search candidates" placeholder="Search name, role or email…" value={q} onChange={(e) => setQ(e.target.value)} className="!h-10 pl-10" /></div>
          <div className="flex gap-1 rounded-xl bg-sunken p-1" role="group" aria-label="Filter by decision">{FILTERS.map(([v, l]) => <button key={v} onClick={() => setF(v)} aria-pressed={f === v} className={cn('rounded-lg px-3 py-1.5 text-[13px] font-medium min-h-8', f === v ? 'bg-surface shadow-card' : 'text-muted hover:text-text')}>{l}</button>)}</div>
        </div>
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => navigate(`/app/report/${r.id}`)} defaultSort={{ key: 'date', dir: 'desc' }}
          empty={<EmptyState icon={Users} title={list.length ? 'No candidates match' : 'No candidates yet'} description={list.length ? 'Try a different search or filter.' : 'Screen a resume and the candidate will appear here.'} action={!list.length && <Button as={Link} to="/app/screen">New screening</Button>} />}
          renderCard={(r) => <div className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink font-semibold text-lime">{candidateName(r).charAt(0).toUpperCase()}</span><div className="min-w-0 flex-1"><div className="truncate font-medium">{candidateName(r)}</div><div className="truncate text-xs text-muted">{r.jobTitle}</div><div className="mt-1.5 flex flex-wrap items-center gap-1.5"><StatusBadge recommendation={r.screening.recommendation} /><PipelineBadge status={r.status} /></div></div><span className="tnum text-xl font-semibold">{Math.round(r.screening.resume_job_match_score)}%</span></div>} />
      </Card>
    </Page>
  );
}
