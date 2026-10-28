// Optional render check: opens the built file like a double click, visits every chapter,
// expands every page, and reports JS errors plus pages that overflow. Saves screenshots.
// Needs Playwright:  npm i -D playwright && npx playwright install chromium
// Usage: node tools/smoke.js dist/pitch.html [screenshot dir]
const path = require('path');
const fs = require('fs');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('playwright-core'); }

(async () => {
  const file = path.resolve(process.argv[2] || 'dist/pitch.html');
  const out = path.resolve(process.argv[3] || 'dist/shots');
  fs.mkdirSync(out, { recursive: true });
  const opts = process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {};
  const browser = await pw.chromium.launch(opts);
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('file://' + file);
  await page.waitForTimeout(2500);
  const n = await page.evaluate(() => document.querySelectorAll('.pick button[data-go]').length);
  const report = [];
  for (let i = 0; i < n; i++) {
    await page.evaluate(i => document.querySelectorAll('.pick button[data-go]')[i].click(), i);
    await page.waitForTimeout(2600);
    await page.evaluate(() => { const b = [...document.querySelectorAll('[data-open]')].pop(); b && b.click(); });
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => {
      const body = document.querySelector('#ovc .cardb');
      const bad = [...document.querySelectorAll('#ovc .mini')].map(x => x.textContent);
      return { overflowX: body ? body.scrollWidth > body.clientWidth + 2 : null, blockErrors: bad };
    });
    await page.screenshot({ path: `${out}/ch${String(i + 1).padStart(2, '0')}.png` });
    await page.keyboard.press('Escape');
    report.push({ chapter: i + 1, ...r });
  }
  for (const l of ['en', 'zh']) { const b = await page.$(`[data-lang="${l}"]`); if (b && await b.isVisible()) { await b.click(); await page.waitForTimeout(300); } }
  console.log(JSON.stringify({ file, chapters: n, errors, problems: report.filter(r => r.overflowX || r.blockErrors.length) }, null, 1));
  await browser.close();
  process.exit(errors.length || report.some(r => r.blockErrors.length) ? 1 : 0);
})();
