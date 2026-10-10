import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BadgeCheck, BrainCircuit, Check, FileSearch, GraduationCap, Layers, LineChart, ScanText, ShieldCheck, Timer, UploadCloud, Users, Workflow, X } from 'lucide-react';
import { Logo } from '../components/Brand';
import { Badge, Button, ProgressBar, ScoreRing } from '../components/ui';

const reveal = { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.6, ease: [0.2, 0.7, 0.2, 1] } };

function HeroReport() {
  const skills = [['Python', true], ['SQL', true], ['Machine Learning', true], ['FastAPI', false], ['MongoDB', false]];
  return (
    <motion.div initial={{ opacity: 0, y: 28, rotate: 1.2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 0.9, delay: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
      className="relative w-full max-w-[460px] rounded-3xl border border-white/10 bg-ink-2/90 p-6 shadow-pop backdrop-blur" aria-label="Illustrative screening report">
      <div className="absolute -top-3 right-5"><Badge tone="lime">Illustrative example</Badge></div>
      <div className="eyebrow !text-white/45">Candidate intelligence</div>
      <div className="mt-1.5 flex items-center gap-5">
        <ScoreRing value={87} size={132} stroke={10} tone="lime" sublabel="Match" />
        <div>
          <div className="display text-3xl leading-none text-white">Strong<br /><em className="text-lime">candidate</em></div>
          <p className="mt-2 text-xs text-white/50">Resume–Job Match</p>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {[['Skills', 80, 'lime'], ['Experience', 92, 'lime'], ['Education', 100, 'lime']].map(([l, v, t], i) => (
          <div key={l}><div className="mb-1 flex justify-between text-xs text-white/60"><span>{l}</span><span className="tnum text-white">{v}%</span></div><ProgressBar value={v} tone={t} track="bg-white/10" height="h-1.5" delay={0.5 + i * 0.12} /></div>
        ))}
      </div>
      <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-white/10 pt-4 text-[13px]">
        {skills.map(([s, ok]) => (
          <li key={s} className={`flex items-center gap-2 ${ok ? 'text-white' : 'text-white/40'}`}>
            {ok ? <Check className="size-3.5 text-lime" aria-hidden /> : <X className="size-3.5 text-[#ff8a80]" aria-hidden />}{s}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-3 text-xs">
        <span className="text-white/50">ML selection probability <span className="text-white/30">· separate score</span></span><span className="tnum font-medium text-white">84%</span>
      </div>
    </motion.div>
  );
}

const STEPS = [
  ['01', 'Upload', 'Drop a PDF or DOCX resume. Nothing is stored on the server.', UploadCloud],
  ['02', 'Understand', 'Skills, experience, education, projects and contact details are extracted into structured data.', ScanText],
  ['03', 'Match', 'Each requirement in your job description is checked against the evidence in the resume.', Layers],
  ['04', 'Decide', 'A transparent decision with the reasons behind it — plus an optional, clearly separate ML estimate.', BadgeCheck],
];

const CAPS = [
  { t: 'Resume analysis', d: 'Layout-tolerant parsing of sections, dates (including “Present”), degrees and projects — with word-boundary-safe skill detection, so “Java Script” is never mistaken for Java.', icon: FileSearch, span: 'lg:col-span-2' },
  { t: 'Skill matching', d: 'Required skills, matched and missing, with evidence strength from where each skill appears.', icon: Workflow },
  { t: 'Experience analysis', d: 'Merged, overlap-aware months of experience against the role’s requirement, with the exact gap.', icon: Timer },
  { t: 'Education matching', d: 'Understands degree tracks and levels — an MCA satisfies a BCA requirement.', icon: GraduationCap },
  { t: 'Candidate prediction', d: 'An XGBoost model scores structured profile data, with per-candidate SHAP factors toward and away from the outcome.', icon: BrainCircuit, span: 'lg:col-span-3' },
];

export default function Landing() {
  return (
    <div className="bg-paper">
      {/* HERO */}
      <section className="on-dark relative isolate overflow-hidden bg-ink text-white">
        <div className="dot-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_30%_20%,black,transparent_70%)]" aria-hidden />
        <div className="absolute -right-40 -top-40 -z-10 size-[560px] rounded-full bg-lime/[0.13] blur-[120px]" aria-hidden />
        <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Logo dark />
          <nav className="hidden items-center gap-8 text-sm text-white/65 md:flex" aria-label="Sections">
            <a className="hover:text-white" href="#how">How it works</a><a className="hover:text-white" href="#capabilities">Capabilities</a><a className="hover:text-white" href="#two-scores">Two scores</a>
          </nav>
          <Button as={Link} to="/app" variant="dark" size="sm">Open workspace<ArrowRight className="size-3.5" aria-hidden /></Button>
        </header>
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-10 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:pb-32 lg:pt-16">
          <div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs text-white/75">
              <span className="size-1.5 rounded-full bg-lime" aria-hidden />AI-powered hiring intelligence
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.7 }} className="display mt-6 text-[2.9rem] leading-[1.02] sm:text-7xl lg:text-[5.4rem]">
              Find the right candidates <em className="text-lime">before</em> recruiters waste hours reading resumes.
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, duration: 0.7 }} className="mt-6 max-w-xl text-lg leading-relaxed text-white/65">
              Smart Resume Screening reads a resume, tests it against your role, and tells you exactly why a candidate is — or isn’t — a match. Every number traces back to evidence.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24, duration: 0.7 }} className="mt-9 flex flex-wrap gap-3">
              <Button as={Link} to="/app/screen" variant="accent" size="lg">Analyze a resume<ArrowRight className="size-4" aria-hidden /></Button>
              <Button as="a" href="#how" variant="dark" size="lg">Explore platform</Button>
            </motion.div>
            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-6">
              {[['50,000', 'candidate records in the training set'], ['0.957', 'held-out ROC-AUC (structured model)'], ['PDF · DOCX', 'resume formats supported']].map(([n, l]) => (
                <div key={l}><dt className="display tnum text-3xl text-white">{n}</dt><dd className="mt-1 text-xs leading-snug text-white/45">{l}</dd></div>
              ))}
            </dl>
          </div>
          <div className="flex justify-center lg:justify-end"><HeroReport /></div>
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="mx-auto max-w-7xl scroll-mt-8 px-5 py-24 sm:px-8">
        <motion.div {...reveal} className="max-w-2xl"><div className="eyebrow">How it works</div><h2 className="display mt-3 text-5xl leading-[1.05] text-ink">From a PDF to a defensible decision in four steps.</h2></motion.div>
        <ol className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([n, t, d, I], i) => (
            <motion.li key={n} {...reveal} transition={{ ...reveal.transition, delay: i * 0.08 }} className="group relative bg-surface p-7 transition-colors hover:bg-lime-wash/60">
              <div className="flex items-start justify-between"><span className="display text-6xl leading-none text-line-strong transition-colors group-hover:text-ink">{n}</span><I className="size-5 text-subtle group-hover:text-ink" aria-hidden /></div>
              <h3 className="mt-10 text-lg font-semibold">{t}</h3><p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
            </motion.li>
          ))}
        </ol>
      </section>

      {/* CAPABILITIES */}
      <section id="capabilities" className="mx-auto max-w-7xl scroll-mt-8 px-5 pb-24 sm:px-8">
        <motion.div {...reveal} className="max-w-2xl"><div className="eyebrow">AI screening intelligence</div><h2 className="display mt-3 text-5xl leading-[1.05] text-ink">Five lenses on every candidate.</h2></motion.div>
        <div className="mt-12 grid gap-4 lg:grid-cols-4">
          {CAPS.map((c, i) => (
            <motion.article key={c.t} {...reveal} transition={{ ...reveal.transition, delay: (i % 3) * 0.07 }} className={`card relative overflow-hidden p-7 transition-shadow hover:shadow-lift ${c.span || ''}`}>
              <div className="dot-grid-light absolute -right-10 -top-10 size-44 rounded-full opacity-70 [mask-image:radial-gradient(circle,black,transparent_70%)]" aria-hidden />
              <div className="relative"><div className="grid size-11 place-items-center rounded-xl bg-ink text-lime"><c.icon className="size-5" aria-hidden /></div>
                <h3 className="mt-6 text-lg font-semibold">{c.t}</h3><p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{c.d}</p></div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* TWO SCORES */}
      <section id="two-scores" className="on-dark relative scroll-mt-8 overflow-hidden bg-ink py-24 text-white">
        <div className="dot-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_80%_0%,black,transparent_65%)]" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[1fr_1.3fr] lg:items-center">
          <motion.div {...reveal}>
            <div className="eyebrow !text-lime">Built for trust</div>
            <h2 className="display mt-3 text-5xl leading-[1.05]">Two scores. <em className="text-lime">Never merged.</em></h2>
            <p className="mt-5 max-w-md leading-relaxed text-white/65">A resume can match a role perfectly while a model, trained on structured profiles, sees something different. Blending them hides both. We show each on its own, with what it measures — and what it doesn’t.</p>
            <div className="mt-7 flex items-start gap-3 text-sm text-white/55"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-lime" aria-hidden />“Selection probability” is the model’s estimate for the Selected class. It is not the model’s accuracy.</div>
          </motion.div>
          <div className="grid gap-4 sm:grid-cols-2">
            <motion.div {...reveal} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <div className="eyebrow !text-white/50">Score 1</div><h3 className="mt-2 text-lg font-semibold">Resume–Job Match</h3>
              <p className="mt-2 text-sm text-white/55">How well this resume satisfies this role.</p>
              <ul className="mt-5 space-y-2.5 text-sm">{[['Skills', '55%'], ['Experience', '25%'], ['Education', '20%']].map(([a, b]) => <li key={a} className="flex justify-between border-b border-white/10 pb-2 text-white/80"><span>{a}</span><span className="tnum text-white/50">weight {b}</span></li>)}</ul>
              <p className="mt-4 text-xs text-white/40">Source: your job description + resume text.</p>
            </motion.div>
            <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.1 }} className="rounded-3xl border border-lime/25 bg-lime/[0.06] p-6">
              <div className="eyebrow !text-lime/80">Score 2</div><h3 className="mt-2 text-lg font-semibold">ML Selection Probability</h3>
              <p className="mt-2 text-sm text-white/55">What an XGBoost model estimates from 22 structured fields.</p>
              <ul className="mt-5 space-y-2.5 text-sm">{[['Calibrated', 'ECE 0.006'], ['Explained', 'SHAP factors'], ['Threshold', '0.50']].map(([a, b]) => <li key={a} className="flex justify-between border-b border-white/10 pb-2 text-white/80"><span>{a}</span><span className="tnum text-white/50">{b}</span></li>)}</ul>
              <p className="mt-4 text-xs text-white/40">Source: profile fields you confirm — never guessed from text.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ANALYTICS */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <motion.div {...reveal}><div className="eyebrow">Recruiter analytics</div><h2 className="display mt-3 text-5xl leading-[1.05] text-ink">See your pipeline, <em>and your skill gaps</em>.</h2>
            <p className="mt-5 max-w-md leading-relaxed text-muted">Every screening feeds a workspace that shows match distribution, activity over time, the skills your roles demand, and the ones candidates most often lack.</p>
            <Button as={Link} to="/app/screen" variant="primary" size="lg" className="mt-8">Screen your first candidate<ArrowRight className="size-4" aria-hidden /></Button></motion.div>
          <motion.ul {...reveal} className="grid grid-cols-2 gap-3">
            {[[LineChart, 'Screening activity'], [Layers, 'Match distribution'], [Workflow, 'Skill demand'], [Timer, 'Experience mix'], [Users, 'Candidate pipeline'], [FileSearch, 'Gap analysis']].map(([I, l]) => (
              <li key={l} className="card flex items-center gap-3 p-4"><span className="grid size-9 place-items-center rounded-lg bg-lime-wash text-ink"><I className="size-4" aria-hidden /></span><span className="text-sm font-medium">{l}</span></li>
            ))}
          </motion.ul>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <div className="on-dark relative overflow-hidden rounded-[2rem] bg-ink px-8 py-16 text-center text-white sm:px-16">
          <div className="dot-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" aria-hidden />
          <div className="relative"><h2 className="display mx-auto max-w-3xl text-5xl leading-[1.05] sm:text-6xl">Screen your next candidate <em className="text-lime">intelligently.</em></h2>
            <p className="mx-auto mt-4 max-w-md text-white/55">Your screenings stay in your browser. The API processes each resume in memory and discards it.</p>
            <Button as={Link} to="/app/screen" variant="accent" size="lg" className="mt-8">Analyze a resume<ArrowRight className="size-4" aria-hidden /></Button></div>
        </div>
      </section>
      <footer className="border-t border-line"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-muted sm:px-8"><Logo /><span>React · FastAPI · XGBoost · SHAP</span></div></footer>
    </div>
  );
}
