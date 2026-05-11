'use strict';

const { clickElement, fillInput, getElementText, isElementVisible, scrollIntoView, waitForUrl } = require('../utils/helpers');

/**
 * ReservationPage Page Object Model
 * Encapsulates all locators and actions for /reservation/{id}?checkin=...&checkout=...
 */
class ReservationPage {
  /**
   * @param {import('playwright').Page} page - Playwright page instance
   */
  constructor(page) {
    this.page = page;

    // ── Selectors ──────────────────────────────────────────────────────────────

    // Room details
    this.roomTitle = 'h1';
    this.roomDescription = 'p, .room-description';
    this.pricePerNight = 'text=/£[0-9]+ per night/, h2:has-text("per night"), .price';

    // Calendar widget
    this.calendarTable = 'table';
    this.calendarNextBtn = 'button:has-text("Next"), [aria-label="Next Month"], .rbc-btn-group button:last-child';
    this.calendarPrevBtn = 'button:has-text("Back"), button:has-text("Prev"), [aria-label="Previous Month"]';
    this.calendarDayCell = 'table td';
    this.todayCell = 'td.today, td[class*="today"]';

    // Price summary
    this.priceSummarySection = 'h3:has-text("Price Summary"), [class*="price-summary"]';
    this.totalPrice = 'text=/Total/, strong:has-text("Total")';
    this.nightlyTotal = 'text=/per night/, text=/nights/';
    this.cleaningFee = 'text=/Cleaning fee/';
    this.serviceFee = 'text=/Service fee/';

    // Reserve Now button
    this.reserveNowBtn = 'button:has-text("Reserve Now"), a:has-text("Reserve Now")';

    // Booking modal / form (appears after clicking Reserve Now)
    this.bookingModal = '[class*="modal"], [role="dialog"], .booking-form, form';
    this.firstnameInput = 'input[name="firstname"], input[placeholder*="First"], input[placeholder*="first"], #firstname';
    this.lastnameInput = 'input[name="lastname"], input[placeholder*="Last"], input[placeholder*="last"], #lastname';
    this.emailInput = 'input[name="email"], input[type="email"], input[placeholder*="Email"], input[placeholder*="email"], #email';
    this.phoneInput = 'input[name="phone"], input[type="tel"], input[placeholder*="Phone"], input[placeholder*="phone"], #phone';

    // Booking form submit
    this.confirmBookingBtn = 'button:has-text("Book"), button:has-text("Confirm"), button:has-text("Submit"), button[type="submit"]';

    // Confirmation message
    this.confirmationHeading = 'h3:has-text("Booking Successful"), h2:has-text("Booking"), [class*="confirmation"], .alert-success, h3:has-text("Booking Confirmed")';
    this.confirmationMessage = '[class*="confirmation"] p, .alert-success p, h3:has-text("Booking") ~ p, .booking-success';

    // Similar rooms section
    this.similarRoomsSection = 'h2:has-text("Similar Rooms")';
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  /**
   * Navigate directly to the reservation page
   * @param {string} baseUrl
   * @param {number} roomId - 1=Single, 2=Double, 3=Suite
   * @param {string} checkIn - YYYY-MM-DD
   * @param {string} checkOut - YYYY-MM-DD
   */
  async goto(baseUrl, roomId, checkIn, checkOut) {
    const url = `${baseUrl}/reservation/${roomId}?checkin=${checkIn}&checkout=${checkOut}`;
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait until the reservation page is loaded by verifying the room title
   * @returns {Promise<string>} room heading text
   */
  async waitForPageLoad() {
    await this.page.waitForSelector(this.roomTitle, { state: 'visible', timeout: 15000 });
    return getElementText(this.page, this.roomTitle);
  }

  // ── Room Details ───────────────────────────────────────────────────────────

  /**
   * Get the room title/heading
   * @returns {Promise<string>}
   */
  async getRoomTitle() {
    return getElementText(this.page, this.roomTitle);
  }

  /**
   * Check that the reservation page URL matches expected room
   * @param {number} roomId
   * @returns {Promise<boolean>}
   */
  async isOnReservationPage(roomId) {
    const url = this.page.url();
    return url.includes(`/reservation/${roomId}`);
  }

  // ── Calendar ───────────────────────────────────────────────────────────────

  /**
   * Select a date range on the calendar by drag or click
   * Uses Playwright mouse drag to select check-in → check-out range
   * @param {string} checkInDate - YYYY-MM-DD
   * @param {string} checkOutDate - YYYY-MM-DD
   */
  async selectDateRange(checkInDate, checkOutDate) {
    await this.page.waitForSelector(this.calendarTable, { state: 'visible' });

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    // Navigate calendar to the correct month if needed
    await this._navigateToMonth(checkIn);

    // Click the start date
    await this._clickCalendarDay(checkIn.getDate());

    // If checkout is in a different month, navigate forward
    if (checkIn.getMonth() !== checkOut.getMonth() || checkIn.getFullYear() !== checkOut.getFullYear()) {
      await this._clickNext();
    }

    // Click the end date
    await this._clickCalendarDay(checkOut.getDate());

    await this.page.waitForTimeout(500);
  }

  /**
   * Navigate calendar to the target month
   * @param {Date} targetDate
   */
  async _navigateToMonth(targetDate) {
    const maxAttempts = 12;
    for (let i = 0; i < maxAttempts; i++) {
      const calendarText = await this.page.locator(this.calendarTable).textContent().catch(() => '');
      const targetMonthName = targetDate.toLocaleString('default', { month: 'long' });
      const targetYear = targetDate.getFullYear().toString();

      if (calendarText.includes(targetMonthName) && calendarText.includes(targetYear)) {
        return; // We are on the right month
      }

      // Check if we need to go forward or back
      const today = new Date();
      if (targetDate > today) {
        await this._clickNext();
      } else {
        await this._clickPrev();
      }
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Click a specific day number on the currently displayed calendar month
   * @param {number} dayNumber
   */
  async _clickCalendarDay(dayNumber) {
    const dayStr = dayNumber.toString();
    // Find td elements that exactly contain the day number (not partial match)
    const cells = this.page.locator('table td');
    const count = await cells.count();
    for (let i = 0; i < count; i++) {
      const cell = cells.nth(i);
      const text = (await cell.textContent()).trim();
      if (text === dayStr) {
        // Check it's not a disabled/greyed-out cell from prev/next month
        const classList = await cell.getAttribute('class') || '';
        if (!classList.includes('disabled') && !classList.includes('previous') && !classList.includes('next-month')) {
          await cell.click();
          return;
        }
      }
    }
    throw new Error(`Calendar day ${dayNumber} not found on the current calendar view`);
  }

  /**
   * Click the "Next" button on the calendar
   */
  async _clickNext() {
    const nextBtns = [
      'button:has-text("Next")',
      '[aria-label="Next Month"]',
      'button[class*="next"]'
    ];
    for (const sel of nextBtns) {
      try {
        await this.page.click(sel, { timeout: 2000 });
        await this.page.waitForTimeout(300);
        return;
      } catch {
        // Try next
      }
    }
  }

  /**
   * Click the "Back/Prev" button on the calendar
   */
  async _clickPrev() {
    const prevBtns = [
      'button:has-text("Back")',
      'button:has-text("Prev")',
      '[aria-label="Previous Month"]',
      'button[class*="prev"]'
    ];
    for (const sel of prevBtns) {
      try {
        await this.page.click(sel, { timeout: 2000 });
        await this.page.waitForTimeout(300);
        return;
      } catch {
        // Try next
      }
    }
  }

  // ── Price Summary ──────────────────────────────────────────────────────────

  /**
   * Get the total price shown in the price summary
   * @returns {Promise<string>}
   */
  async getTotalPrice() {
    const totalLocator = this.page.locator('text=/Total/').last();
    if (await totalLocator.count() > 0) {
      return (await totalLocator.textContent()).trim();
    }
    return '';
  }

  /**
   * Verify the price summary section is visible
   * @returns {Promise<boolean>}
   */
  async isPriceSummaryVisible() {
    return isElementVisible(this.page, this.priceSummarySection);
  }

  // ── Reserve Now ────────────────────────────────────────────────────────────

  /**
   * Click the "Reserve Now" button to open the booking form
   */
  async clickReserveNow() {
    await scrollIntoView(this.page, this.reserveNowBtn);
    await clickElement(this.page, this.reserveNowBtn);
    // Wait for booking form/modal to appear
    await this.page.waitForTimeout(1000);
  }

  // ── Booking Form ───────────────────────────────────────────────────────────

  /**
   * Fill in the guest first name
   * @param {string} firstname
   */
  async fillFirstname(firstname) {
    await this._fillField(
      ['input[name="firstname"]', 'input[placeholder*="First"]', 'input[placeholder*="first"]', '#firstname'],
      firstname
    );
  }

  /**
   * Fill in the guest last name
   * @param {string} lastname
   */
  async fillLastname(lastname) {
    await this._fillField(
      ['input[name="lastname"]', 'input[placeholder*="Last"]', 'input[placeholder*="last"]', '#lastname'],
      lastname
    );
  }

  /**
   * Fill in the guest email
   * @param {string} email
   */
  async fillEmail(email) {
    await this._fillField(
      ['input[name="email"]', 'input[type="email"]', 'input[placeholder*="Email"]', 'input[placeholder*="email"]', '#email'],
      email
    );
  }

  /**
   * Fill in the guest phone number
   * @param {string} phone
   */
  async fillPhone(phone) {
    await this._fillField(
      ['input[name="phone"]', 'input[type="tel"]', 'input[placeholder*="Phone"]', 'input[placeholder*="phone"]', '#phone'],
      phone
    );
  }

  /**
   * Fill all booking form fields at once
   * @param {object} guestDetails - { firstname, lastname, email, phone }
   */
  async fillBookingForm(guestDetails) {
    const { firstname, lastname, email, phone } = guestDetails;
    await this.fillFirstname(firstname);
    await this.fillLastname(lastname);
    await this.fillEmail(email);
    await this.fillPhone(phone);
  }

  /**
   * Click the confirm/submit booking button
   */
  async submitBooking() {
    const submitSelectors = [
      'button:has-text("Reserve Now")'

    ];
    for (const sel of submitSelectors) {
      try {
        await this.page.waitForSelector(sel, { state: 'visible', timeout: 3000 });
        await scrollIntoView(this.page, sel);
        await this.page.click(sel);
        return;
      } catch {
        // Try next
      }
    }
    throw new Error('Could not find a booking submit button');
  }

  // ── Confirmation ───────────────────────────────────────────────────────────

  /**
   * Wait for and verify the booking confirmation is displayed
   * @param {number} timeout - max wait time in ms
   * @returns {Promise<boolean>}
   */
  async isBookingConfirmed(timeout = 15000) {
    const confirmationSelectors = [
      'h3:has-text("Booking Successful")',
      'h2:has-text("Booking")',
      '[class*="confirmation"]',
      '.alert-success',
      'h3:has-text("Booking Confirmed")',
      'text=Booking Successful',
      'text=Confirmed'
    ];

    for (const sel of confirmationSelectors) {
      try {
        await this.page.waitForSelector(sel, { state: 'visible', timeout });
        return true;
      } catch {
        // Try next selector
      }
    }
    return false;
  }

  /**
   * Get the booking confirmation message text
   * @returns {Promise<string>}
   */
  async getConfirmationText() {
    const selectors = [
      'h3:has-text("Booking Successful")',
      'h2:has-text("Booking")',
      '[class*="confirmation"] h3',
      '.alert-success'
    ];
    for (const sel of selectors) {
      try {
        await this.page.waitForSelector(sel, { state: 'visible', timeout: 5000 });
        return getElementText(this.page, sel);
      } catch {
        // Try next
      }
    }
    return '';
  }

  // ── Private Helpers ────────────────────────────────────────────────────────

  /**
   * Try multiple selectors to fill a form field
   * @param {string[]} selectors
   * @param {string} value
   */
  async _fillField(selectors, value) {
    for (const sel of selectors) {
      try {
        await this.page.waitForSelector(sel, { state: 'visible', timeout: 3000 });
        await this.page.fill(sel, '');
        await this.page.fill(sel, value);
        return;
      } catch {
        // Try next selector
      }
    }
    throw new Error(`Could not find field with selectors: ${selectors.join(', ')}`);
  }
}

module.exports = ReservationPage;
