'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { setWorldConstructor, World } = require('@cucumber/cucumber');
const { chromium, firefox, webkit } = require('playwright');

/**
 * Custom Playwright World
 * Injects browser, context, and page into every scenario
 */
class PlaywrightWorld extends World {
  constructor(options) {
    super(options);

    this.config = {
      baseUrl: process.env.BASE_URL || 'https://automationintesting.online',
      headless: process.env.HEADLESS !== 'false',
      browser: process.env.BROWSER || 'chromium',
      slowMo: parseInt(process.env.SLOW_MO || '0', 10),
      defaultTimeout: parseInt(process.env.DEFAULT_TIMEOUT || '30000', 10),
      navigationTimeout: parseInt(process.env.NAVIGATION_TIMEOUT || '30000', 10),
      screenshotOnFail: process.env.TAKE_SCREENSHOT_ON_FAIL !== 'false',
      screenshotsDir: process.env.SCREENSHOTS_DIR || 'reports/screenshots',
      videosDir: process.env.VIDEOS_DIR || 'reports/videos',
      recordVideo: process.env.RECORD_VIDEO !== 'false',
      videoWidth: parseInt(process.env.VIDEO_WIDTH || '1280', 10),
      videoHeight: parseInt(process.env.VIDEO_HEIGHT || '800', 10)
    };

    this.browser = null;
    this.context = null;
    this.page = null;
    this.consoleLogs = [];
  }

  async openBrowser() {
    const browserEngines = { chromium, firefox, webkit };
    const engine = browserEngines[this.config.browser] || chromium;

    this.browser = await engine.launch({
      headless: this.config.headless,
      slowMo: this.config.slowMo,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const contextOpts = {
      viewport: { width: this.config.videoWidth, height: this.config.videoHeight },
      ignoreHTTPSErrors: true
    };

    if (this.config.recordVideo) {
      if (!fs.existsSync(this.config.videosDir)) {
        fs.mkdirSync(this.config.videosDir, { recursive: true });
      }
      contextOpts.recordVideo = {
        dir: this.config.videosDir,
        size: { width: this.config.videoWidth, height: this.config.videoHeight }
      };
    }

    this.context = await this.browser.newContext(contextOpts);
    this.context.setDefaultTimeout(this.config.defaultTimeout);
    this.context.setDefaultNavigationTimeout(this.config.navigationTimeout);

    this.page = await this.context.newPage();

    this.page.on('console', (msg) => {
      const entry = `[${msg.type()}] ${msg.text()}`;
      this.consoleLogs.push(entry);
      if (msg.type() === 'error') {
        console.error(`[Browser Console Error]: ${msg.text()}`);
      }
    });
    this.page.on('pageerror', (err) => {
      this.consoleLogs.push(`[pageerror] ${err.message}`);
    });

    return this.page;
  }

  async navigateTo(path = '/') {
    const url = `${this.config.baseUrl}${path}`;
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  async takeScreenshot(name = 'screenshot', attachToReport = true) {
    const fs = require('fs');
    const nodePath = require('path');

    const dir = this.config.screenshotsDir;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = nodePath.join(dir, `${name}-${timestamp}.png`);
    const buffer = await this.page.screenshot({ path: filePath, fullPage: true });

    if (attachToReport) {
      await this.attach(buffer, 'image/png');
    }

    return filePath;
  }

  async closeBrowser() {
    let videoPath = null;
    try {
      if (this.page && !this.page.isClosed() && this.config.recordVideo) {
        const video = this.page.video();
        if (video) videoPath = await video.path();
      }
    } catch (_) { /* ignore */ }

    if (this.context) {
      await this.context.close(); // flushes the video file
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    return videoPath;
  }

  async waitForVisible(selector, timeout) {
    const t = timeout || this.config.defaultTimeout;
    await this.page.waitForSelector(selector, { state: 'visible', timeout: t });
  }

  async getText(selector) {
    await this.waitForVisible(selector);
    return this.page.textContent(selector);
  }
}

setWorldConstructor(PlaywrightWorld);
