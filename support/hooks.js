'use strict';

const { Before, After, BeforeAll, AfterAll, Status, setDefaultTimeout } = require('@cucumber/cucumber');
const fs = require('fs');
const path = require('path');
const tracker = require('../utils/executionTracker');

setDefaultTimeout(60 * 1000);

const SUMMARY_FILE = path.join('reports', 'execution-summary.json');
const VIDEOS_DIR = process.env.VIDEOS_DIR || 'reports/videos';

function safeName(s) {
  return String(s).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
}

BeforeAll(async function () {
  ['reports', 'reports/screenshots', 'reports/videos', 'reports/logs'].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
  tracker.start();
  console.log('\n🚀 Test Suite Started — Shady Meadows B&B Booking\n');
});

Before(async function (scenario) {
  this._scenarioStart = Date.now();
  this._scenarioName = scenario.pickle.name;
  console.log(`\n▶  Starting: ${this._scenarioName}`);
  await this.openBrowser();
});

Before({ tags: '@slow' }, async function () {
  this.config.slowMo = 500;
});

/**
 * Consolidated After hook:
 *  - failure screenshot
 *  - close browser (flushes per-scenario video)
 *  - rename video to <STATUS>_<scenario>_<ts>.webm
 *  - persist console logs
 *  - attach video reference + record result for reporting/notifications
 */
After(async function (scenario) {
  const status = scenario.result.status;
  const durationMs = Date.now() - (this._scenarioStart || Date.now());
  const sName = safeName(this._scenarioName || scenario.pickle.name);

  let screenshotPath = null;
  if (status === Status.FAILED && this.config && this.config.screenshotOnFail) {
    try {
      if (this.page && !this.page.isClosed()) {
        screenshotPath = await this.takeScreenshot(`FAILED_${sName}`, true);
      }
    } catch (e) {
      console.error('   ⚠️  screenshot error:', e.message);
    }
  }

  let rawVideoPath = null;
  try {
    rawVideoPath = await this.closeBrowser();
  } catch (e) {
    console.error('   ⚠️  closeBrowser error:', e.message);
  }

  let finalVideoPath = null;
  if (rawVideoPath && fs.existsSync(rawVideoPath)) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const target = path.join(VIDEOS_DIR, `${status}_${sName}_${ts}.webm`);
    try {
      fs.renameSync(rawVideoPath, target);
      finalVideoPath = target;
    } catch (_) {
      finalVideoPath = rawVideoPath;
    }
  }

  let logPath = null;
  if (this.consoleLogs && this.consoleLogs.length) {
    logPath = path.join('reports', 'logs', `${sName}.log`);
    fs.writeFileSync(logPath, this.consoleLogs.join('\n'));
  }

  if (finalVideoPath) {
    const rel = path.relative('reports', finalVideoPath).replace(/\\/g, '/');
    try { await this.attach(`🎥 Video: ${rel}`, 'text/plain'); } catch (_) { /* ignore */ }
  }

  tracker.record({
    name: this._scenarioName || scenario.pickle.name,
    tags: (scenario.pickle.tags || []).map((t) => t.name),
    status,
    durationMs,
    error: (scenario.result && scenario.result.message) || null,
    videoPath: finalVideoPath,
    screenshotPath,
    logPath
  });

  if (status === Status.PASSED) console.log(`✅ PASSED: ${this._scenarioName} (${durationMs}ms)`);
  else if (status === Status.FAILED) console.log(`❌ FAILED: ${this._scenarioName} (${durationMs}ms)`);
  else console.log(`⏭️  ${status}: ${this._scenarioName}`);
});

AfterAll(async function () {
  const summary = tracker.finish(SUMMARY_FILE);
  console.log('\n════════════════════════════════════════════════════════');
  console.log(`  ✅ Passed: ${summary.totals.passed}  ❌ Failed: ${summary.totals.failed}  ⏭️  Skipped: ${summary.totals.skipped}  ⏱  ${summary.totals.durationMs}ms`);
  console.log('════════════════════════════════════════════════════════\n');
  console.log(`📄 Summary written to ${SUMMARY_FILE}`);
});
