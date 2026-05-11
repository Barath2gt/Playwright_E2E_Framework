'use strict';

/**
 * Builds a consolidated HTML execution summary
 * (reports/execution-summary.html) from reports/execution-summary.json,
 * then triggers notifications (Teams / Slack / Email) automatically.
 *
 * Run via:  npm run report
 */

const fs = require('fs');
const path = require('path');

const REPORTS_DIR = path.join(process.cwd(), 'reports');
const SUMMARY_JSON = path.join(REPORTS_DIR, 'execution-summary.json');
const SUMMARY_HTML = path.join(REPORTS_DIR, 'execution-summary.html');

function fmtMs(ms) { return `${Math.round((ms || 0) / 100) / 10}s`; }

function rel(p) {
  if (!p) return null;
  return path.relative(REPORTS_DIR, p).replace(/\\/g, '/');
}

function buildHtml(summary) {
  const t = summary.totals;
  const overallClass = t.failed === 0 ? 'pass' : 'fail';
  const overallText = t.failed === 0 ? 'PASSED ✅' : 'FAILED ❌';

  const rows = summary.scenarios.map((s) => {
    const cls = s.status === 'PASSED' ? 'pass' : s.status === 'FAILED' ? 'fail' : 'skip';
    const video = s.videoPath
      ? `<video src="${rel(s.videoPath)}" controls preload="none" width="320"></video>`
      : '<em>n/a</em>';
    const shot = s.screenshotPath
      ? `<a href="${rel(s.screenshotPath)}" target="_blank"><img src="${rel(s.screenshotPath)}" width="180"/></a>`
      : '';
    const log = s.logPath ? `<a href="${rel(s.logPath)}" target="_blank">log</a>` : '';
    const err = s.error ? `<pre class="err">${escapeHtml(String(s.error))}</pre>` : '';
    const tags = (s.tags || []).map((x) => `<span class="tag">${x}</span>`).join(' ');
    return `<tr class="${cls}">
      <td><span class="status ${cls}">${s.status}</span></td>
      <td><div class="name">${escapeHtml(s.name)}</div>${tags}</td>
      <td>${fmtMs(s.durationMs)}</td>
      <td>${video}</td>
      <td>${shot}${log ? '<br>' + log : ''}</td>
      <td>${err}</td>
    </tr>`;
  }).join('');

  return `<!doctype html>
<html><head><meta charset="utf-8"/>
<title>E2E Execution Summary</title>
<style>
  body{font-family:Segoe UI,Arial,sans-serif;margin:24px;color:#222}
  h1{margin:0 0 8px}
  .banner{padding:14px 18px;border-radius:8px;color:#fff;font-weight:700;display:inline-block;margin-bottom:14px}
  .banner.pass{background:#2EB886}.banner.fail{background:#D93F3F}
  .meta{color:#555;margin-bottom:14px}
  .cards{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:18px}
  .card{padding:10px 16px;border-radius:8px;background:#f3f4f6;min-width:120px}
  .card b{font-size:22px;display:block}
  table{border-collapse:collapse;width:100%;font-size:13px}
  th,td{border-bottom:1px solid #eee;padding:10px;vertical-align:top;text-align:left}
  th{background:#f5f5f5}
  .status{padding:3px 8px;border-radius:4px;color:#fff;font-weight:700;font-size:11px}
  .status.pass{background:#2EB886}.status.fail{background:#D93F3F}.status.skip{background:#888}
  .name{font-weight:600;margin-bottom:4px}
  .tag{display:inline-block;background:#eef;border-radius:3px;padding:1px 6px;margin-right:4px;font-size:11px;color:#33a}
  .err{background:#fff4f4;border-left:3px solid #D93F3F;padding:6px;margin:0;white-space:pre-wrap;font-size:12px;max-width:480px}
  video{background:#000;border-radius:4px}
</style></head>
<body>
  <h1>E2E Execution Summary</h1>
  <div class="banner ${overallClass}">${overallText}</div>
  <div class="meta">
    <b>Started:</b> ${summary.startedAt} &nbsp; <b>Finished:</b> ${summary.finishedAt}
    ${process.env.BUILD_ID ? `&nbsp; <b>Build:</b> ${process.env.BUILD_ID}` : ''}
  </div>
  <div class="cards">
    <div class="card">Total<b>${t.total}</b></div>
    <div class="card">Passed<b style="color:#2EB886">${t.passed}</b></div>
    <div class="card">Failed<b style="color:#D93F3F">${t.failed}</b></div>
    <div class="card">Skipped<b>${t.skipped}</b></div>
    <div class="card">Duration<b>${fmtMs(t.durationMs)}</b></div>
  </div>
  <table>
    <thead><tr>
      <th>Status</th><th>Scenario</th><th>Duration</th><th>Video</th><th>Screenshot / Log</th><th>Failure Reason</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body></html>`;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function printReportLinks() {
  console.log('\n════════════════════════════════════════════════════════');
  console.log('  📊  TEST REPORTS');
  console.log('════════════════════════════════════════════════════════');
  const files = [
    'cucumber-report.html',
    'execution-summary.html',
    'execution-summary.json',
    'cucumber-report.json'
  ];
  files.forEach((f) => {
    const p = path.join(REPORTS_DIR, f);
    if (fs.existsSync(p)) console.log(`  • file://${p}`);
  });
  ['videos', 'screenshots', 'logs'].forEach((d) => {
    const p = path.join(REPORTS_DIR, d);
    if (fs.existsSync(p)) {
      const n = fs.readdirSync(p).length;
      console.log(`  • ${d}: ${n} file(s) — ${p}`);
    }
  });
  console.log('════════════════════════════════════════════════════════\n');
}

async function main() {
  if (!fs.existsSync(SUMMARY_JSON)) {
    console.warn(`⚠️  ${SUMMARY_JSON} not found — did the test run complete?`);
    printReportLinks();
    return;
  }

  const summary = JSON.parse(fs.readFileSync(SUMMARY_JSON, 'utf-8'));
  fs.writeFileSync(SUMMARY_HTML, buildHtml(summary));
  console.log(`✅ Consolidated HTML summary: ${SUMMARY_HTML}`);

  printReportLinks();

  if (process.env.NOTIFY === 'false') {
    console.log('🔕 NOTIFY=false — skipping notifications.');
    return;
  }

  try {
    const { notifyAll } = require('./notifier');
    await notifyAll();
  } catch (e) {
    console.error('Notifier error:', e.message);
  }
}

main();

