import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, FileText, Loader2, RefreshCw, Replace, ShieldCheck, Trash2, UploadCloud, X } from 'lucide-react';
import Page from '../components/Page';
import { Button, Card, ErrorState, Field, Input, PageHeader, Select, Textarea, cn, useToast } from '../components/ui';
import { screenResume } from '../services/api';
import { addScreening } from '../services/storage';
import { fileSize } from '../utils/format';

const MAX_BYTES = 5 * 1024 * 1024;
const DEGREES = ['MCA', 'BCA', 'B.Tech', 'B.E.', 'M.Tech', 'B.Sc', 'M.Sc', 'MBA', 'BBA', 'B.Com', 'Ph.D'];
const TEMPLATES = [
  { key: 'py', label: 'Full-stack Python developer', years: 2, degree: 'MCA', text: 'We are looking for a Full Stack Python Developer with expertise in SQL, Machine Learning, FastAPI, MongoDB and Docker. You will build backend REST APIs, train machine learning models and manage data pipelines. MCA or B.Tech with at least 2 years of relevant software engineering experience.' },
  { key: 'ml', label: 'Machine learning engineer', years: 3, degree: 'M.Tech', text: 'Seeking a Machine Learning Engineer proficient in Python, SQL, Deep Learning, PyTorch, scikit-learn and AWS. Responsible for developing predictive models, feature engineering and model deployment in cloud environments. 3+ years of experience required.' },
  { key: 'da', label: 'Data analyst', years: 1, degree: 'BCA', text: 'Hiring a Data Analyst to extract business insights using SQL, Python, MySQL, data analysis and Excel. Must be comfortable writing complex SQL queries, analysing datasets and presenting data visual reports.' },
];
const STAGES = [
  ['received', 'Uploading resume'], ['extracted', 'Extracting content'], ['analyze', 'Analyzing candidate'], ['skills', 'Analyzing skills'],
  ['experience', 'Analyzing experience'], ['education', 'Analyzing education'], ['matching', 'Matching job requirements'], ['scoring', 'Calculating screening score'], ['done', 'Preparing results'],
];

function Dropzone({ file, onFile, error }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  const pick = (f) => f && onFile(f);
  if (file) {
    const ext = file.name.split('.').pop().toUpperCase();
    return (
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-wrap items-center gap-4 rounded-2xl border border-ok/30 bg-ok-wash/40 p-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-ink text-lime"><FileText className="size-5" aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium" title={file.name}>{file.name}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted"><span>{ext}</span><span>{fileSize(file.size)}</span><span className="inline-flex items-center gap-1 text-ok"><Check className="size-3" aria-hidden />Ready to analyze</span></div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => input.current?.click()}><Replace className="size-3.5" aria-hidden />Replace</Button>
          <Button variant="ghost" size="sm" onClick={() => onFile(null)} aria-label="Remove file"><Trash2 className="size-3.5" aria-hidden />Remove</Button>
        </div>
        <input ref={input} type="file" accept=".pdf,.docx" className="sr-only" onChange={(e) => { pick(e.target.files[0]); e.target.value = ''; }} tabIndex={-1} />
      </motion.div>
    );
  }
  return (
    <div>
      <div onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files[0]); }}
        className={cn('relative grid place-items-center overflow-hidden rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-all', over ? 'scale-[1.01] border-ink bg-lime-wash' : 'border-line-strong bg-surface hover:border-ink/50', error && 'border-bad/50')}>
        <div className="dot-grid-light pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <div className="relative">
          <motion.div animate={over ? { y: -4 } : { y: 0 }} className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-ink text-lime"><UploadCloud className="size-6" aria-hidden /></motion.div>
          <p className="display text-3xl text-ink">Drop candidate resume here</p>
          <p className="mt-2 text-sm text-muted">PDF or DOCX · up to 5 MB</p>
          <Button variant="secondary" className="mt-5" onClick={() => input.current?.click()}>Browse files</Button>
          <input ref={input} type="file" accept=".pdf,.docx" className="sr-only" aria-label="Upload resume (PDF or DOCX)" onChange={(e) => { pick(e.target.files[0]); e.target.value = ''; }} />
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-bad" role="alert">{error}</p>}
    </div>
  );
}

function Processing({ done, elapsed, onCancel }) {
  const firstPending = STAGES.findIndex(([k]) => !done.has(k));
  return (
    <Card className="mx-auto max-w-xl overflow-hidden" aria-live="polite">
      <div className="on-dark bg-ink p-6 text-white"><div className="eyebrow !text-lime">Analysis in progress</div><h2 className="display mt-2 text-4xl">Reading the resume…</h2><p className="mt-1 text-sm text-white/50 tnum">{elapsed.toFixed(1)}s elapsed</p></div>
      <ol className="p-3">
        {STAGES.map(([k, label], i) => {
          const complete = done.has(k), active = i === firstPending;
          return (
            <li key={k} className={cn('flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors', active && 'bg-sunken')}>
              <span className={cn('grid size-6 place-items-center rounded-full', complete ? 'bg-ok text-white' : active ? 'bg-ink text-lime' : 'bg-sunken text-subtle')}>{complete ? <Check className="size-3.5" aria-hidden /> : active ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <span className="size-1.5 rounded-full bg-current" />}</span>
              <span className={cn(complete ? 'text-text' : active ? 'font-medium text-text' : 'text-subtle')}>{label}</span>
            </li>
          );
        })}
      </ol>
      <div className="border-t border-line p-3"><Button variant="ghost" size="sm" onClick={onCancel}><X className="size-3.5" aria-hidden />Cancel</Button></div>
    </Card>
  );
}

export default function NewScreening() {
  const navigate = useNavigate();
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [title, setTitle] = useState('');
  const [jd, setJd] = useState('');
  const [years, setYears] = useState(2);
  const [degreeSel, setDegreeSel] = useState('MCA');
  const [degreeOther, setDegreeOther] = useState('');
  const [extra, setExtra] = useState('');
  const [errors, setErrors] = useState({});
  const [phase, setPhase] = useState('form'); // form | running | error
  const [done, setDone] = useState(new Set());
  const [elapsed, setElapsed] = useState(0);
  const [apiError, setApiError] = useState(null);
  const abort = useRef(null);

  const degree = degreeSel === 'Other' ? degreeOther.trim() : degreeSel;

  const choose = useCallback((f) => {
    setFileError('');
    if (!f) return setFile(null);
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx'].includes(ext)) return setFileError('Unsupported file type. Please upload a PDF or DOCX resume.');
    if (f.size > MAX_BYTES) return setFileError(`This file is ${fileSize(f.size)}. The maximum is 5 MB.`);
    if (f.size === 0) return setFileError('This file is empty.');
    setFile(f);
  }, []);

  const validate = () => {
    const e = {};
    if (!file) e.file = 'Upload a resume to analyze.';
    if (jd.trim().length < 20) e.jd = 'Add the job description (at least 20 characters).';
    if (years === '' || Number(years) < 0 || Number(years) > 40 || Number.isNaN(Number(years))) e.years = 'Enter 0–40 years.';
    if (!degree) e.degree = 'Specify the required degree.';
    setErrors(e);
    if (e.file) setFileError(e.file);
    return !Object.keys(e).length;
  };

  const run = async () => {
    if (!validate()) return;
    setPhase('running'); setApiError(null); setDone(new Set());
    const t0 = performance.now();
    const timer = setInterval(() => setElapsed((performance.now() - t0) / 1000), 100);
    abort.current = new AbortController();
    const description = extra.trim() ? `${jd.trim()}\n\nRequired skills: ${extra.trim()}` : jd.trim();
    try {
      const { filename, screening } = await screenResume({
        file, jobDescription: description, requiredExperienceYears: Number(years), requiredDegree: degree, signal: abort.current.signal,
        onStage: (stage) => setDone((d) => { const n = new Set(d); n.add(stage); if (['skills', 'experience', 'education', 'matching', 'scoring', 'done'].includes(stage)) n.add('analyze'); if (['experience', 'education', 'matching', 'scoring', 'done'].includes(stage)) n.add('skills'); if (stage === 'done') STAGES.forEach(([k]) => n.add(k)); return n; }),
      });
      const rec = addScreening({ filename, jobTitle: title.trim(), jobDescription: description, requiredExperienceYears: Number(years), requiredDegree: degree, screening });
      toast('Screening complete');
      navigate(`/app/report/${rec.id}`);
    } catch (err) {
      if (err.status === -1) { setPhase('form'); } else { setApiError(err); setPhase('error'); }
    } finally { clearInterval(timer); }
  };
  useEffect(() => () => abort.current?.abort(), []);

  const reset = () => { setFile(null); setFileError(''); setTitle(''); setJd(''); setYears(2); setDegreeSel('MCA'); setDegreeOther(''); setExtra(''); setErrors({}); setPhase('form'); };
  const jdChars = jd.length;
  const canSubmit = useMemo(() => !!file && jd.trim().length >= 20 && !!degree, [file, jd, degree]);

  if (phase === 'running') return <Page className="pt-4"><Processing done={done} elapsed={elapsed} onCancel={() => abort.current?.abort()} /></Page>;

  return (
    <Page>
      <PageHeader eyebrow="Screening workspace" title={<>New <em>screening.</em></>} description="Upload a resume, describe the role, and get a transparent, evidence-based report."
        actions={(file || jd) && <Button variant="ghost" onClick={reset}><RefreshCw className="size-4" aria-hidden />Reset</Button>} />
      {phase === 'error' && <ErrorState className="mb-6" title={apiError?.network ? 'Can’t reach the API' : 'Screening failed'} message={apiError?.message} onRetry={run} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-ink text-xs font-semibold text-lime">1</span><h2 className="font-semibold">Candidate resume</h2></div>
            <Dropzone file={file} onFile={choose} error={fileError} />
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-ink text-xs font-semibold text-lime">2</span><h2 className="font-semibold">The role</h2></div>
            <div className="mb-4 flex flex-wrap items-center gap-2"><span className="eyebrow mr-1">Start from</span>
              {TEMPLATES.map((t) => <button key={t.key} type="button" onClick={() => { setTitle(t.label); setJd(t.text); setYears(t.years); setDegreeSel(t.degree); setErrors({}); }} className="rounded-full border border-line-strong bg-surface px-3 py-1.5 text-xs font-medium hover:border-ink hover:bg-lime-wash min-h-8">{t.label}</button>)}
            </div>
            <div className="space-y-4">
              <Field label="Job title" htmlFor="title" hint="Used to label this report in your workspace."><Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Backend Engineer" maxLength={80} /></Field>
              <Field label="Job description" htmlFor="jd" error={errors.jd} hint={<span className="tnum">{jdChars.toLocaleString()} characters — required skills are detected from this text</span>}>
                <Textarea id="jd" rows={7} value={jd} onChange={(e) => setJd(e.target.value)} invalid={!!errors.jd} placeholder="Paste the job description. Mention the skills the role requires, e.g. Python, SQL, FastAPI…" maxLength={20000} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Required experience (years)" htmlFor="years" error={errors.years}><Input id="years" type="number" inputMode="numeric" min={0} max={40} value={years} onChange={(e) => setYears(e.target.value)} invalid={!!errors.years} /></Field>
                <Field label="Required degree" htmlFor="degree" error={errors.degree}>
                  <Select id="degree" value={degreeSel} onChange={(e) => setDegreeSel(e.target.value)}>{DEGREES.map((d) => <option key={d}>{d}</option>)}<option value="Other">Other…</option></Select>
                </Field>
              </div>
              {degreeSel === 'Other' && <Field label="Specify degree" htmlFor="deg2"><Input id="deg2" value={degreeOther} onChange={(e) => setDegreeOther(e.target.value)} placeholder="e.g. B.Tech or MCA" invalid={!!errors.degree} /></Field>}
              <Field label="Additional required skills" htmlFor="extra" hint="Optional. Comma-separated; appended to the job description before analysis."><Input id="extra" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="e.g. Docker, AWS" /></Field>
            </div>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card className="p-5">
            <div className="eyebrow">Ready check</div>
            <ul className="mt-3 space-y-2.5 text-sm">
              {[[!!file, 'Resume uploaded'], [jd.trim().length >= 20, 'Job description added'], [!!degree, 'Degree requirement set']].map(([ok, l]) => (
                <li key={l} className={cn('flex items-center gap-2.5', ok ? 'text-text' : 'text-muted')}><span className={cn('grid size-5 place-items-center rounded-full', ok ? 'bg-ok text-white' : 'border border-line-strong')}>{ok && <Check className="size-3" aria-hidden />}</span>{l}</li>
              ))}
            </ul>
            <Button variant="accent" size="lg" className="mt-5 w-full" onClick={run} disabled={!canSubmit && false}>Analyze candidate<ArrowRight className="size-4" aria-hidden /></Button>
            {!canSubmit && <p className="mt-2 text-center text-xs text-muted">Complete the steps above to continue.</p>}
          </Card>
          <Card className="p-5 text-sm text-muted"><div className="flex gap-3"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden /><p>The resume is processed in memory by the API and discarded. Only the results are saved — in this browser.</p></div></Card>
        </aside>
      </div>
    </Page>
  );
}
