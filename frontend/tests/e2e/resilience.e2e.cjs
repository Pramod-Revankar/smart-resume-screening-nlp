// Offline scenario: set BACKEND_STOP_CMD / BACKEND_START_CMD to commands that stop and restart uvicorn.
require('fs').mkdirSync('./e2e-shots', { recursive: true });
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const BASE = 'http://127.0.0.1:5173'; const issues = []; let pass = 0, total = 0;
const ok = (n, p, x = '') => { total++; if (p) pass++; console.log(`${p ? 'PASS' : 'FAIL'}  ${n} ${x}`); };
(async () => {
  const b = await chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  page.on('pageerror', e => issues.push('pageerror ' + e.message));
  page.on('console', m => { if (m.type() === 'error') issues.push('console.error ' + m.text().slice(0, 160)); });
  await page.goto(BASE + '/app/screen'); await page.waitForSelector('text=Drop candidate resume here');
  // DOCX via the UI
  await page.setInputFiles('input[type=file] >> nth=0', require('path').join(__dirname, 'asha.docx')); await page.waitForSelector('text=Ready to analyze');
  await page.click('text=Full-stack Python developer'); await page.click('button:has-text("Analyze candidate")');
  await page.waitForURL(/\/app\/report\//, { timeout: 30000 }); await page.waitForSelector('text=Candidate intelligence'); await page.waitForTimeout(1800);
  ok('DOCX: name extracted', (await page.textContent('h1')).includes('Asha Rao'));
  const txt = await page.textContent('body');
  const rec = JSON.parse(await page.evaluate(() => localStorage.getItem('srs.screenings.v1')))[0].screening.resume_analysis;
  ok('DOCX: "Java Script" -> javascript and NO false java', rec.skills.includes('javascript') && !rec.skills.includes('java'), JSON.stringify(rec.skills));
  ok('DOCX: "Jan 2023 – Present" counted as >=36 months', rec.experience.experience_months >= 36, rec.experience.experience_months + ' months');
  ok('DOCX: MCA parsed with CGPA 8.4', rec.education_details[0]?.code === 'MCA' && rec.education_details[0]?.score === 8.4);
  ok('DOCX: email + github links shown', txt.includes('asha.rao@example.com') && txt.includes('github.com/asharao'));
  await page.screenshot({ path: './e2e-shots/20-docx-report.png' });
  // offline backend -> error state + retry
  execSync(process.env.BACKEND_STOP_CMD || "pkill -f '[u]vicorn app.main'"); await new Promise(r => setTimeout(r, 1500));
  await page.goto(BASE + '/app/screen'); await page.setInputFiles('input[type=file] >> nth=0', require('path').join(__dirname, 'asha.docx')); await page.waitForSelector('text=Ready to analyze');
  await page.click('text=Data analyst'); await page.click('button:has-text("Analyze candidate")');
  await page.waitForSelector('text=Can’t reach the API', { timeout: 15000 });
  ok('backend offline: clear error state', await page.isVisible('button:has-text("Try again")'));
  await page.screenshot({ path: './e2e-shots/21-offline-error.png' });
  execSync(process.env.BACKEND_START_CMD || 'echo "(start the backend manually, then press retry)"'); await new Promise(r => setTimeout(r, 4000)); await page.click('button:has-text("Try again")');
  await page.waitForURL(/\/app\/report\//, { timeout: 30000 });
  ok('retry succeeds after backend returns', true);
  // server-side validation message surfaces in UI: send a truncated-but-named PDF
  await page.goto(BASE + '/app/screen');
  await page.setInputFiles('input[type=file] >> nth=0', { name: 'fake.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 this is not a real pdf, only fifty bytes of junk...') });
  await page.click('text=Data analyst'); await page.click('button:has-text("Analyze candidate")');
  await page.waitForSelector('text=Screening failed'); const msg = await page.textContent('[role=alert]');
  ok('corrupt PDF: friendly server error shown (no crash)', /could not be read|No readable text/.test(msg), msg.slice(0, 90));
  console.log('\nISSUES:', [...new Set(issues)].filter(i => !/ERR_CONNECTION_REFUSED|Failed to load resource/.test(i)));
  console.log(`${pass}/${total} checks passed`); await b.close();
})().catch(e => { console.error('CRASH', e.message); process.exit(1); });
