'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Reusable helper utilities for Playwright interactions
 * All methods accept a Playwright `page` object as the first argument
 */

/**
 * Wait for an element to be visible, then click it
 * @param {import('playwright').Page} page
 * @param {string} selector
 * @param {object} options - optional Playwright click options
 */
async function clickElement(page, selector, options = {}) {
  await page.waitForSelector(selector, { state: 'visible' });
  await page.click(selector, options);
}

/**
 * Wait for an element to be visible, clear it, then type a value
 * @param {import('playwright').Page} page
 * @param {string} selector
 * @param {string} value
 */
async function fillInput(page, selector, value) {
  await page.waitForSelector(selector, { state: 'visible' });
  await page.fill(selector, '');
  await page.fill(selector, value);
}

/**
 * Wait for an element and get its trimmed text content
 * @param {import('playwright').Page} page
 * @param {string} selector
 * @returns {Promise<string>}
 */
async function getElementText(page, selector) {
  await page.waitForSelector(selector, { state: 'visible' });
  const text = await page.textContent(selector);
  return text ? text.trim() : '';
}

/**
 * Check if an element is visible on the page
 * @param {import('playwright').Page} page
 * @param {string} selector
 * @returns {Promise<boolean>}
 */
async function isElementVisible(page, selector) {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for navigation to complete after an action
 * @param {import('playwright').Page} page
 * @param {Function} action - async function that triggers navigation
 */
async function waitForNavigation(page, action) {
  await Promise.all([
    page.waitForLoadState('domcontentloaded'),
    action()
  ]);
}

/**
 * Retry an async action up to maxRetries times
 * @param {Function} action - async function to retry
 * @param {number} maxRetries - max number of retry attempts
 * @param {number} delay - delay between retries in ms
 */
async function retryAction(action, maxRetries = 3, delay = 1000) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      console.warn(`   ⚠️  Attempt ${attempt}/${maxRetries} failed: ${error.message}`);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Scroll an element into view
 * @param {import('playwright').Page} page
 * @param {string} selector
 */
async function scrollIntoView(page, selector) {
  await page.waitForSelector(selector, { state: 'attached' });
  await page.locator(selector).scrollIntoViewIfNeeded();
}

/**
 * Wait for a URL pattern to match
 * @param {import('playwright').Page} page
 * @param {string|RegExp} pattern
 * @param {number} timeout
 */
async function waitForUrl(page, pattern, timeout = 15000) {
  await page.waitForURL(pattern, { timeout });
}

/**
 * Select a date on a calendar widget by clicking a day cell
 * @param {import('playwright').Page} page
 * @param {string} dateString - date in YYYY-MM-DD format
 */
async function selectCalendarDate(page, dateString) {
  const date = new Date(dateString);
  const day = date.getDate().toString();
  // Try to find the calendar day cell matching the day number
  // The calendar renders as table cells with the day number
  const daySelector = `table td:not([class*="previous"]):not([class*="next"]) >> text="${day}"`;
  await page.waitForSelector('table', { state: 'visible' });
  await page.click(daySelector);
}

/**
 * Format a date object to YYYY-MM-DD string
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get a future date string offset from today
 * @param {number} daysFromToday
 * @returns {string} formatted YYYY-MM-DD
 */
function getFutureDate(daysFromToday) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return formatDate(date);
}

/**
 * Ensure a directory exists, creating it recursively if needed
 * @param {string} dirPath
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Parse a Cucumber DataTable hashes array into a plain object
 * @param {object} dataTable - Cucumber DataTable
 * @returns {Array<object>}
 */
function parseDataTable(dataTable) {
  return dataTable.hashes();
}

module.exports = {
  clickElement,
  fillInput,
  getElementText,
  isElementVisible,
  waitForNavigation,
  retryAction,
  scrollIntoView,
  waitForUrl,
  selectCalendarDate,
  formatDate,
  getFutureDate,
  ensureDir,
  parseDataTable
};
