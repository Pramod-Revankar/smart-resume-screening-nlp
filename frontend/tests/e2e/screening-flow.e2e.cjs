require('fs').mkdirSync('./e2e-shots', { recursive: true });
const { chromium } = require('playwright');
const SHOTS = './e2e-shots';
const PDF = require('path').join(__dirname, '../../../data/resumes/Pramodresumeplacement .pdf');
const BASE = 'http://127.0.0.1:5173';
const results = []; const issues = [];
const ok = (name, pass, extra = '') => { results.push([name, pass, extra]); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} ${extra}`); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) issues.push(`console.${m.type()}: ${m.text().slice(0, 200)}`); });
  page.on('pageerror', (e) => issues.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => issues.push(`requestfailed: ${r.method()} ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 400) issues.push(`http ${r.status()}: ${r.request().method()} ${r.url()}`); });

  await page.goto(BASE + '/'); await page.waitForSelector('h1'); await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOTS}/01-landing-desktop.png` });
  await page.screenshot({ path: `${SHOTS}/01b-landing-full.png`, fullPage: true });
  ok('landing renders', (await page.textContent('h1')).includes('Find the right candidates'));

  await page.goto(BASE + '/app'); await page.waitForSelector('text=Screen your first candidate'); await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/02-overview-empty.png` });
  ok('overview shows empty state with no data', true);

  await page.goto(BASE + '/app/screen'); await page.waitForSelector('text=Drop candidate resume here');
  await page.screenshot({ path: `${SHOTS}/03-screen-empty.png` });
  await page.setInputFiles('input[type=file] >> nth=0', { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
  ok('rejects .txt client-side', await page.isVisible('text=Unsupported file type'));
  await page.setInputFiles('input[type=file] >> nth=0', { name: 'big.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(5 * 1024 * 1024 + 10, 1) });
  ok('rejects >5MB client-side', await page.isVisible('text=maximum is 5 MB'));
  await page.setInputFiles('input[type=file] >> nth=0', PDF);
  await page.waitForSelector('text=Ready to analyze');
  await page.click('button:has-text("Analyze candidate")');
  ok('blocks submit without job description', await page.isVisible('text=Add the job description'));
  await page.click('text=Full-stack Python developer');
  await page.screenshot({ path: `${SHOTS}/04-screen-filled.png` });
  await page.click('button:has-text("Analyze candidate")');
  await page.waitForURL(/\/app\/report\//, { timeout: 30000 });
  await page.waitForSelector('text=Candidate intelligence'); await page.waitForTimeout(2200);
  await page.screenshot({ path: `${SHOTS}/05-report-top.png` });
  await page.screenshot({ path: `${SHOTS}/05b-report-full.png`, fullPage: true });
  const h1 = await page.textContent('h1');
  ok('report generated, name read from resume', /Pramod/i.test(h1), h1);
  ok('decision section shown', await page.isVisible('text=Screening decision'));
  ok('two scores are separate cards', await page.isVisible('text=ML selection probability') && await page.isVisible('text=Resume match'));

  await page.click('button:has-text("Add candidate profile")'); await page.waitForSelector('#ml-age');
  await page.screenshot({ path: `${SHOTS}/06-ml-drawer.png` });
  await page.click('button:has-text("Run prediction"):not(.sr-only)');
  ok('ML form blocks incomplete input', await page.isVisible('text=Required >> nth=0'));
  const fill = async (id, v) => page.fill(`#ml-${id}`, String(v));
  await fill('age', 24); await page.selectOption('#ml-gender', 'Male'); await page.selectOption('#ml-location', 'Bangalore');
  await fill('expected_salary_lpa', 12); await fill('employment_gap_months', 0); await page.selectOption('#ml-university_tier', 'Tier 2');
  await fill('github_projects', 3); await fill('hackathons_participated', 1); await fill('kaggle_activity_score', 5.7);
  for (const [k, v] of Object.entries({ python_skill: 8, sql_skill: 7, machine_learning_skill: 7, deep_learning_skill: 5, communication_skill: 7, leadership_skill: 6 })) await fill(k, v);
  await fill('cgpa', 55); await page.click('button:has-text("Run prediction"):not(.sr-only)');
  ok('ML form rejects cgpa=55 client-side', await page.isVisible('text=Must be 0–10'));
  await fill('cgpa', 8.25);
  const pred = page.waitForResponse((r) => r.url().includes('/model/predict'));
  await page.click('button:has-text("Run prediction"):not(.sr-only)'); const pr = await pred;
  const prj = await pr.json();
  ok('POST /model/predict 200', pr.status() === 200, `prob=${prj.selection_probability} ${prj.prediction}`);
  await page.waitForSelector('text=Model signals (SHAP)'); await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOTS}/07-report-ml.png` });
  ok('"not the model\'s accuracy" note visible', await page.isVisible('text=not the model’s accuracy') || (await page.content()).includes('not</strong> the model’s accuracy'));

  await page.selectOption('#pipe', 'shortlisted'); await page.reload(); await page.waitForSelector('text=Candidate intelligence');
  ok('status + ML result persist after reload', (await page.inputValue('#pipe')) === 'shortlisted' && await page.isVisible('text=Model signals (SHAP)'));
  await page.click('summary:has-text("View extracted resume text")'); ok('extracted text expands', await page.isVisible('pre'));

  for (const [p, marker, shot] of [['/app', 'Candidates screened', '08-overview'], ['/app/candidates', 'Candidate directory', '09-candidates'], ['/app/history', 'Audit trail', '10-history'], ['/app/analytics', 'Recruiter analytics', '11-analytics'], ['/app/model', 'Known limitations', '12-model'], ['/app/settings', 'Screening API', '13-settings']]) {
    await page.goto(BASE + p); await page.waitForSelector(`text=${marker}`); await page.waitForTimeout(1200);
    await page.screenshot({ path: `${SHOTS}/${shot}.png`, fullPage: ['/app/analytics', '/app/model'].includes(p) }); ok(`page ${p} renders`, true);
  }

  const stored = await page.evaluate(() => localStorage.getItem('srs.screenings.v1'));
  for (const [name, w, h] of [['tablet', 820, 1100], ['mobile', 390, 844]]) {
    const c2 = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: name === 'mobile' });
    await c2.addInitScript((d) => { if (!localStorage.getItem('srs.screenings.v1')) localStorage.setItem('srs.screenings.v1', d); }, stored);
    const p2 = await c2.newPage();
    p2.on('pageerror', (e) => issues.push(`${name} pageerror: ${e.message}`)); p2.on('console', (m) => { if (m.type() === 'error') issues.push(`${name} console.error: ${m.text().slice(0, 160)}`); });
    await p2.goto(BASE + '/'); await p2.waitForSelector('h1'); await p2.waitForTimeout(1200);
    await p2.screenshot({ path: `${SHOTS}/r-${name}-landing.png`, fullPage: true });
    const ov0 = await p2.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(`${name} landing: no horizontal overflow`, ov0 <= 1, `(${ov0}px)`);
    const rec = JSON.parse(stored)[0];
    for (const [route, tag] of [['/app', 'overview'], ['/app/screen', 'screen'], [`/app/report/${rec.id}`, 'report'], ['/app/candidates', 'candidates'], ['/app/analytics', 'analytics']]) {
      await p2.goto(BASE + route); await p2.waitForTimeout(1800);
      const ov = await p2.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(`${name} ${tag}: no horizontal overflow`, ov <= 1, `(${ov}px)`);
      await p2.screenshot({ path: `${SHOTS}/r-${name}-${tag}.png`, fullPage: tag === 'report' });
    }
    if (name === 'mobile') { await p2.goto(BASE + '/app'); await p2.click('[aria-label="Open navigation"]'); await p2.waitForTimeout(600); await p2.screenshot({ path: `${SHOTS}/r-mobile-nav.png` }); ok('mobile navigation opens', await p2.isVisible('[role=dialog] nav[aria-label=Primary]')); }
    await c2.close();
  }

  console.log('\nISSUES CAPTURED:'); [...new Set(issues)].forEach((i) => console.log(' -', i));
  console.log(`\n${results.filter((r) => r[1]).length}/${results.length} checks passed`);
  await browser.close();
})().catch((e) => { console.error('E2E CRASH', e); process.exit(1); });
