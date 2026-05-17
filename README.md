# 🏨 Playwright BDD E2E Framework — Shady Meadows B&B

> A robust, production-ready End-to-End test automation framework built with **Playwright** + **Cucumber BDD** for the [Shady Meadows B&B](https://automationintesting.online/) booking application.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Installation](#installation)
6. [Configuration](#configuration)
7. [Running Tests](#running-tests)
8. [Test Scenarios](#test-scenarios)
9. [Page Object Model](#page-object-model)
10. [Utilities](#utilities)
11. [Reports & Artifacts](#reports--artifacts)
12. [CI/CD Integration — Jenkins](#cicd-integration--jenkins)
13. [Framework Architecture](#framework-architecture)
14. [Best Practices](#best-practices)

---

## Overview

This framework automates the complete room booking workflow on the **Shady Meadows B&B** website. It covers:

- ✅ Homepage navigation and availability checking
- ✅ Booking Single, Double, and Suite rooms
- ✅ Direct URL navigation to reservation pages
- ✅ Guest form submission and booking confirmation
- ✅ Screenshot capture on failure
- ✅ Video recording for every scenario
- ✅ Execution summary reports (HTML + JSON)
- ✅ Jenkins CI/CD pipeline integration

---

## Technology Stack

| Tool / Library | Version | Purpose |
|---|---|---|
| [Playwright](https://playwright.dev/) | ^1.52.0 | Browser automation engine |
| [@cucumber/cucumber](https://cucumber.io/) | 9.6.0 | BDD test runner & Gherkin support |
| [@cucumber/html-formatter](https://github.com/cucumber/html-formatter) | ^21.7.0 | HTML test reports |
| [Chai](https://www.chaijs.com/) | ^5.2.0 | Assertion library |
| [dotenv](https://github.com/motdotla/dotenv) | ^16.4.7 | Environment variable management |
| [nodemailer](https://nodemailer.com/) | ^8.0.7 | Email notifications |
| Node.js | ≥18.x | Runtime environment |
| Jenkins | — | CI/CD pipeline orchestration |

---

## Project Structure

```
Playwright_E2E/
├── features/
│   └── booking.feature          # Gherkin test scenarios (Smoke, Regression, Direct)
│
├── step-definitions/
│   └── bookingSteps.js          # Cucumber step implementations
│
├── pages/
│   ├── HomePage.js              # POM — Homepage (availability check, room listing)
│   └── ReservationPage.js       # POM — Reservation page (booking form, confirmation)
│
├── support/
│   ├── world.js                 # Cucumber World — shared browser/page context
│   └── hooks.js                 # Before/After hooks (browser lifecycle, screenshots, videos)
│
├── test-data/
│   └── bookingData.js           # Centralized test data (rooms, dates, guest details)
│
├── utils/
│   ├── helpers.js               # Reusable Playwright utilities
│   ├── executionTracker.js      # Tracks pass/fail/skip results per run
│   ├── generateReport.js        # Generates HTML execution summary
│   └── notifier.js              # Email notification sender
│
├── reports/                     # Auto-generated test artifacts (gitignored)
│   ├── cucumber-report.html     # Cucumber HTML report
│   ├── cucumber-report.json     # Cucumber JSON report
│   ├── execution-summary.html   # Custom execution summary
│   ├── execution-summary.json   # Raw results JSON
│   ├── screenshots/             # Failure screenshots
│   ├── videos/                  # Scenario recordings (.webm)
│   └── logs/                    # Console logs per scenario
│
├── docs/
│   ├── FRAMEWORK_ENHANCEMENTS.md
│   └── Framework_Enhancements.pptx
│
├── cucumber.config.cjs          # Cucumber configuration (CommonJS)
├── cucumber.config.js           # Cucumber configuration (ESM)
├── .cucumber.yml                # Cucumber profile definitions
├── Jenkinsfile                  # Jenkins declarative pipeline
├── package.json                 # NPM scripts and dependencies
├── .env                         # Environment variables (not committed)
├── .gitignore                   # Git exclusion rules
└── README.md                    # Project documentation
```

---

## Prerequisites

Make sure the following are installed on your machine before proceeding:

- **Node.js** v18 or higher → [Download](https://nodejs.org/)
- **npm** v9 or higher (comes with Node.js)
- **Git** → [Download](https://git-scm.com/)
- **Jenkins** (for CI/CD only) → [Download](https://www.jenkins.io/)

Verify your versions:

```bash
node --version
npm --version
git --version
```

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Barath2gt/Playwright_E2E_Framework.git
cd Playwright_E2E_Framework
```

### 2. Install Node.js Dependencies

```bash
npm install
```

### 3. Install Playwright Browsers

```bash
npx playwright install --with-deps chromium
```

> This installs Chromium along with all required OS-level dependencies.

### 4. Set Up Environment Variables

Create a `.env` file in the project root:

```env
# Application URL
BASE_URL=https://automationintesting.online

# Browser settings
HEADLESS=true
SLOW_MO=0

# Video recording
RECORD_VIDEO=true
VIDEOS_DIR=reports/videos

# Notifications (optional)
NOTIFY=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
NOTIFY_TO=team@example.com
```

> ⚠️ The `.env` file is excluded from version control. Never commit sensitive credentials.

---

## Configuration

### Cucumber Configuration (`cucumber.config.cjs`)

```js
module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    require: [
      'support/world.js',
      'support/hooks.js',
      'step-definitions/**/*.js'
    ],
    format: [
      'progress',
      ['json', 'reports/cucumber-report.json'],
      ['html', 'reports/cucumber-report.html']
    ],
    formatOptions: {
      snippetInterface: 'async-await'
    }
  }
};
```

### Default Timeout

All steps have a **60-second** default timeout (configured in `support/hooks.js`).

---

## Running Tests

All test commands are defined in `package.json` under `scripts`.

### Run All Tests

```bash
npm test
```

### Run Smoke Tests Only

```bash
npm run test:smoke
```

### Run Regression Tests Only

```bash
npm run test:regression
```

### Run Booking Tests Only

```bash
npm run test:booking
```

### Run Tests in Headed Mode (Browser Visible)

```bash
npm run test:headed
```

### Run Tests in Parallel (2 workers)

```bash
npm run test:parallel
```

### Generate HTML Report Manually

```bash
npm run report
```

### Send Email Notification

```bash
npm run notify
```

---

## Test Scenarios

All scenarios are defined in `features/booking.feature`.

### 🟢 Smoke Tests — `@smoke`

Fast, critical path tests using **direct URL navigation** (avoids calendar availability conflicts).

| Scenario | Room | Check-In | Check-Out |
|---|---|---|---|
| Successfully book a Single room via direct navigation | Single | 2026-09-01 | 2026-09-05 |
| Successfully book a Double room via direct navigation | Double | 2026-09-01 | 2026-09-05 |

### 🔵 Regression Tests — `@regression`

Data-driven tests using **Scenario Outline** covering all room types through the full UI booking flow.

| Room Type | Check-In | Check-Out | Guest |
|---|---|---|---|
| Single | 2026-07-01 | 2026-07-03 | James Brown |
| Double | 2026-07-05 | 2026-07-08 | Emma Wilson |
| Suite | 2026-07-10 | 2026-07-14 | Oliver Taylor |

### 🟣 Premium Tests — `@regression @premium`

| Scenario | Room | Duration |
|---|---|---|
| Book the Suite room for a longer stay | Suite | 2026-08-01 → 2026-08-07 (6 nights) |

### 🔗 Direct Navigation Tests — `@direct`

| Scenario | Room |
|---|---|
| Directly navigate to reservation page and complete booking | Single |

---

## Page Object Model

### `pages/HomePage.js`

Encapsulates all interactions with `https://automationintesting.online/`.

| Method | Description |
|---|---|
| `goto(baseUrl)` | Navigate to homepage |
| `getPageTitle()` | Get hero heading text |
| `setCheckInDate(date)` | Fill check-in date (YYYY-MM-DD) |
| `setCheckOutDate(date)` | Fill check-out date (YYYY-MM-DD) |
| `clickCheckAvailability()` | Click the availability search button |
| `areRoomsVisible()` | Assert rooms section is displayed |
| `getVisibleRoomNames()` | Get list of room names from the page |
| `clickBookNowForRoom(roomType)` | Click "Book now" for Single/Double/Suite |
| `getRoomPrice(roomType)` | Get displayed price for a room type |

### `pages/ReservationPage.js`

Encapsulates all interactions with `/reservation/{id}?checkin=...&checkout=...`.

| Method | Description |
|---|---|
| `goto(roomId, checkIn, checkOut)` | Navigate directly to reservation page |
| `getRoomTitle()` | Get the room heading text |
| `isPriceSummaryVisible()` | Assert price summary section is shown |
| `getTotalPrice()` | Get the total price text |
| `clickReserveNow()` | Open the booking form |
| `fillBookingForm(guestDetails)` | Fill all guest fields at once |
| `fillFirstname(value)` | Fill first name field |
| `fillLastname(value)` | Fill last name field |
| `fillEmail(value)` | Fill email field |
| `fillPhone(value)` | Fill phone field |
| `submitBooking()` | Click confirm/submit booking button |
| `isBookingConfirmed(timeout)` | Wait for and verify confirmation |
| `getConfirmationText()` | Get confirmation message text |

---

## Utilities

### `utils/helpers.js`

Reusable Playwright utility functions used across page objects.

| Function | Description |
|---|---|
| `clickElement(page, selector)` | Wait for element visibility then click |
| `fillInput(page, selector, value)` | Clear and fill an input field |
| `getElementText(page, selector)` | Get trimmed text content of an element |
| `isElementVisible(page, selector)` | Returns `true` if element is visible |
| `scrollIntoView(page, selector)` | Scroll element into the viewport |
| `waitForUrl(page, pattern)` | Wait for URL to match a pattern/regex |
| `retryAction(action, maxRetries)` | Retry a flaky action up to N times |
| `selectCalendarDate(page, dateString)` | Click a day on a calendar widget |
| `getFutureDate(daysFromToday)` | Get YYYY-MM-DD for a future date |
| `formatDate(date)` | Format a Date object to YYYY-MM-DD |
| `ensureDir(dirPath)` | Create directory if it doesn't exist |
| `parseDataTable(dataTable)` | Parse Cucumber DataTable to object array |

### `test-data/bookingData.js`

Centralized, reusable test data.

```js
ROOM_TYPES    // Single (id:1, £100/night), Double (id:2, £150/night), Suite (id:3, £225/night)
BOOKING_DATES // standard (2 nights), longStay (7 nights), weekend (2 nights) — all dynamic
GUEST_DETAILS // primary, secondary, tertiary guest profiles
EXPECTED_MESSAGES // confirmation text, availability heading
FEES          // cleaningFee: £25, serviceFee: £15
```

### `utils/executionTracker.js`

Tracks each scenario's result during a run. Stores name, tags, status, duration, error, video path, screenshot path, and log path. Writes `reports/execution-summary.json` at the end.

### `utils/generateReport.js`

Reads `execution-summary.json` and `cucumber-report.json` to generate a styled `reports/execution-summary.html` report.

### `utils/notifier.js`

Sends an email report via **nodemailer** using SMTP credentials from `.env` after a test run.

---

## Reports & Artifacts

After each test run, the following are generated in the `reports/` directory:

| Artifact | Path | Description |
|---|---|---|
| Cucumber HTML Report | `reports/cucumber-report.html` | Full Cucumber step-by-step report |
| Cucumber JSON Report | `reports/cucumber-report.json` | Machine-readable results |
| Execution Summary HTML | `reports/execution-summary.html` | Custom styled summary dashboard |
| Execution Summary JSON | `reports/execution-summary.json` | Raw results for integrations |
| Screenshots | `reports/screenshots/FAILED_*.png` | Captured only on scenario failure |
| Videos | `reports/videos/<STATUS>_<name>_<ts>.webm` | Recorded for every scenario |
| Console Logs | `reports/logs/<scenario_name>.log` | Browser console output per scenario |

> 📌 All report files are excluded from version control via `.gitignore` (except the `reports/` folder structure).

---

## CI/CD Integration — Jenkins

The `Jenkinsfile` defines a **declarative pipeline** with the following stages:

```
Install Dependencies → Install Playwright Browsers → Run Smoke Tests → Generate Report
```

### Pipeline Stages

| Stage | Command | Description |
|---|---|---|
| Install Dependencies | `npm ci` | Clean install of node_modules |
| Install Playwright Browsers | `npx playwright install --with-deps chromium` | Download Chromium |
| Run Smoke Tests | `npm run test:smoke` | Execute `@smoke` tagged scenarios |
| Generate Report | `npm run report` | Produce HTML execution summary |

### Post-Build Actions

- **Always**: Publishes `execution-summary.html` and `cucumber-report.html` via `publishHTML`; archives all `reports/**/*` artifacts.
- **Success**: Logs ✅ confirmation.
- **Unstable**: Logs ⚠️ warning (test failures, pipeline continues).
- **Failure**: Logs ❌ error for pipeline/infrastructure issues.

### Pipeline Environment Variables

```groovy
HEADLESS      = 'true'
RECORD_VIDEO  = 'true'
NOTIFY        = 'true'
BUILD_ID      = "${env.BUILD_NUMBER}"
BUILD_URL     = "${env.BUILD_URL}"
```

### Setting Up Jenkins

1. Create a new **Pipeline** job in Jenkins.
2. Set the pipeline definition to **Pipeline script from SCM**.
3. Point to this GitHub repository with branch `main`.
4. Set the **Script Path** to `Jenkinsfile`.
5. Save and trigger a build.

---

## Framework Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Cucumber BDD Layer                       │
│  features/*.feature  ──►  step-definitions/*.js            │
└──────────────────────────────┬──────────────────────────────┘
                               │ uses
┌──────────────────────────────▼──────────────────────────────┐
│                  Page Object Model (POM)                    │
│         pages/HomePage.js   pages/ReservationPage.js        │
└──────────────────────────────┬──────────────────────────────┘
                               │ uses
┌──────────────────────────────▼──────────────────────────────┐
│              Playwright Browser Automation                  │
│           support/world.js  (browser / page context)        │
└──────────────────────────────┬──────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌───────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ support/      │   │ utils/           │   │ test-data/       │
│ hooks.js      │   │ helpers.js       │   │ bookingData.js   │
│ (lifecycle)   │   │ (reusable fns)   │   │ (test data)      │
└───────────────┘   └──────────────────┘   └──────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                     Reporting Layer                         │
│  executionTracker.js → generateReport.js → notifier.js      │
│  reports/ (HTML, JSON, screenshots, videos, logs)           │
└─────────────────────────────────────────────────────────────┘
```

---

## Best Practices

- **Page Object Model (POM)**: All UI locators and actions are encapsulated in page classes — no selectors in step definitions.
- **Multiple Selector Strategy**: Each locator uses fallback selectors for robustness against minor UI changes.
- **Dynamic Test Data**: Booking dates are computed relative to today using `getFutureDate()` to prevent date staleness.
- **Tag-Based Execution**: Tests are organized with `@smoke`, `@regression`, `@booking`, `@premium`, and `@direct` tags for selective execution.
- **Video + Screenshot on Failure**: Every scenario is recorded; screenshots are taken automatically on failure.
- **Default Timeout**: A global 60-second step timeout prevents indefinite hangs.
- **Retry Utility**: `retryAction()` in helpers handles transient flakiness without duplicating retry logic.
- **Environment Variables**: All configuration (URL, headless, SMTP) is externalized via `.env`.
- **CI-Ready**: The Jenkins pipeline runs headlessly with artifact archiving and HTML report publishing built in.

---

## 📬 Contact

Repository: [https://github.com/Barath2gt/Playwright_E2E_Framework](https://github.com/Barath2gt/Playwright_E2E_Framework)

---

*Framework maintained for the Shady Meadows B&B automation challenge at [automationintesting.online](https://automationintesting.online/)*
