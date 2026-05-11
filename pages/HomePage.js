'use strict';

const { clickElement, fillInput, getElementText, isElementVisible, scrollIntoView } = require('../utils/helpers');

/**
 * HomePage Page Object Model
 * Encapsulates all locators and actions for https://automationintesting.online/
 */
class HomePage {
  /**
   * @param {import('playwright').Page} page - Playwright page instance
   */
  constructor(page) {
    this.page = page;

    // ── Selectors ──────────────────────────────────────────────────────────────

    // Hero / Navigation
    this.heroTitle = 'h1';
    this.bookNowHeroBtn = 'a[href="#booking"]';

    // Availability checker section
    this.checkAvailabilitySection = '#booking';
    this.checkInInput = 'input[placeholder="Check In"], input[name="checkin"], #checkin';
    this.checkOutInput = 'input[placeholder="Check Out"], input[name="checkout"], #checkout';
    this.checkAvailabilityBtn = 'button:has-text("Check Availability")';

    // Rooms section
    this.roomsSection = 'h2:has-text("Our Rooms"), h2:has-text("Rooms")';
    this.roomCards = '.card, [class*="room"], .col-sm-4';
    this.roomHeadings = 'h5, h3';

    // Dynamic room "Book now" links  — built per room type in methods below
    this.singleRoomBookBtn = 'a[href*="/reservation/1"]';
    this.doubleRoomBookBtn = 'a[href*="/reservation/2"]';
    this.suiteRoomBookBtn = 'a[href*="/reservation/3"]';

    // Room name → book button selector map
    this.roomBookBtnMap = {
      Single: this.singleRoomBookBtn,
      Double: this.doubleRoomBookBtn,
      Suite: this.suiteRoomBookBtn
    };

    // Contact / footer
    this.contactSection = 'h3:has-text("Contact Information")';
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * Navigate to the homepage
   */
  async goto(baseUrl) {
    await this.page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Verify the homepage has loaded by checking the hero title
   * @returns {Promise<string>} hero heading text
   */
  async getPageTitle() {
    await this.page.waitForSelector(this.heroTitle, { state: 'visible' });
    return getElementText(this.page, this.heroTitle);
  }

  /**
   * Click the "Book Now" hero button to scroll to booking section
   */
  async clickBookNowHero() {
    await clickElement(this.page, this.bookNowHeroBtn);
    // Wait for the section to come into view
    await this.page.waitForTimeout(500);
  }

  /**
   * Set the check-in date in the availability form
   * Uses multiple selector strategies for robustness
   * @param {string} date - YYYY-MM-DD format
   */
  async setCheckInDate(date) {
    // Scroll to availability section first
    await scrollIntoView(this.page, this.checkAvailabilitySection);

    // Try each possible selector variant
    const selectors = [
      'input[placeholder="Check In"]',
      'input[name="checkin"]',
      '#checkin',
      'input[type="date"]:first-of-type'
    ];

    for (const sel of selectors) {
      try {
        await this.page.waitForSelector(sel, { state: 'visible', timeout: 3000 });
        await this.page.fill(sel, date);
        return;
      } catch {
        // Try next selector
      }
    }

    // Fallback: find all date inputs and fill the first
    const dateInputs = this.page.locator('input[type="date"]');
    const count = await dateInputs.count();
    if (count > 0) {
      await dateInputs.first().fill(date);
    }
  }

  /**
   * Set the check-out date in the availability form
   * @param {string} date - YYYY-MM-DD format
   */
  async setCheckOutDate(date) {
    const selectors = [
      'input[placeholder="Check Out"]',
      'input[name="checkout"]',
      '#checkout',
      'input[type="date"]:last-of-type'
    ];

    for (const sel of selectors) {
      try {
        await this.page.waitForSelector(sel, { state: 'visible', timeout: 3000 });
        await this.page.fill(sel, date);
        return;
      } catch {
        // Try next selector
      }
    }

    // Fallback: find all date inputs and fill the second
    const dateInputs = this.page.locator('input[type="date"]');
    const count = await dateInputs.count();
    if (count > 1) {
      await dateInputs.nth(1).fill(date);
    }
  }

  /**
   * Click the "Check Availability" button
   */
  async clickCheckAvailability() {
    await scrollIntoView(this.page, this.checkAvailabilityBtn);
    await clickElement(this.page, this.checkAvailabilityBtn);
    // Wait for rooms to refresh / page to respond
    await this.page.waitForTimeout(1000);
  }

  /**
   * Verify the rooms section is visible after checking availability
   * @returns {Promise<boolean>}
   */
  async areRoomsVisible() {
    return isElementVisible(this.page, this.roomsSection);
  }

  /**
   * Get all visible room names on the page
   * @returns {Promise<string[]>}
   */
  async getVisibleRoomNames() {
    await this.page.waitForSelector('h5, h3', { state: 'visible' });
    const headings = this.page.locator('h5');
    const count = await headings.count();
    const names = [];
    for (let i = 0; i < count; i++) {
      const text = await headings.nth(i).textContent();
      if (text) names.push(text.trim());
    }
    return names;
  }

  /**
   * Click the "Book now" link for a specific room type
   * @param {string} roomType - 'Single' | 'Double' | 'Suite'
   */
  async clickBookNowForRoom(roomType) {
    const selector = this.roomBookBtnMap[roomType];
    if (!selector) {
      throw new Error(`Unknown room type: "${roomType}". Expected one of: ${Object.keys(this.roomBookBtnMap).join(', ')}`);
    }
    await scrollIntoView(this.page, selector);
    await clickElement(this.page, selector);
  }

  /**
   * Get the displayed price per night for a room type
   * @param {string} roomType - 'Single' | 'Double' | 'Suite'
   * @returns {Promise<string>}
   */
  async getRoomPrice(roomType) {
    // Find the room section containing the room type heading
    const roomSection = this.page.locator(`.col-sm-4, .card, [class*="room"]`).filter({
      hasText: roomType
    });
    const priceEl = roomSection.locator('text=/£[0-9]+/');
    if (await priceEl.count() > 0) {
      return (await priceEl.first().textContent()).trim();
    }
    return null;
  }

  /**
   * Check if the page heading contains expected text
   * @param {string} expectedText
   * @returns {Promise<boolean>}
   */
  async headingContains(expectedText) {
    const heading = await getElementText(this.page, 'h1');
    return heading.includes(expectedText);
  }
}

module.exports = HomePage;
