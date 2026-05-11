'use strict';

console.log('[bookingSteps.js] Loading step definitions...');

const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

const HomePage = require('../pages/HomePage');
const ReservationPage = require('../pages/ReservationPage');
const { parseDataTable, isElementVisible } = require('../utils/helpers');

// Room name → room ID mapping
const ROOM_ID_MAP = {
  Single: 1,
  Double: 2,
  Suite: 3
};

// ─────────────────────────────────────────────────────────────────────────────
// GIVEN — Setup / Navigation steps
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Navigate to the Shady Meadows B&B homepage
 * Initialises the HomePage POM and stores it on `this` for use in subsequent steps
 */
Given('I navigate to the Shady Meadows B&B homepage', async function () {
  this.homePage = new HomePage(this.page);
  await this.homePage.goto(this.config.baseUrl);
  console.log(`   🌐 Navigated to: ${this.config.baseUrl}`);
});

/**
 * Navigate directly to a reservation page bypassing the homepage flow
 * Used for @direct scenarios
 */
Given(
  'I navigate directly to the reservation page for {string} room with check-in {string} and check-out {string}',
  async function (roomType, checkIn, checkOut) {
    const roomId = ROOM_ID_MAP[roomType];
    if (!roomId) throw new Error(`Unknown room type: "${roomType}"`);

    this.reservationPage = new ReservationPage(this.page);
    this.currentRoomType = roomType;
    this.currentCheckIn = checkIn;
    this.currentCheckOut = checkOut;

    await this.reservationPage.goto(this.config.baseUrl, roomId, checkIn, checkOut);
    await this.reservationPage.waitForPageLoad();
    console.log(`   🌐 Navigated directly to ${roomType} room reservation: ${checkIn} → ${checkOut}`);
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// THEN — Homepage assertions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify the homepage displays the welcome heading
 */
Then('the homepage should display the welcome heading', async function () {
  const title = await this.homePage.getPageTitle();
  console.log(`   📋 Page heading: "${title}"`);
  expect(title).to.not.be.empty;
  expect(title.toLowerCase()).to.satisfy(
    (t) => t.includes('shady meadows') || t.includes('welcome') || t.includes('b&b'),
    `Expected heading to contain 'Shady Meadows', 'Welcome', or 'B&B' but got: "${title}"`
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// WHEN — Availability check steps
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enter check-in and check-out dates in the availability form
 */
When(
  'I enter check-in date {string} and check-out date {string}',
  async function (checkIn, checkOut) {
    this.currentCheckIn = checkIn;
    this.currentCheckOut = checkOut;

    await this.homePage.setCheckInDate(checkIn);
    await this.homePage.setCheckOutDate(checkOut);
    console.log(`   📅 Check-in: ${checkIn}  |  Check-out: ${checkOut}`);
  }
);

/**
 * Click the Check Availability button
 */
When('I click Check Availability', async function () {
  await this.homePage.clickCheckAvailability();
  console.log('   🔍 Clicked "Check Availability"');
});

// ─────────────────────────────────────────────────────────────────────────────
// THEN — Rooms list assertions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify the rooms section is visible on the page
 */
Then('I should see the available rooms section', async function () {
  const isVisible = await this.homePage.areRoomsVisible();
  expect(isVisible, 'Rooms section should be visible after checking availability').to.be.true;
  console.log('   ✅ Rooms section is visible');
});

/**
 * Verify a specific room type appears in the rooms list
 */
Then('the room list should contain {string}', async function (roomType) {
  const roomNames = await this.homePage.getVisibleRoomNames();
  console.log(`   🏠 Visible room names: ${roomNames.join(', ')}`);
  const containsRoom = roomNames.some(
    (name) => name.toLowerCase().includes(roomType.toLowerCase())
  );
  expect(containsRoom, `Room list should contain "${roomType}" but found: ${roomNames.join(', ')}`).to.be.true;
});

// ─────────────────────────────────────────────────────────────────────────────
// WHEN — Room selection steps
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Click the Book Now button for a specific room type
 */
When('I click Book Now for {string} room', async function (roomType) {
  this.currentRoomType = roomType;
  await this.homePage.clickBookNowForRoom(roomType);
  console.log(`   🖱️  Clicked "Book Now" for ${roomType} room`);

  // Initialise the ReservationPage POM after navigation
  this.reservationPage = new ReservationPage(this.page);
});

// ─────────────────────────────────────────────────────────────────────────────
// THEN — Reservation page assertions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify we are on the correct room reservation page
 * Handles both exact match "Single room reservation page" and outline "<roomType> room reservation page"
 */
Then('I should be on the {word} room reservation page', async function (roomType) {
  const roomId = ROOM_ID_MAP[roomType];
  if (!roomId) throw new Error(`Unknown room type: "${roomType}"`);

  // Wait for the reservation page to load
  await this.reservationPage.waitForPageLoad();

  const isCorrectPage = await this.reservationPage.isOnReservationPage(roomId);
  expect(
    isCorrectPage,
    `Expected to be on reservation page for ${roomType} (ID: ${roomId}) but URL is: ${this.page.url()}`
  ).to.be.true;

  console.log(`   ✅ On ${roomType} room reservation page`);
});

/**
 * Verify the room title on the reservation page
 */
Then('the room title should be {string}', async function (expectedTitle) {
  const actualTitle = await this.reservationPage.getRoomTitle();
  console.log(`   📋 Room title: "${actualTitle}"`);
  expect(actualTitle.toLowerCase()).to.include(
    expectedTitle.toLowerCase(),
    `Expected room title to include "${expectedTitle}" but got: "${actualTitle}"`
  );
});

/**
 * Verify the price summary section is visible
 */
Then('the price summary should be visible', async function () {
  const isVisible = await this.reservationPage.isPriceSummaryVisible();
  expect(isVisible, 'Price summary section should be visible on the reservation page').to.be.true;
  console.log('   ✅ Price summary is visible');
});

// ─────────────────────────────────────────────────────────────────────────────
// WHEN — Reserve Now and booking form steps
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Click the Reserve Now button
 */
When('I click Reserve Now', async function () {
  await this.reservationPage.clickReserveNow();
  console.log('   🖱️  Clicked "Reserve Now"');
});

/**
 * Fill the booking form using a Cucumber DataTable
 * Accepts: | firstname | lastname | email | phone |
 */
When('I fill in the booking form with the following guest details:', async function (dataTable) {
  const rows = parseDataTable(dataTable);
  const guestDetails = rows[0]; // Take the first row

  console.log(`   👤 Filling booking form for: ${guestDetails.firstname} ${guestDetails.lastname}`);

  await this.reservationPage.fillBookingForm({
    firstname: guestDetails.firstname,
    lastname: guestDetails.lastname,
    email: guestDetails.email,
    phone: guestDetails.phone
  });

  // Store guest details for later assertions
  this.guestDetails = guestDetails;

  console.log(`   📝 Filled: ${guestDetails.firstname} | ${guestDetails.lastname} | ${guestDetails.email} | ${guestDetails.phone}`);
});

/**
 * Submit the booking form
 */
When('I submit the booking', async function () {
  await this.reservationPage.submitBooking();
  console.log('   📤 Submitted booking form');
});

// ─────────────────────────────────────────────────────────────────────────────
// THEN — Booking confirmation assertions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify the booking confirmation message is displayed
 * This is the final assertion — the end-to-end success criterion
 */
Then('I should see a booking confirmation message', async function () {
  const isConfirmed = await this.reservationPage.isBookingConfirmed(20000);

  if (!isConfirmed) {
    // Take a screenshot before failing
    await this.takeScreenshot('booking_confirmation_not_found', true);
  }

  expect(
    isConfirmed,
    'Expected a booking confirmation message to be displayed after submitting the form'
  ).to.be.true;

  const confirmationText = await this.reservationPage.getConfirmationText();
  console.log(`   🎉 Booking confirmed! Message: "${confirmationText}"`);

  // Signal to the global After hook that booking was confirmed successfully
  this.bookingConfirmed = true;
});
