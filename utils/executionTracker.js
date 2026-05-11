'use strict';

/**
 * In-memory aggregator for scenario execution results.
 * Persisted to reports/execution-summary.json by the AfterAll hook
 * and consumed by utils/generateReport.js + utils/notifier.js.
 */
const fs = require('fs');
const path = require('path');

const state = {
  startedAt: null,
  finishedAt: null,
  scenarios: []
};

function start() {
  state.startedAt = new Date().toISOString();
}

function record(entry) {
  state.scenarios.push(entry);
}

function finish(outFile) {
  state.finishedAt = new Date().toISOString();

  const total = state.scenarios.length;
  const passed = state.scenarios.filter((s) => s.status === 'PASSED').length;
  const failed = state.scenarios.filter((s) => s.status === 'FAILED').length;
  const skipped = state.scenarios.filter((s) => s.status === 'SKIPPED').length;
  const durationMs = state.scenarios.reduce((a, s) => a + (s.durationMs || 0), 0);

  const summary = {
    startedAt: state.startedAt,
    finishedAt: state.finishedAt,
    totals: { total, passed, failed, skipped, durationMs },
    scenarios: state.scenarios
  };

  const dir = path.dirname(outFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(summary, null, 2));
  return summary;
}

module.exports = { start, record, finish, state };
