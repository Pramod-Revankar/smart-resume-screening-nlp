/** Pure aggregations over stored screenings — every number shown in analytics comes from here. */
const count = (arr) => arr.reduce((m, k) => ((m[k] = (m[k] || 0) + 1), m), {});
const top = (obj, n = 8) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);

export function summarize(list) {
  const scores = list.map((s) => s.screening.resume_job_match_score);
  const byRec = count(list.map((s) => s.screening.recommendation));
  const byStatus = count(list.map((s) => s.status));
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const bins = ['0–20', '20–40', '40–60', '60–80', '80–100'].map((range) => ({ range, count: 0 }));
  scores.forEach((s) => { bins[Math.min(4, Math.floor(s / 20))].count += 1; });

  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    days.push({ key: d.toDateString(), label: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), count: 0 });
  }
  list.forEach((s) => { const k = new Date(s.createdAt).toDateString(); const d = days.find((x) => x.key === k); if (d) d.count += 1; });

  const expBins = [['None', 0, 0], ['1–6 mo', 1, 6], ['7–12 mo', 7, 12], ['1–2 yrs', 13, 24], ['2–4 yrs', 25, 48], ['4+ yrs', 49, 1e9]].map(([label, lo, hi]) => ({ label, lo, hi, count: 0 }));
  list.forEach((s) => { const m = s.screening.resume_analysis.experience.experience_months; const b = expBins.find((x) => m >= x.lo && m <= x.hi); if (b) b.count += 1; });

  const demand = count(list.flatMap((s) => s.screening.job_skills));
  const missing = count(list.flatMap((s) => s.screening.skill_match.missing_skills));
  const held = count(list.flatMap((s) => s.screening.resume_analysis.skills));
  const levelOf = (s) => Math.max(0, ...s.screening.resume_analysis.education_details.map((e) => e.level));
  const eduNames = { 0: 'Not detected', 1: 'School', 2: 'Diploma', 3: 'Bachelor’s', 4: 'Master’s', 5: 'Doctorate' };
  const edu = count(list.map((s) => eduNames[levelOf(s)]));

  return {
    total: list.length, avg, byRec, byStatus, bins, days, expBins,
    strong: byRec['Strong Match'] || 0, moderate: byRec['Moderate Match'] || 0, weak: byRec['Weak Match'] || 0,
    demand: top(demand), missing: top(missing), held: top(held), edu: Object.entries(edu),
    mlRun: list.filter((s) => s.ml).length,
  };
}
