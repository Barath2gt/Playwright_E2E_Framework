# 📹 E2E Framework Enhancements — Video Recording, Consolidated Dashboard & Notifications

> **Audience:** QA engineers, developers, DevOps, and managers using the
> `Playwright_E2E` automation suite.
> **Goal:** Explain *what* was added, *why* it was added, and *how* it works
> end-to-end — so anyone (technical or not) can understand and use it.

---

## 1. TL;DR — What's New

| Capability | Before | After |
|---|---|---|
| Video recording | Only on failure (toggle) | **Every scenario records a video** automatically |
| Execution summary | Only Cucumber HTML | **Consolidated dashboard** (`execution-summary.html`) + machine-readable JSON |
| Failure evidence | Screenshot only | Screenshot **+ browser console log file** + video |
| Notifications | None | **Microsoft Teams + Slack + Outlook/SMTP Email** |
| Trigger | Manual (`npm run report`) | **Auto-trigger after every test run** via `posttest` hook |
| CI artifacts | Only JSON | Full `reports/**/*` archived (videos, logs, screenshots, HTML) |

---

## 2. Why These Changes?

### 2.1 Pain points we solved
1. **No visual proof** of *passing* runs → hard to debug regressions weeks later.
2. **Failure root-cause** required re-running the test locally → slow.
3. **Reports lived only on Jenkins** → testers/devs/managers had to log in to see them.
4. **No real-time alerts** when nightly suites failed → discovered next morning.
5. **No single, shareable view** of an execution (videos, screenshots, durations, errors).

### 2.2 Business value
- **Faster triage** — failure reason, screenshot, log, and video in one place.
- **Better collaboration** — one Teams/Slack message replaces 10 Jenkins clicks.
- **Audit & evidence** — every run produces a reproducible video trail.
- **Zero manual steps** — reports + notifications fire automatically post-run.

---

## 3. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                       npm test (Cucumber)                    │
│                                                              │
│   ┌──────────┐   per scenario   ┌────────────────────────┐   │
│   │ World.js │ ───────────────► │  Playwright context     │   │
│   │          │                  │  • viewport             │   │
│   │ openBrowser()               │  • recordVideo (NEW)    │   │
│   │ closeBrowser() ─► flushes ─►│  • console log capture  │   │
│   └──────────┘                  └────────────────────────┘   │
│        │                                                     │
│        ▼                                                     │
│   ┌──────────┐                                               │
│   │ Hooks.js │  Before/After: screenshot, rename video,      │
│   │          │  write log file, push result into tracker     │
│   └──────────┘                                               │
│        │                                                     │
│        ▼                                                     │
│   ┌──────────────────┐                                       │
│   │ executionTracker │  in-memory results aggregator         │
│   └──────────────────┘                                       │
│        │                                                     │
│        ▼                                                     │
│   AfterAll → writes  reports/execution-summary.json          │
└──────────────────────────────────────────────────────────────┘
              │
              ▼  (npm `posttest` runs automatically)
┌──────────────────────────────────────────────────────────────┐
│                  utils/generateReport.js                     │
│   1. Reads execution-summary.json                            │
│   2. Builds reports/execution-summary.html (DASHBOARD)       │
│   3. Calls utils/notifier.js                                 │
└──────────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────────┐
│                       utils/notifier.js                      │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐  │
│  │ MS Teams     │   │ Slack        │   │ Outlook / SMTP   │  │
│  │ Webhook      │   │ Webhook      │   │ HTML email +     │  │
│  │ MessageCard  │   │ Block Kit    │   │ attachments      │  │
│  └──────────────┘   └──────────────┘   └──────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. File-by-File Changes

### 4.1 [support/world.js](support/world.js) — Browser & Recording
**Why:** The `World` is created per scenario, so it's the right place to start
a fresh Playwright context with `recordVideo` enabled.

**What changed:**
- New config flags read from `.env`:
  - `RECORD_VIDEO` (default `true`)
  - `VIDEO_WIDTH` / `VIDEO_HEIGHT`
  - `VIDEOS_DIR` (default `reports/videos`)
- Browser context is created with `recordVideo` so **every scenario produces a
  `.webm` file**.
- `consoleLogs[]` collects browser console + page errors during the scenario.
- `closeBrowser()` now returns the *raw* video file path (Playwright assigns a
  random filename) so hooks can rename it.

### 4.2 [support/hooks.js](support/hooks.js) — Lifecycle Glue
**Why:** Cucumber hooks are the only place that knows the scenario name AND
the result. We use them to label artifacts and aggregate results.

**What changed:**
- `BeforeAll` ensures `reports/`, `reports/screenshots/`, `reports/videos/`,
  `reports/logs/` exist; calls `tracker.start()`.
- `Before(scenario)` records start time and scenario name, then opens browser.
- `After(scenario)` (single consolidated hook):
  1. On failure → take a full-page screenshot.
  2. `closeBrowser()` → flushes the video file.
  3. **Renames** the random Playwright video to
     `reports/videos/<STATUS>_<scenario>_<timestamp>.webm` so it's
     human-identifiable.
  4. Writes browser console output to `reports/logs/<scenario>.log`.
  5. Attaches a `🎥 Video: …` line to the Cucumber HTML report.
  6. Pushes a structured record into the **execution tracker**.
- `AfterAll` → flushes `reports/execution-summary.json` and prints totals.

### 4.3 [utils/executionTracker.js](utils/executionTracker.js) — Results Store
**Why:** We need a single, structured source of truth that both the dashboard
and the notifier can consume — independent of Cucumber's JSON shape.

**What it does:**
- Holds an in-memory list of scenario results during the run.
- Each entry: `{ name, tags, status, durationMs, error, videoPath,
  screenshotPath, logPath }`.
- On `finish()` writes a JSON file with totals + every scenario.

### 4.4 [utils/generateReport.js](utils/generateReport.js) — Dashboard Builder
**Why:** Cucumber's stock HTML doesn't show videos, durations per scenario, or
a manager-friendly summary. We need a single shareable page.

**What it does:**
- Reads `reports/execution-summary.json`.
- Generates `reports/execution-summary.html` containing:
  - Pass/Fail banner, totals cards, build info.
  - One row per scenario with:
    - Status pill, scenario name + tags
    - Duration
    - **Embedded `<video>` player** (plays the per-scenario `.webm`)
    - Screenshot thumbnail (clickable)
    - Console log link
    - Failure reason in a styled `<pre>` block
- Then **calls `notifier.notifyAll()`** automatically.
- Skip notifications by setting `NOTIFY=false`.

### 4.5 [utils/notifier.js](utils/notifier.js) — Multi-Channel Alerts
**Why:** Teams/Slack/Email all have different APIs. One module, three senders,
all driven by environment variables — disable any channel by leaving its env
empty.

**Channels:**

| Channel | Mechanism | Env vars |
|---|---|---|
| **Microsoft Teams** | Incoming Webhook → MessageCard JSON | `TEAMS_WEBHOOK_URL` |
| **Slack** | Incoming Webhook → Block Kit JSON | `SLACK_WEBHOOK_URL` |
| **Outlook / SMTP Email** | `nodemailer` SMTP transport, HTML body + attachments | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `EMAIL_TO`, `EMAIL_SUBJECT_PREFIX` |

**Common behavior:**
- Subject/title shows **PASS/FAIL** + counts.
- Each scenario is rendered as a row with status, duration, and links to the
  video, screenshot, and log.
- Failure reason (first line) shown inline.
- Email additionally **attaches** `execution-summary.json` and the HTML reports.

### 4.6 [.env](.env) — New Configuration
```ini
# Video recording
RECORD_VIDEO=true
VIDEO_WIDTH=1280
VIDEO_HEIGHT=800
VIDEOS_DIR=reports/videos

# Master switch
NOTIFY=true

# Teams / Slack
TEAMS_WEBHOOK_URL=
SLACK_WEBHOOK_URL=

# Outlook / SMTP
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=
EMAIL_TO=
EMAIL_SUBJECT_PREFIX=[E2E]

# Public URL where reports/ is hosted (Jenkins artifact root, S3, etc.)
# Makes video/screenshot/log links clickable in notifications
REPORT_BASE_URL=
BUILD_ID=
BUILD_URL=
```

### 4.7 [package.json](package.json) — Auto-trigger
- Added `nodemailer` dev dependency.
- Added **`posttest*`** scripts — npm runs them automatically after the matching
  `test*` script:
  ```jsonc
  "posttest":            "node utils/generateReport.js",
  "posttest:smoke":      "node utils/generateReport.js",
  "posttest:regression": "node utils/generateReport.js",
  "posttest:booking":    "node utils/generateReport.js"
  ```
- New `npm run notify` to **resend** notifications without re-running tests.

### 4.8 [Jenkinsfile](Jenkinsfile) — CI Wiring
- Exports `RECORD_VIDEO`, `NOTIFY`, `BUILD_ID`, `BUILD_URL`,
  `REPORT_BASE_URL=${BUILD_URL}artifact/reports` so notification links
  resolve to the Jenkins artifact server.
- `publishHTML` now publishes both `execution-summary.html` and
  `cucumber-report.html`.
- `archiveArtifacts` now stores **the entire `reports/**/*` tree** —
  videos, screenshots, logs, JSON, HTML.

---

## 5. How a Single Scenario Flows

```
Before  ─►  openBrowser()
              └─ Playwright context with recordVideo started
              └─ page.on('console') → consoleLogs[]
   ▼
Steps execute (Given / When / Then …)
   ▼
After   ─►  if FAILED → takeScreenshot()
        ─►  closeBrowser()           ← writes raw .webm to disk
        ─►  rename .webm to PASSED_BookSingleRoom_2026-05-11T12-30-00-000Z.webm
        ─►  write reports/logs/BookSingleRoom.log
        ─►  attach video reference to Cucumber HTML
        ─►  tracker.record({...})
   ▼
AfterAll ─► tracker.finish() → reports/execution-summary.json
   ▼
posttest ─► generateReport.js
              ├─ build reports/execution-summary.html (dashboard)
              └─ notifier.notifyAll()
                    ├─ Teams  webhook
                    ├─ Slack  webhook
                    └─ Email  via SMTP
```

---

## 6. Quick Start

### 6.1 First-time setup
```powershell
cd C:\Playwright_E2E
npm install            # installs nodemailer + existing deps
```

Open [.env](.env) and fill in any of:
- `TEAMS_WEBHOOK_URL` (Teams channel → Connectors → Incoming Webhook)
- `SLACK_WEBHOOK_URL` (Slack app → Incoming Webhooks)
- SMTP block (Office 365: `smtp.office365.com`, port `587`, secure `false`)

> Leave a value blank to **disable that channel**. Set `NOTIFY=false` to disable
> all notifications.

### 6.2 Run tests
```powershell
npm test                 # full suite + report + notifications
npm run test:smoke       # smoke + report + notifications
npm run test:regression  # regression + report + notifications
```

### 6.3 Resend notifications without re-running tests
```powershell
npm run notify
```

### 6.4 Where to look afterwards
| File | Purpose |
|---|---|
| [reports/execution-summary.html](reports/execution-summary.html) | **Manager-friendly dashboard** with embedded videos |
| [reports/cucumber-report.html](reports/cucumber-report.html) | Standard Cucumber report (with video links attached) |
| `reports/execution-summary.json` | Machine-readable summary (for dashboards, BI, etc.) |
| `reports/videos/*.webm` | One video per scenario, named by status + scenario |
| `reports/screenshots/*.png` | Failure screenshots |
| `reports/logs/*.log` | Browser console logs per scenario |

---

## 7. Notification Examples

### 7.1 Microsoft Teams
- Card title: **E2E Test Execution Report** with green/red theme.
- Facts: Total / Passed / Failed / Skipped / Duration / Build.
- Per-scenario list with `🎥 Video`, `📸 Screenshot`, `📜 Log` links.
- "Open Build" button when `BUILD_URL` is set.

### 7.2 Slack
- Header block — `✅ Test Execution PASSED` or `❌ Test Execution FAILED`.
- Stats grid (totals).
- Per-scenario sections with linked artifacts and inline failure reason.

### 7.3 Outlook / SMTP Email
- Subject: `[E2E] PASS — 8/8 passed` or `[E2E] FAIL — 6/8 passed`.
- HTML body: stats line + table of every scenario (status, name, duration,
  artifact links, failure reason).
- Attachments: `execution-summary.json`, `execution-summary.html`,
  `cucumber-report.html`.

> **Tip — clickable links:** Local file paths can't be opened from a chat
> message. Set `REPORT_BASE_URL` to a URL that serves your `reports/` folder
> (Jenkins artifact URL, S3 bucket, internal web server). The notifier will
> rewrite all artifact paths to `<REPORT_BASE_URL>/<relative-path>`.

---

## 8. Configuration Cheat-Sheet

| Variable | Default | Purpose |
|---|---|---|
| `RECORD_VIDEO` | `true` | Record a video for every scenario |
| `VIDEO_WIDTH` / `VIDEO_HEIGHT` | `1280` / `800` | Video resolution |
| `VIDEOS_DIR` | `reports/videos` | Where final renamed videos land |
| `SCREENSHOTS_DIR` | `reports/screenshots` | Failure screenshots |
| `TAKE_SCREENSHOT_ON_FAIL` | `true` | Toggle failure screenshots |
| `NOTIFY` | `true` | Master switch for all channels |
| `TEAMS_WEBHOOK_URL` | — | Enable Teams notifications |
| `SLACK_WEBHOOK_URL` | — | Enable Slack notifications |
| `SMTP_*`, `EMAIL_*` | — | Enable email notifications |
| `REPORT_BASE_URL` | — | Make artifact links clickable |
| `BUILD_ID` / `BUILD_URL` | auto in CI | Shown in notifications |

---

## 9. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `videos/` empty | `RECORD_VIDEO=false`, or browser crashed before context closed | Set `RECORD_VIDEO=true`; check console for `closeBrowser error` |
| Video file size 0 KB | `context.close()` not awaited | Already handled; ensure no custom hooks call `browser.close()` first |
| No notifications sent | All channel envs blank, or `NOTIFY=false` | Populate at least one channel's env vars |
| Email "skipped: nodemailer not installed" | Dependency missing | `npm install` |
| Links in Teams/Slack don't open | `REPORT_BASE_URL` not set | Set it to a public URL that serves `reports/` |
| `posttest` not running | Using a non-`npm test` command | Run via npm scripts, or call `npm run report` manually |

---

## 10. Extending the Framework

- **Add a new channel** (e.g. PagerDuty, Webex): create a `sendXyz()` in
  [utils/notifier.js](utils/notifier.js) and call it from `notifyAll()`.
- **Add custom fields** to the dashboard: extend the record pushed in
  [support/hooks.js](support/hooks.js) and render it in
  [utils/generateReport.js](utils/generateReport.js).
- **Per-tag video disable** (e.g. skip videos for `@perf`): in `Before` hook,
  toggle `this.config.recordVideo = false` before `openBrowser()`.
- **Upload videos to cloud**: in the `After` hook (after rename) push the file
  to S3/Azure Blob and set the URL on the tracker record so notifications link
  to the cloud URL automatically.

---

**Owner:** QA Automation
**Last updated:** 2026-05-11
