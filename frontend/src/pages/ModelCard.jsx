import { useEffect, useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import Page from '../components/Page';
import { Badge, Card, ErrorState, LoadingState, PageHeader, SectionHeader } from '../components/ui';
import { CalibrationChart } from '../charts/Charts';
import { getModelMeta } from '../services/api';

const f = (n, d = 1) => `${(n * 100).toFixed(d)}%`;

export default function ModelCard() {
  const [m, setM] = useState(null); const [err, setErr] = useState(null);
  const load = () => { setErr(null); getModelMeta().then((d) => setM(d.model_card)).catch(setErr); };
  useEffect(load, []);
  return (
    <Page>
      <PageHeader eyebrow="Transparency" title={<>Model <em>card.</em></>} description="What the structured ML model is, how it performs on held-out data, and where it should not be trusted." />
      {err ? <ErrorState message={err.message} onRetry={load} /> : !m ? <LoadingState rows={5} /> : (
        <div className="space-y-6">
          <Card className="p-6"><div className="flex flex-wrap items-center gap-2"><Badge tone="lime">{m.model}</Badge><Badge>{m.training_rows?.toLocaleString()} train rows</Badge><Badge>{m.test_rows?.toLocaleString()} test rows</Badge><Badge>{m.n_features} features</Badge></div>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted">Target: <strong className="text-text">{m.target}</strong>. The model outputs <strong className="text-text">selection probability</strong> — the estimated chance of the “Selected” class. It is separate from the resume–job match score and is <strong className="text-text">not</strong> a measure of the model’s own accuracy.</p></Card>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[['Accuracy', m.test_metrics.accuracy], ['Precision', m.test_metrics.precision], ['Recall', m.test_metrics.recall], ['F1', m.test_metrics.f1], ['ROC-AUC', m.test_metrics.roc_auc]].map(([l, v]) => <div key={l} className="card p-5"><div className="eyebrow">{l}</div><div className="display tnum mt-3 text-4xl">{f(v)}</div><div className="mt-1 text-xs text-muted">held-out test</div></div>)}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6"><SectionHeader eyebrow="Calibration" title="Do 90% predictions mean 90%?" description={`Approx. calibration error ${f(m.calibration.ece_approx, 2)}. Candidates scored ≥ 0.90 were actually selected ${f(m.calibration.observed_rate_ge_90)} of the time.`} /><div className="mt-4"><CalibrationChart predicted={m.calibration.mean_predicted} observed={m.calibration.observed_rate} /></div><p className="mt-2 text-xs text-muted">Dashed line = perfect calibration. Points near it mean probabilities can be read at face value.</p></Card>
            <Card className="p-6"><SectionHeader eyebrow="Confusion matrix" title="Test-set outcomes" />
              <div className="mt-5 grid grid-cols-2 gap-2 text-center">{[['True negatives', m.test_metrics.true_negatives, 'bg-ok-wash text-ok'], ['False positives', m.test_metrics.false_positives, 'bg-bad-wash text-bad'], ['False negatives', m.test_metrics.false_negatives, 'bg-warn-wash text-warn'], ['True positives', m.test_metrics.true_positives, 'bg-ok-wash text-ok']].map(([l, v, c]) => <div key={l} className={`rounded-xl p-5 ${c}`}><div className="display tnum text-4xl">{v.toLocaleString()}</div><div className="mt-1 text-xs font-medium">{l}</div></div>)}</div>
              <p className="mt-4 text-xs text-muted">Rows: actual No / Yes. Columns: predicted No / Yes.</p></Card>
          </div>
          <Card className="p-6"><SectionHeader eyebrow="Decision threshold" title={`Threshold ${m.decision_threshold} — and why`} description={m.threshold_rationale} />
            <div className="mt-5 overflow-x-auto scroll-thin"><table className="w-full min-w-[34rem] text-sm"><thead><tr className="border-b border-line text-left">{['Threshold', 'Precision', 'Recall', 'F1', 'False +', 'False −'].map((h) => <th key={h} className="eyebrow px-3 py-2 !text-[10px]">{h}</th>)}</tr></thead>
              <tbody>{m.threshold_table.map(({ test: t }) => <tr key={t.threshold} className={`border-b border-line/60 last:border-0 ${t.threshold === m.decision_threshold ? 'bg-lime-wash font-medium' : ''}`}><td className="tnum px-3 py-2.5">{t.threshold.toFixed(2)}{t.threshold === m.decision_threshold && <Badge tone="lime" className="ml-2">in use</Badge>}</td><td className="tnum px-3">{f(t.precision)}</td><td className="tnum px-3">{f(t.recall)}</td><td className="tnum px-3">{f(t.f1)}</td><td className="tnum px-3">{t.false_positives}</td><td className="tnum px-3">{t.false_negatives}</td></tr>)}</tbody></table></div>
            <p className="mt-3 flex gap-2 text-xs text-muted"><Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />Higher thresholds shortlist fewer people with fewer false positives, but miss more qualified candidates. Lower thresholds do the reverse. Table shows held-out test rows.</p></Card>
          <Card className="border-warn/30 bg-warn-wash/40 p-6"><div className="flex items-center gap-2 font-semibold text-warn"><AlertTriangle className="size-4" aria-hidden />Known limitations</div>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-text/80 marker:text-warn">{m.caveats.map((c) => <li key={c}>{c}</li>)}</ul></Card>
        </div>
      )}
    </Page>
  );
}
