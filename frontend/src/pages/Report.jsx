import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Briefcase, Check, ChevronDown, Download, ExternalLink, FileText, FolderGit2, GraduationCap, Mail, Phone, Plus, RefreshCw, Sparkles, X, Github, Linkedin, Award, Trash2 } from 'lucide-react';
import Page from '../components/Page';
import MLPanel from '../components/report/MLPanel';
import { Badge, Button, Card, EmptyState, ProgressBar, ScoreRing, SectionHeader, Select, SkillBadge, StatusBadge, Textarea, Timeline, PIPELINE_OPTIONS, cn, useToast, Modal } from '../components/ui';
import { useScreening } from '../hooks/useScreenings';
import { deleteScreening, updateScreening } from '../services/storage';
import { candidateName, dateTime, months, skillLabel, toneOf, toneOfScore } from '../utils/format';

const STRENGTH = { strong: ['Strong evidence', 100, 'ok'], good: ['Good evidence', 66, 'info'], listed: ['Listed only', 33, 'neutral'] };
const stagger = (i) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.08 * i, duration: 0.5, ease: [0.2, 0.7, 0.2, 1] } });

function Header({ rec, s, a }) {
  const score = s.resume_job_match_score, tone = toneOf(s.recommendation);
  const ringTone = { ok: 'lime', warn: 'warn', bad: 'bad' }[tone];
  const parts = [['Skills', s.skill_match.match_score, s.weights.skills], ['Experience', s.experience_match.experience_match_score, s.weights.experience], ['Education', s.education_match.education_match_score, s.weights.education]];
  return (
    <motion.section {...stagger(0)} className="on-dark relative isolate overflow-hidden rounded-3xl bg-ink p-6 text-white sm:p-9" aria-label="Candidate summary">
      <div className="dot-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_85%_0%,black,transparent_65%)]" aria-hidden />
      <div className="grid gap-8 lg:grid-cols-[auto_1fr_1fr] lg:items-center lg:gap-12">
        <div className="flex justify-center lg:justify-start"><ScoreRing value={score} size={196} stroke={14} tone={ringTone} label="Resume–Job Match" sublabel="Resume match" /></div>
        <div className="min-w-0 text-center lg:text-left">
          <div className="eyebrow !text-lime">Candidate intelligence</div>
          <h1 className="display mt-2 break-words text-[2.5rem] leading-[1.02] sm:text-5xl">{candidateName(rec)}</h1>
          <p className="mt-2 text-white/60">{rec.jobTitle} · {rec.requiredDegree} · {rec.requiredExperienceYears}+ yrs</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
            <span className={cn('inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]', { ok: 'bg-lime text-ink', warn: 'bg-[#f3d58a] text-ink', bad: 'bg-[#f1a49d] text-ink' }[tone])}>{s.recommendation}</span>
            <span className="text-xs text-white/40">{dateTime(rec.createdAt)}</span>
          </div>
        </div>
        <div className="space-y-4" aria-label="Match breakdown">
          <div className="eyebrow !text-white/45">Match breakdown</div>
          {parts.map(([l, v, w], i) => (
            <div key={l}><div className="mb-1.5 flex items-baseline justify-between text-sm"><span>{l} <span className="text-xs text-white/35">· weight {Math.round(w * 100)}%</span></span><span className="tnum font-medium">{v % 1 ? v.toFixed(1) : v}%</span></div>
              <ProgressBar value={v} tone={v >= 80 ? 'lime' : v >= 50 ? 'warn' : 'bad'} track="bg-white/10" height="h-2" delay={0.3 + i * 0.12} /></div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function Decision({ s }) {
  const d = s.decision, tone = toneOf(d.label);
  return (
    <Card className="p-5 sm:p-6" aria-labelledby="dec">
      <div className="eyebrow">Screening decision</div>
      <div className="mt-2 flex flex-wrap items-center gap-3"><h2 id="dec" className={cn('display text-4xl', { ok: 'text-ok', warn: 'text-warn', bad: 'text-bad' }[tone])}>{d.label.toUpperCase()}</h2><span className="text-xs text-muted">Resume–Job Match only — the ML score is separate.</span></div>
      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        <div><div className="eyebrow mb-2.5">Primary reasons</div>{d.primary_reasons.length ? <ul className="space-y-2.5">{d.primary_reasons.map((r) => <li key={r} className="flex gap-2.5 text-sm"><X className="mt-0.5 size-4 shrink-0 text-bad" aria-hidden />{r}</li>)}</ul> : <p className="flex gap-2 text-sm text-muted"><Check className="size-4 text-ok" aria-hidden />No gaps against the stated requirements.</p>}</div>
        <div><div className="eyebrow mb-2.5">Positive signals</div>{d.positive_signals.length ? <ul className="space-y-2.5">{d.positive_signals.map((r) => <li key={r} className="flex gap-2.5 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden />{r}</li>)}</ul> : <p className="text-sm text-muted">No positive signals were detected.</p>}</div>
      </div>
    </Card>
  );
}

function Insights({ s, a }) {
  const ev = a.skill_evidence;
  const strengths = [...s.skill_match.matched_skills.map((k) => skillLabel(k)), ...(s.education_match.education_match ? [s.education_match.matched_degree] : [])];
  const gaps = [...s.skill_match.missing_skills.map(skillLabel)];
  const em = s.experience_match;
  if (em.experience_match_score < 100) gaps.push('Experience below requirement');
  const extra = Object.keys(ev).filter((k) => !s.job_skills.includes(k) && ev[k].strength !== 'listed').slice(0, 6).map(skillLabel);
  return (
    <Card className="p-5 sm:p-6" aria-labelledby="ins">
      <div className="flex items-center gap-2"><Sparkles className="size-4 text-lime-deep" aria-hidden /><div className="eyebrow">AI screening insights</div></div>
      <h2 id="ins" className="sr-only">AI screening insights</h2>
      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        <div><div className="mb-2.5 text-sm font-semibold text-ok">Strengths</div><ul className="space-y-2">{strengths.length ? strengths.map((x) => <li key={x} className="flex items-center gap-2 text-sm"><Check className="size-4 text-ok" aria-hidden />{x}</li>) : <li className="text-sm text-muted">None matched the requirements.</li>}</ul>
          {extra.length > 0 && <p className="mt-3 text-xs text-muted">Also well evidenced: {extra.join(', ')}</p>}</div>
        <div><div className="mb-2.5 text-sm font-semibold text-bad">Gaps</div><ul className="space-y-2">{gaps.length ? gaps.map((x) => <li key={x} className="flex items-center gap-2 text-sm"><X className="size-4 text-bad" aria-hidden />{x}</li>) : <li className="text-sm text-muted">No gaps found.</li>}</ul></div>
      </div>
    </Card>
  );
}

function Comparison({ s, a }) {
  const em = s.experience_match, ed = s.education_match;
  const Row = ({ req, children, ok }) => (
    <div role="row" className="grid grid-cols-[1fr_1fr] items-center gap-4 border-b border-line/70 px-4 py-3 text-sm last:border-0 sm:px-6"><span role="cell" className="font-medium">{req}</span><span role="cell" className="flex items-center gap-2">{ok !== undefined && (ok ? <Check className="size-4 shrink-0 text-ok" aria-hidden /> : <X className="size-4 shrink-0 text-bad" aria-hidden />)}<span className={ok === false ? 'text-bad' : ''}>{children}</span></span></div>
  );
  return (
    <Card aria-labelledby="cmp">
      <div className="p-5 pb-3 sm:p-6 sm:pb-3"><SectionHeader eyebrow="Requirement comparison" title="Job requirement vs candidate" /><h2 id="cmp" className="sr-only">Requirement comparison</h2></div>
      <div role="table" aria-label="Requirements versus candidate">
        <div role="row" className="grid grid-cols-2 gap-4 border-y border-line bg-sunken/60 px-4 py-2 sm:px-6"><span role="columnheader" className="eyebrow">Job requirement</span><span role="columnheader" className="eyebrow">Candidate</span></div>
        {s.skill_match.details.map((d) => <Row key={d.skill} req={skillLabel(d.skill)} ok={d.matched}>{d.matched ? (STRENGTH[d.strength]?.[0] || 'Found') : 'Not found'}</Row>)}
        {!s.skill_match.details.length && <p className="px-6 py-4 text-sm text-muted">No recognisable skills were found in the job description.</p>}
        <Row req={<>Experience<div className="text-xs font-normal text-muted">{em.required_experience_years} yrs required</div></>} ok={em.experience_match_score >= 100}>{months(em.resume_experience_months)}</Row>
        <Row req={<>Education<div className="text-xs font-normal text-muted">{ed.required_degree.toUpperCase()}</div></>} ok={ed.education_match}>{ed.education_match ? ed.note : 'Required degree not found'}</Row>
      </div>
    </Card>
  );
}

function Skills({ s, a }) {
  const [all, setAll] = useState(false);
  const ev = a.skill_evidence;
  const req = s.job_skills.map((k) => ({ k, found: a.skills.includes(k), e: ev[k] }));
  const others = Object.keys(ev).filter((k) => !s.job_skills.includes(k));
  const Bar = ({ k, found, e }) => {
    const [label, v, tone] = found ? STRENGTH[e?.strength] || ['Found', 50, 'ink'] : ['Missing', 0, 'bad'];
    return (
      <li className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 sm:grid-cols-[10rem_1fr_11rem]"><span className="truncate text-sm font-medium">{skillLabel(k)}</span>
        <div className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto"><ProgressBar value={found ? v : 0} tone={tone === 'neutral' ? 'neutral' : tone === 'ok' ? 'ok' : tone === 'info' ? 'info' : 'bad'} /></div>
        <span className={cn('col-start-2 row-start-1 text-right text-xs sm:col-start-auto sm:row-start-auto', found ? 'text-muted' : 'font-medium text-bad')}>{label}{e?.implied_from ? ` (via ${skillLabel(e.implied_from)})` : ''}</span></li>
    );
  };
  return (
    <Card className="p-5 sm:p-6" aria-labelledby="sk">
      <SectionHeader eyebrow="Skill visualization" title="Required skills & evidence" description="Evidence strength reflects where and how often a skill appears in the resume (projects and experience count most) — it is not a proficiency test." />
      <h2 id="sk" className="sr-only">Skills</h2>
      <ul className="mt-5 space-y-3.5">{req.map((r) => <Bar key={r.k} {...r} />)}</ul>
      {!req.length && <p className="mt-4 text-sm text-muted">The job description did not mention any recognised skills.</p>}
      {others.length > 0 && (
        <div className="mt-6 border-t border-line pt-4">
          <button onClick={() => setAll(!all)} aria-expanded={all} className="flex w-full items-center justify-between text-sm font-medium"><span>Other skills found on the resume <span className="text-muted">({others.length})</span></span><ChevronDown className={cn('size-4 transition-transform', all && 'rotate-180')} aria-hidden /></button>
          {all && <div className="mt-3 flex flex-wrap gap-2">{others.map((k) => <SkillBadge key={k}>{skillLabel(k)}</SkillBadge>)}</div>}
        </div>
      )}
    </Card>
  );
}

function ExperienceCard({ s, a }) {
  const em = s.experience_match, cand = em.resume_experience_months, req = em.required_experience_years * 12, gap = Math.max(0, req - cand);
  const maxv = Math.max(cand, req, 1);
  const entries = a.experience.entries;
  return (
    <Card className="p-5 sm:p-6" aria-labelledby="exp">
      <SectionHeader eyebrow="Experience" title="Candidate vs requirement" /><h2 id="exp" className="sr-only">Experience</h2>
      <div className="mt-5 space-y-4">
        {[['Candidate experience', cand, cand >= req ? 'ok' : 'warn'], ['Required experience', req, 'ink']].map(([l, v, t]) => (
          <div key={l}><div className="mb-1.5 flex justify-between text-sm"><span className="text-muted">{l}</span><span className="tnum font-semibold">{months(v)}</span></div><ProgressBar value={(v / maxv) * 100} tone={t} height="h-3" /></div>
        ))}
      </div>
      <div className={cn('mt-5 flex items-center justify-between rounded-xl px-4 py-3 text-sm', gap ? 'bg-bad-wash text-bad' : 'bg-ok-wash text-ok')}><span className="font-medium">{gap ? 'Experience gap' : 'Requirement met'}</span><span className="tnum font-semibold">{gap ? months(gap) : `+${months(cand - req)}`}</span></div>
      {entries.length > 0 && (
        <div className="mt-6 border-t border-line pt-5"><div className="eyebrow mb-4">Experience history</div>
          <Timeline items={entries.map((e, i) => ({ current: /present/i.test(e.end), children: (
            <div><div className="flex flex-wrap items-baseline justify-between gap-x-3"><h3 className="font-semibold">{e.role || e.title}</h3><span className="text-xs text-muted">{e.start} → {e.end} · {months(e.months)}</span></div>
              {e.role && <div className="text-sm text-muted">{e.company}{e.is_internship && <Badge className="ml-2" tone="info">Internship</Badge>}</div>}
              {e.highlights?.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-4 text-[13px] text-muted marker:text-line-strong">{e.highlights.slice(0, 3).map((h) => <li key={h}>{h}</li>)}</ul>}</div>) }))} />
        </div>
      )}
    </Card>
  );
}

function EducationCard({ a }) {
  const ed = a.education_details;
  return (
    <Card className="p-5 sm:p-6" aria-labelledby="edu">
      <SectionHeader eyebrow="Education" title="Academic timeline" /><h2 id="edu" className="sr-only">Education</h2>
      {ed.length ? <div className="mt-5"><Timeline items={ed.map((e) => ({ current: e.end === 'Present', children: (
        <div><div className="text-xs text-muted tnum">{e.start ? `${e.start} → ${e.end}` : 'Dates not found'}</div><h3 className="font-semibold leading-snug">{e.degree}</h3>
          {e.institution && <div className="text-sm text-muted">{e.institution}</div>}
          {e.score != null && <Badge className="mt-1.5" tone="neutral">{e.score_type === 'CGPA' ? `CGPA ${e.score}` : `${e.score}%`}</Badge>}</div>) }))} /></div>
        : <p className="mt-4 text-sm text-muted">No structured education entries were detected{a.education.length ? '. Raw lines are available in the extracted text.' : '.'}</p>}
    </Card>
  );
}

function Projects({ a }) {
  const ps = a.project_details;
  if (!ps.length) return null;
  return (
    <section aria-labelledby="proj"><SectionHeader eyebrow="Projects" title="Selected work" className="mb-4" /><h2 id="proj" className="sr-only">Projects</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {ps.map((p, i) => (
          <motion.article key={p.name + i} {...stagger(i)} className="card flex flex-col p-5 transition-shadow hover:shadow-lift">
            <div className="flex items-start justify-between gap-3"><FolderGit2 className="size-5 text-subtle" aria-hidden />{p.year && <span className="eyebrow">{p.year}</span>}</div>
            <h3 className="display mt-3 text-[1.7rem] leading-tight">{p.name}</h3>
            {p.subtitle && <p className="mt-1 text-sm font-medium text-text/80">{p.subtitle}</p>}
            {p.institution && <p className="mt-0.5 text-xs text-muted">{p.institution}</p>}
            <p className="mt-3 line-clamp-4 flex-1 text-[13px] leading-relaxed text-muted">{p.description}</p>
            {(p.technologies.length ? p.technologies : p.detected_skills.map(skillLabel)).length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{(p.technologies.length ? p.technologies : p.detected_skills.map(skillLabel)).map((t) => <span key={t} className="rounded-md bg-sunken px-2 py-1 text-xs font-medium">{t}</span>)}</div>}
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function Profile({ a, rec }) {
  const c = a.candidate;
  const Row = ({ I, href, children }) => children ? <li className="flex items-center gap-3 text-sm"><I className="size-4 shrink-0 text-subtle" aria-hidden />{href ? <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="min-w-0 truncate hover:underline">{children}</a> : <span className="truncate">{children}</span>}</li> : null;
  return (
    <Card className="p-5" aria-labelledby="prof">
      <div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-full bg-ink text-lg font-semibold text-lime" aria-hidden>{candidateName(rec).charAt(0).toUpperCase()}</span><div className="min-w-0"><h2 id="prof" className="truncate font-semibold">{candidateName(rec)}</h2><div className="truncate text-xs text-muted">{rec.filename}</div></div></div>
      <ul className="mt-4 space-y-2.5 border-t border-line pt-4">
        <Row I={Mail} href={c.email && `mailto:${c.email}`}>{c.email}</Row><Row I={Phone} href={c.phone && `tel:${c.phone.replace(/\s/g, '')}`}>{c.phone}</Row>
        <Row I={Linkedin} href={c.linkedin}>{c.linkedin?.replace(/^https?:\/\/(www\.)?/, '')}</Row><Row I={Github} href={c.github}>{c.github?.replace(/^https?:\/\/(www\.)?/, '')}</Row>
        {!c.email && !c.phone && !c.linkedin && !c.github && <li className="text-sm text-muted">No contact details detected.</li>}
      </ul>
      {a.certifications.length > 0 && <div className="mt-4 border-t border-line pt-4"><div className="eyebrow mb-2.5 flex items-center gap-1.5"><Award className="size-3.5" aria-hidden />Certifications</div><ul className="space-y-2">{a.certifications.map((x) => <li key={x} className="text-[13px] leading-snug text-muted">{x}</li>)}</ul></div>}
    </Card>
  );
}

export default function Report() {
  const { id } = useParams();
  const rec = useScreening(id);
  const navigate = useNavigate();
  const toast = useToast();
  const [del, setDel] = useState(false);
  if (!rec) return <Page><EmptyState icon={FileText} title="Report not found" description="It may have been deleted, or it was created in a different browser." action={<Button as={Link} to="/app/screen">New screening</Button>} /></Page>;
  const s = rec.screening, a = s.resume_analysis;
  const save = (ml) => updateScreening(rec.id, { ml });
  return (
    <Page>
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <Button as={Link} to="/app/candidates" variant="ghost" size="sm" className="-ml-3"><ArrowLeft className="size-4" aria-hidden />Candidates</Button>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="pipe">Candidate status</label>
          <Select id="pipe" value={rec.status} onChange={(e) => { updateScreening(rec.id, { status: e.target.value }); toast(`Marked as ${e.target.value}`, 'info'); }} className="!h-9 !w-40 !text-sm">{PIPELINE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
          <Button variant="secondary" size="sm" onClick={() => window.print()}><Download className="size-4" aria-hidden />Download report</Button>
          <Button variant="secondary" size="sm" as={Link} to="/app/screen"><RefreshCw className="size-4" aria-hidden />Screen another</Button>
          <Button variant="ghost" size="sm" onClick={() => setDel(true)} aria-label="Delete report"><Trash2 className="size-4" aria-hidden /></Button>
        </div>
      </div>

      <div className="space-y-6">
        <Header rec={rec} s={s} a={a} />
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem] print:grid-cols-1">
          <div className="min-w-0 space-y-6">
            <motion.div {...stagger(1)}><Decision s={s} /></motion.div>
            <motion.div {...stagger(2)}><Insights s={s} a={a} /></motion.div>
            <motion.div {...stagger(3)}><Comparison s={s} a={a} /></motion.div>
            <motion.div {...stagger(4)}><Skills s={s} a={a} /></motion.div>
            <div className="grid gap-6 xl:grid-cols-2"><motion.div {...stagger(5)}><ExperienceCard s={s} a={a} /></motion.div><motion.div {...stagger(6)}><EducationCard a={a} /></motion.div></div>
            <Projects a={a} />
          </div>
          <div className="min-w-0 space-y-6 lg:sticky lg:top-6 lg:self-start">
            <motion.div {...stagger(2)}><MLPanel record={rec} onSave={save} /></motion.div>
            <motion.div {...stagger(3)}><Profile a={a} rec={rec} /></motion.div>
            <Card className="no-print p-5"><label htmlFor="note" className="eyebrow mb-2 block">Recruiter notes</label><Textarea id="note" rows={4} value={rec.note} onChange={(e) => updateScreening(rec.id, { note: e.target.value })} placeholder="Private notes, saved in this browser…" /></Card>
          </div>
        </div>
        <Card className="no-print p-5 sm:p-6">
          <details><summary className="flex cursor-pointer list-none items-center justify-between font-medium"><span className="flex items-center gap-2"><FileText className="size-4 text-subtle" aria-hidden />View extracted resume text</span><ChevronDown className="size-4 text-subtle" aria-hidden /></summary>
            <div className="mt-2 flex flex-wrap gap-1.5">{a.sections_found.map((x) => <Badge key={x}>{x}</Badge>)}</div>
            <pre className="scroll-thin mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-sunken p-4 font-mono text-xs leading-relaxed text-text/80">{s.resume_text || 'Resume text is no longer stored for this older report.'}</pre></details>
        </Card>
      </div>
      <Modal open={del} onClose={() => setDel(false)} title="Delete this report?" footer={<><Button variant="ghost" onClick={() => setDel(false)}>Cancel</Button><Button variant="danger" onClick={() => { deleteScreening(rec.id); toast('Report deleted', 'info'); navigate('/app/candidates'); }}>Delete</Button></>}><p className="text-sm text-muted">This removes the report from this browser. It can’t be undone.</p></Modal>
    </Page>
  );
}
