import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CircleGauge, FileUp, Plus, ScanSearch, Sparkles, Target, Users } from 'lucide-react';
import Page from '../components/Page';
import { Button, Card, EmptyState, PageHeader, PipelineBadge, ProgressBar, SectionHeader, Stat, StatusBadge } from '../components/ui';
import { ActivityChart, ColumnChart, RankBars } from '../charts/Charts';
import { useScreenings } from '../hooks/useScreenings';
import { summarize } from '../utils/analytics';
import { candidateName, skillLabel, timeAgo } from '../utils/format';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

function FirstRun() {
  return (
    <Card className="on-dark relative overflow-hidden border-0 bg-ink p-8 text-white sm:p-12">
      <div className="dot-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_80%_20%,black,transparent_70%)]" aria-hidden />
      <div className="relative grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <div className="eyebrow !text-lime">Your workspace is empty</div>
          <h2 className="display mt-3 text-4xl leading-[1.05] sm:text-5xl">Screen your first candidate to light this up.</h2>
          <p className="mt-4 max-w-lg text-white/60">Match scores, activity, skill demand and gap analysis appear here as you screen — computed from real results, never placeholder data.</p>
          <Button as={Link} to="/app/screen" variant="accent" size="lg" className="mt-7"><Plus className="size-4" aria-hidden />New screening</Button>
        </div>
        <ol className="space-y-3">
          {[[FileUp, 'Upload a resume', 'PDF or DOCX, up to 5 MB'], [Target, 'Describe the role', 'Paste the job description'], [ScanSearch, 'Read the report', 'Scores, gaps and reasons']].map(([I, t, d], i) => (
            <li key={t} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4"><span className="grid size-10 place-items-center rounded-xl bg-lime text-ink"><I className="size-5" aria-hidden /></span><div><div className="text-sm font-medium">{i + 1}. {t}</div><div className="text-xs text-white/45">{d}</div></div></li>
          ))}
        </ol>
      </div>
    </Card>
  );
}

export default function Overview() {
  const list = useScreenings();
  const navigate = useNavigate();
  const s = summarize(list);
  return (
    <Page>
      <PageHeader eyebrow="Hiring intelligence" title={<>{greeting()}, <em>Recruiter.</em></>}
        description={list.length ? 'Here’s where your screening pipeline stands.' : 'Let’s find your next hire.'}
        actions={<Button as={Link} to="/app/screen" variant="primary"><Plus className="size-4" aria-hidden />New screening</Button>} />
      {!list.length ? <FirstRun /> : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat label="Candidates screened" value={s.total} icon={Users} className="col-span-2 lg:col-span-1" />
            <Stat label="Strong matches" value={s.strong} tone="ok" hint="Score ≥ 80%" />
            <Stat label="Moderate" value={s.moderate} tone="warn" hint="60–79%" />
            <Stat label="Weak" value={s.weak} tone="bad" hint="Below 60%" />
            <Stat label="Avg match score" value={`${s.avg.toFixed(0)}%`} icon={CircleGauge} className="col-span-2 lg:col-span-1" />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="p-5 sm:p-6 lg:col-span-2"><SectionHeader eyebrow="Screening activity" title="Last 14 days" /><div className="mt-4"><ActivityChart data={s.days} label="Screenings per day over the last 14 days" /></div></Card>
            <Card className="p-5 sm:p-6"><SectionHeader eyebrow="Candidate quality" title="Match score distribution" /><div className="mt-4"><ColumnChart data={s.bins} x="range" colors={['#c23a3a', '#d4504a', '#c98a1a', '#7bb26a', '#17935a']} label="Distribution of match scores" /></div></Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="p-5 sm:p-6">
              <SectionHeader eyebrow="Candidate pipeline" title="Where candidates stand" />
              <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-sunken" role="img" aria-label="Pipeline status split">
                {[['new', '#8f968d'], ['shortlisted', '#17935a'], ['rejected', '#c23a3a']].map(([k, c]) => s.byStatus[k] ? <div key={k} style={{ width: `${(s.byStatus[k] / s.total) * 100}%`, background: c }} /> : null)}
              </div>
              <ul className="mt-5 space-y-2.5 text-sm">{[['new', '#8f968d', 'New'], ['shortlisted', '#17935a', 'Shortlisted'], ['rejected', '#c23a3a', 'Rejected']].map(([k, c, l]) => <li key={k} className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="size-2.5 rounded-sm" style={{ background: c }} aria-hidden />{l}</span><span className="tnum font-medium">{s.byStatus[k] || 0}</span></li>)}</ul>
              <p className="mt-4 border-t border-line pt-3 text-xs text-muted">Status is set by you on each candidate report.</p>
            </Card>
            <Card className="p-5 sm:p-6"><SectionHeader eyebrow="Skill demand" title="Most requested skills" /><div className="mt-5"><RankBars rows={s.demand.slice(0, 6).map(([k, n]) => [skillLabel(k), n])} /></div></Card>
            <Card className="p-5 sm:p-6"><SectionHeader eyebrow="Experience mix" title="Candidate experience" /><div className="mt-4"><ColumnChart data={s.expBins} x="label" height={190} label="Distribution of candidate experience" /></div></Card>
          </div>

          <Card>
            <div className="flex items-center justify-between p-5 pb-3 sm:p-6 sm:pb-3"><SectionHeader eyebrow="Recent screening activity" title="Latest reports" /><Link to="/app/history" className="inline-flex items-center gap-1 text-sm font-medium text-text hover:underline">View all<ArrowRight className="size-3.5" aria-hidden /></Link></div>
            <ul className="divide-y divide-line/70">
              {list.slice(0, 5).map((r) => (
                <li key={r.id}><button onClick={() => navigate(`/app/report/${r.id}`)} className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-sunken/60 sm:px-6 min-h-16">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-sm font-semibold text-lime">{candidateName(r).charAt(0).toUpperCase()}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium">{candidateName(r)}</span><span className="block truncate text-xs text-muted">{r.jobTitle} · {timeAgo(r.createdAt)}</span></span>
                  <span className="hidden w-32 sm:block"><ProgressBar value={r.screening.resume_job_match_score} tone={r.screening.recommendation === 'Strong Match' ? 'ok' : r.screening.recommendation === 'Moderate Match' ? 'warn' : 'bad'} /></span>
                  <span className="tnum w-12 text-right font-semibold">{Math.round(r.screening.resume_job_match_score)}%</span>
                  <span className="hidden sm:block"><StatusBadge recommendation={r.screening.recommendation} /></span>
                  <PipelineBadge status={r.status} />
                </button></li>
              ))}
            </ul>
          </Card>
          <p className="flex items-center gap-2 text-xs text-muted"><Sparkles className="size-3.5" aria-hidden />All figures are computed from your {s.total} stored screening{s.total === 1 ? '' : 's'} in this browser.</p>
        </div>
      )}
    </Page>
  );
}
