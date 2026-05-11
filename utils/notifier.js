'use strict';

/**
 * Post-execution notifier.
 * Sends test execution summary + links to Microsoft Teams, Slack, and Email
 * based on env configuration. Uses native fetch (Node 18+).
 *
 * Env vars:
 *   TEAMS_WEBHOOK_URL
 *   SLACK_WEBHOOK_URL
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS
 *   EMAIL_FROM, EMAIL_TO, EMAIL_SUBJECT_PREFIX
 *   REPORT_BASE_URL  (e.g. Jenkins build URL — used to deep-link videos/logs)
 *   BUILD_ID, BUILD_URL  (optional)
 */

const fs = require('fs');
const path = require('path');

const REPORTS_DIR = process.env.REPORTS_DIR || 'reports';
const SUMMARY_FILE = path.join(REPORTS_DIR, 'execution-summary.json');

function loadSummary() {
  if (!fs.existsSync(SUMMARY_FILE)) {
    throw new Error(`Summary not found: ${SUMMARY_FILE}. Run tests first.`);
  }
  return JSON.parse(fs.readFileSync(SUMMARY_FILE, 'utf-8'));
}

function fmtMs(ms) {
  const s = Math.round(ms / 100) / 10;
  return `${s}s`;
}

function linkFor(p) {
  if (!p) return null;
  const base = process.env.REPORT_BASE_URL;
  const rel = path.relative(process.cwd(), p).replace(/\\/g, '/');
  return base ? `${base.replace(/\/$/, '')}/${rel}` : rel;
}

function buildPlainSummary(summary) {
  const t = summary.totals;
  const overall = t.failed === 0 ? 'PASS ✅' : 'FAIL ❌';
  const lines = [];
  lines.push(`Test Execution Result: ${overall}`);
  if (process.env.BUILD_ID) lines.push(`Build: ${process.env.BUILD_ID}`);
  lines.push(`Started: ${summary.startedAt}`);
  lines.push(`Finished: ${summary.finishedAt}`);
  lines.push(`Total: ${t.total} | Passed: ${t.passed} | Failed: ${t.failed} | Skipped: ${t.skipped}`);
  lines.push(`Duration: ${fmtMs(t.durationMs)}`);
  lines.push('');
  summary.scenarios.forEach((s) => {
    const icon = s.status === 'PASSED' ? '✅' : s.status === 'FAILED' ? '❌' : '⏭️';
    lines.push(`${icon} ${s.name} (${fmtMs(s.durationMs)})`);
    if (s.videoPath) lines.push(`   🎥 ${linkFor(s.videoPath)}`);
    if (s.screenshotPath) lines.push(`   📸 ${linkFor(s.screenshotPath)}`);
    if (s.logPath) lines.push(`   📜 ${linkFor(s.logPath)}`);
    if (s.error) lines.push(`   ⚠️  ${String(s.error).split('\n')[0]}`);
  });
  return lines.join('\n');
}

/* ──────────────────────────────────────────────────────────── Teams */
async function sendTeams(summary) {
  const url = process.env.TEAMS_WEBHOOK_URL;
  if (!url) return { skipped: 'TEAMS_WEBHOOK_URL not set' };

  const t = summary.totals;
  const color = t.failed === 0 ? '2EB886' : 'D93F3F';
  const facts = [
    { name: 'Total', value: String(t.total) },
    { name: 'Passed', value: String(t.passed) },
    { name: 'Failed', value: String(t.failed) },
    { name: 'Skipped', value: String(t.skipped) },
    { name: 'Duration', value: fmtMs(t.durationMs) }
  ];
  if (process.env.BUILD_ID) facts.push({ name: 'Build', value: process.env.BUILD_ID });

  const sections = [{
    activityTitle: `**Test Execution ${t.failed === 0 ? 'PASSED ✅' : 'FAILED ❌'}**`,
    facts,
    markdown: true
  }];

  const scenarioText = summary.scenarios.map((s) => {
    const icon = s.status === 'PASSED' ? '✅' : s.status === 'FAILED' ? '❌' : '⏭️';
    const links = [];
    if (s.videoPath) links.push(`[🎥 Video](${linkFor(s.videoPath)})`);
    if (s.screenshotPath) links.push(`[📸 Screenshot](${linkFor(s.screenshotPath)})`);
    if (s.logPath) links.push(`[📜 Log](${linkFor(s.logPath)})`);
    let line = `${icon} **${s.name}** _(${fmtMs(s.durationMs)})_  ${links.join(' · ')}`;
    if (s.error) line += `\n\n> ${String(s.error).split('\n')[0]}`;
    return line;
  }).join('\n\n');

  sections.push({ title: 'Scenarios', text: scenarioText });

  const payload = {
    '@type': 'MessageCard',
    '@context': 'https://schema.org/extensions',
    summary: 'Test Execution Report',
    themeColor: color,
    title: 'E2E Test Execution Report',
    sections,
    potentialAction: process.env.BUILD_URL ? [{
      '@type': 'OpenUri',
      name: 'Open Build',
      targets: [{ os: 'default', uri: process.env.BUILD_URL }]
    }] : []
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return { ok: res.ok, status: res.status, statusText: res.statusText };
}

/* ──────────────────────────────────────────────────────────── Slack */
async function sendSlack(summary) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return { skipped: 'SLACK_WEBHOOK_URL not set' };

  const t = summary.totals;
  const header = t.failed === 0 ? '✅ Test Execution PASSED' : '❌ Test Execution FAILED';

  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: header } },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Total:*\n${t.total}` },
        { type: 'mrkdwn', text: `*Duration:*\n${fmtMs(t.durationMs)}` },
        { type: 'mrkdwn', text: `*Passed:*\n${t.passed}` },
        { type: 'mrkdwn', text: `*Failed:*\n${t.failed}` },
        { type: 'mrkdwn', text: `*Skipped:*\n${t.skipped}` },
        { type: 'mrkdwn', text: `*Build:*\n${process.env.BUILD_ID || 'local'}` }
      ]
    },
    { type: 'divider' }
  ];

  summary.scenarios.forEach((s) => {
    const icon = s.status === 'PASSED' ? ':white_check_mark:' : s.status === 'FAILED' ? ':x:' : ':fast_forward:';
    const links = [];
    if (s.videoPath) links.push(`<${linkFor(s.videoPath)}|🎥 Video>`);
    if (s.screenshotPath) links.push(`<${linkFor(s.screenshotPath)}|📸 Screenshot>`);
    if (s.logPath) links.push(`<${linkFor(s.logPath)}|📜 Log>`);
    let text = `${icon} *${s.name}*  _(${fmtMs(s.durationMs)})_  ${links.join(' · ')}`;
    if (s.error) text += `\n> ${String(s.error).split('\n')[0]}`;
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text } });
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: header, blocks })
  });
  return { ok: res.ok, status: res.status, statusText: res.statusText };
}

/* ──────────────────────────────────────────────────────────── Email (Outlook / SMTP) */
async function sendEmail(summary) {
  const host = process.env.SMTP_HOST;
  const to = process.env.EMAIL_TO;
  if (!host || !to) return { skipped: 'SMTP_HOST or EMAIL_TO not set' };

  let nodemailer;
  try { nodemailer = require('nodemailer'); }
  catch (_) { return { skipped: 'nodemailer not installed (npm i nodemailer)' }; }

  const t = summary.totals;
  const subject = `${process.env.EMAIL_SUBJECT_PREFIX || '[E2E]'} ${t.failed === 0 ? 'PASS' : 'FAIL'} — ${t.passed}/${t.total} passed`;

  const rows = summary.scenarios.map((s) => {
    const color = s.status === 'PASSED' ? '#2EB886' : s.status === 'FAILED' ? '#D93F3F' : '#888';
    const links = [];
    if (s.videoPath) links.push(`<a href="${linkFor(s.videoPath)}">🎥 Video</a>`);
    if (s.screenshotPath) links.push(`<a href="${linkFor(s.screenshotPath)}">📸 Screenshot</a>`);
    if (s.logPath) links.push(`<a href="${linkFor(s.logPath)}">📜 Log</a>`);
    return `<tr>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;color:${color};font-weight:600">${s.status}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee">${s.name}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee">${fmtMs(s.durationMs)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee">${links.join(' &middot; ')}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;color:#a00">${s.error ? String(s.error).split('\n')[0] : ''}</td>
    </tr>`;
  }).join('');

  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif">
      <h2>E2E Test Execution Report</h2>
      <p><b>Result:</b> ${t.failed === 0 ? '✅ PASS' : '❌ FAIL'} &nbsp;|&nbsp;
         <b>Total:</b> ${t.total} &nbsp;|&nbsp;
         <b>Passed:</b> ${t.passed} &nbsp;|&nbsp;
         <b>Failed:</b> ${t.failed} &nbsp;|&nbsp;
         <b>Skipped:</b> ${t.skipped} &nbsp;|&nbsp;
         <b>Duration:</b> ${fmtMs(t.durationMs)}</p>
      ${process.env.BUILD_URL ? `<p><a href="${process.env.BUILD_URL}">Open build</a></p>` : ''}
      <table style="border-collapse:collapse;width:100%;font-size:13px">
        <thead>
          <tr style="background:#f5f5f5;text-align:left">
            <th style="padding:6px 10px">Status</th>
            <th style="padding:6px 10px">Scenario</th>
            <th style="padding:6px 10px">Duration</th>
            <th style="padding:6px 10px">Artifacts</th>
            <th style="padding:6px 10px">Failure Reason</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  const transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    } : undefined
  });

  // Attach the consolidated summary + HTML report; videos referenced by link to keep size small
  const attachments = [];
  const add = (p) => { if (p && fs.existsSync(p)) attachments.push({ path: p }); };
  add(SUMMARY_FILE);
  add(path.join(REPORTS_DIR, 'cucumber-report.html'));
  add(path.join(REPORTS_DIR, 'execution-summary.html'));

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text: buildPlainSummary(summary),
    html,
    attachments
  });

  return { ok: true, messageId: info.messageId };
}

async function notifyAll() {
  const summary = loadSummary();
  const results = {};
  results.teams = await sendTeams(summary).catch((e) => ({ error: e.message }));
  results.slack = await sendSlack(summary).catch((e) => ({ error: e.message }));
  results.email = await sendEmail(summary).catch((e) => ({ error: e.message }));
  console.log('\n📣 Notification results:');
  console.log(JSON.stringify(results, null, 2));
  return results;
}

if (require.main === module) {
  notifyAll().catch((e) => {
    console.error('Notifier failed:', e);
    process.exit(1);
  });
}

module.exports = { notifyAll, sendTeams, sendSlack, sendEmail, loadSummary };
