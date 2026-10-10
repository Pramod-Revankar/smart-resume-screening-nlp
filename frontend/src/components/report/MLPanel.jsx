import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, BrainCircuit, Info, RefreshCw } from 'lucide-react';
import { Badge, Button, Card, Drawer, ErrorState, Field, Input, LoadingState, ScoreRing, Select, cn, useToast } from '../ui';
import { getModelMeta, predictCandidate } from '../../services/api';

const GROUPS = [
  ['Profile', ['age', 'gender', 'location', 'expected_salary_lpa', 'employment_gap_months']],
  ['Education', ['degree', 'specialization', 'university_tier', 'cgpa']],
  ['Experience & activity', ['years_experience', 'internships_count', 'projects_count', 'certifications_count', 'github_projects', 'hackathons_participated', 'kaggle_activity_score']],
  ['Skill ratings (1–10)', ['python_skill', 'sql_skill', 'machine_learning_skill', 'deep_learning_skill', 'communication_skill', 'leadership_skill']],
];
const HINTS = {
  kaggle_activity_score: '0–10 activity score', expected_salary_lpa: 'Lakhs per annum', cgpa: 'Out of 10', age: 'Years',
  employment_gap_months: 'Months out of work', github_projects: 'Public repositories / projects',
};

function ProfileForm({ meta, prefill, initial, onSubmit, busy, serverErrors }) {
  const [vals, setVals] = useState(() => ({ ...Object.fromEntries(Object.entries(prefill || {}).map(([k, v]) => [k, v.value])), ...(initial || {}) }));
  const [errors, setErrors] = useState({});
  const set = (k, v) => { setVals((s) => ({ ...s, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };
  const validate = () => {
    const e = {};
    for (const f of meta.feature_order) {
      const v = vals[f];
      if (v === undefined || v === '' || v === null) { e[f] = 'Required'; continue; }
      const b = meta.bounds[f];
      if (b) {
        const n = Number(v);
        if (Number.isNaN(n)) e[f] = 'Enter a number';
        else if (n < b.min || n > b.max) e[f] = `Must be ${b.min}–${b.max}`;
        else if (b.integer && !Number.isInteger(n)) e[f] = 'Whole number';
      }
    }
    setErrors(e); return !Object.keys(e).length;
  };
  const submit = (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    const out = {};
    for (const f of meta.feature_order) out[f] = meta.bounds[f] ? Number(vals[f]) : vals[f];
    onSubmit(out);
  };
  const err = (f) => errors[f] || serverErrors?.[f];
  return (
    <form id="ml-form" onSubmit={submit} className="space-y-7" noValidate>
      <div className="flex gap-3 rounded-xl bg-info-wash p-3.5 text-[13px] text-text/80"><Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
        <p>The model scores <strong>structured profile fields</strong>, not resume text. Fields marked <Badge tone="lime" className="!py-0">from resume</Badge> were read from the resume — please verify. Everything else needs your input; nothing is guessed.</p></div>
      {GROUPS.map(([title, fields]) => (
        <fieldset key={title}><legend className="eyebrow mb-3">{title}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => {
              const cats = meta.categories[f]; const b = meta.bounds[f]; const pf = prefill?.[f];
              const label = <span className="flex items-center gap-2">{meta.labels[f]}{pf && String(vals[f]) === String(pf.value) && <Badge tone="lime" className="!py-0 !text-[10px]">{pf.suggested ? 'suggested' : 'from resume'}</Badge>}</span>;
              return (
                <Field key={f} label={label} htmlFor={`ml-${f}`} error={err(f)} hint={pf && !err(f) ? pf.source : HINTS[f] || (b ? `${b.min}–${b.max}` : undefined)}>
                  {cats ? (
                    <Select id={`ml-${f}`} value={vals[f] ?? ''} onChange={(e) => set(f, e.target.value)} invalid={!!err(f)}><option value="" disabled>Select…</option>{cats.map((c) => <option key={c}>{c}</option>)}</Select>
                  ) : (
                    <Input id={`ml-${f}`} type="number" inputMode="decimal" step={b.integer ? 1 : 0.1} min={b.min} max={b.max} value={vals[f] ?? ''} onChange={(e) => set(f, e.target.value)} invalid={!!err(f)} />
                  )}
                </Field>
              );
            })}
          </div>
        </fieldset>
      ))}
      <button type="submit" className="sr-only" disabled={busy}>Run prediction</button>
    </form>
  );
}

function Factor({ f, max }) {
  const pos = f.shap > 0;
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-[13px]"><span className="min-w-0 truncate"><span className="font-medium">{f.label}</span> <span className="text-muted">= {String(f.value)}</span></span><span className={cn('tnum shrink-0 font-mono text-xs', pos ? 'text-ok' : 'text-bad')}>{pos ? '+' : ''}{f.shap.toFixed(2)}</span></div>
      <div className="mt-1 h-1.5 rounded-full bg-sunken"><div className={cn('h-full rounded-full', pos ? 'bg-ok' : 'bg-bad')} style={{ width: `${(Math.abs(f.shap) / max) * 100}%` }} /></div>
    </li>
  );
}

export default function MLPanel({ record, onSave }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [meta, setMeta] = useState(null);
  const [metaErr, setMetaErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [error, setError] = useState(null);
  const ml = record.ml;
  const prefill = record.screening.resume_analysis.ml_prefill;

  const loadMeta = () => { setMetaErr(null); getModelMeta().then(setMeta).catch((e) => setMetaErr(e)); };
  useEffect(() => { if (open && !meta) loadMeta(); }, [open]); // eslint-disable-line

  const submit = async (input) => {
    setBusy(true); setServerErrors({}); setError(null);
    try {
      const result = await predictCandidate(input);
      onSave({ input, result, at: new Date().toISOString() });
      setOpen(false); toast('ML prediction ready');
    } catch (e) { setServerErrors(e.fieldErrors || {}); setError(e); }
    finally { setBusy(false); }
  };

  const factors = useMemo(() => ml ? [...(ml.result.explanation?.toward_selected || []), ...(ml.result.explanation?.away_from_selected || [])] : [], [ml]);
  const max = Math.max(...factors.map((f) => Math.abs(f.shap)), 0.01);
  const r = ml?.result;
  const selected = r?.prediction === 'Selected';

  return (
    <Card className="overflow-hidden" aria-labelledby="ml-title">
      <div className="flex items-start justify-between gap-3 border-b border-line p-5">
        <div><div className="eyebrow flex items-center gap-1.5"><BrainCircuit className="size-3.5" aria-hidden />Score 2 · Model</div><h2 id="ml-title" className="mt-1 text-[17px] font-semibold">ML selection probability</h2></div>
        {ml && <Button variant="ghost" size="sm" onClick={() => setOpen(true)}><RefreshCw className="size-3.5" aria-hidden />Edit</Button>}
      </div>
      {!ml ? (
        <div className="p-5">
          <p className="text-sm leading-relaxed text-muted">An XGBoost model can estimate selection likelihood from 22 structured profile fields. It runs separately from the resume–job match and never changes it.</p>
          <Button variant="primary" className="mt-4 w-full" onClick={() => setOpen(true)}>Add candidate profile &amp; predict</Button>
          <p className="mt-3 text-xs text-muted">{Object.keys(prefill || {}).length} fields can be prefilled from the resume.</p>
        </div>
      ) : (
        <div className="p-5">
          <div className="flex items-center gap-5">
            <ScoreRing value={r.selection_probability} size={124} stroke={10} tone={selected ? 'ok' : 'bad'} track="#efeee6" textClass="text-ink" marker={r.decision_threshold * 100} sublabel="Probability" />
            <div className="min-w-0"><div className="eyebrow">Prediction</div><div className={cn('display text-3xl leading-tight', selected ? 'text-ok' : 'text-bad')}>{r.prediction}</div><div className="mt-1 text-xs text-muted">Decision threshold {r.decision_threshold} <span className="text-subtle">(tick on ring)</span></div></div>
          </div>
          <p className="mt-4 rounded-lg bg-sunken px-3 py-2.5 text-xs leading-relaxed text-muted"><strong className="text-text">Selection probability</strong> is the model’s estimate for the “Selected” class — it is <strong className="text-text">not</strong> the model’s accuracy. <Link to="/app/model" className="text-text underline underline-offset-2">See model card</Link></p>
          {r.warnings?.length > 0 && <ul className="mt-3 space-y-2">{r.warnings.map((w) => <li key={w.feature} className="flex gap-2 rounded-lg bg-warn-wash p-2.5 text-xs text-warn"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />{w.message}</li>)}</ul>}
          {factors.length > 0 && (
            <div className="mt-5">
              <div className="eyebrow mb-3">Model signals (SHAP)</div>
              <div className="space-y-4">
                {[['toward_selected', 'Contributed toward “Selected”', ArrowUpRight, 'text-ok'], ['away_from_selected', 'Contributed away from “Selected”', ArrowDownRight, 'text-bad']].map(([k, t, I, c]) => (r.explanation[k]?.length > 0 &&
                  <div key={k}><div className={cn('mb-2 flex items-center gap-1 text-xs font-medium', c)}><I className="size-3.5" aria-hidden />{t}</div><ul className="space-y-2.5">{r.explanation[k].map((f) => <Factor key={f.feature} f={f} max={max} />)}</ul></div>))}
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-subtle">These factors describe how the model weighed this input — not what caused an outcome. The model uses age and gender as inputs; treat it as one signal, never a decision.</p>
            </div>
          )}
        </div>
      )}

      <Drawer open={open} onClose={() => setOpen(false)} title="Candidate profile" subtitle="Structured fields for the ML model"
        footer={<div className="flex items-center justify-between gap-3"><span className="text-xs text-muted">All 22 fields are required.</span><div className="flex gap-2"><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" loading={busy} onClick={() => document.getElementById('ml-form')?.requestSubmit()} disabled={!meta}>Run prediction</Button></div></div>}>
        {error && <ErrorState className="mb-5" title="Prediction failed" message={error.message} />}
        {metaErr ? <ErrorState title="Couldn’t load model schema" message={metaErr.message} onRetry={loadMeta} /> : !meta ? <LoadingState rows={6} /> : <ProfileForm meta={meta} prefill={prefill} initial={ml?.input} onSubmit={submit} busy={busy} serverErrors={serverErrors} />}
      </Drawer>
    </Card>
  );
}
