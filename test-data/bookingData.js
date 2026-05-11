'use strict';

const { getFutureDate } = require('../utils/helpers');

/**
 * Centralized test data for booking scenarios
 * Dates are dynamically generated relative to today to avoid stale data
 */

const ROOM_TYPES = {
  SINGLE: { name: 'Single', id: 1, pricePerNight: 100 },
  DOUBLE: { name: 'Double', id: 2, pricePerNight: 150 },
  SUITE: { name: 'Suite', id: 3, pricePerNight: 225 }
};

const BOOKING_DATES = {
  // Standard short stay: 3 days from now to 5 days from now (2 nights)
  standard: {
    checkIn: getFutureDate(3),
    checkOut: getFutureDate(5)
  },
  // Long stay: 7 days from now to 14 days from now (7 nights)
  longStay: {
    checkIn: getFutureDate(7),
    checkOut: getFutureDate(14)
  },
  // Weekend stay: 10 days from now to 12 days from now (2 nights)
  weekend: {
    checkIn: getFutureDate(10),
    checkOut: getFutureDate(12)
  }
};

const GUEST_DETAILS = {
  primary: {
    firstname: 'John',
    lastname: 'Doe',
    email: 'john.doe@testautomation.com',
    phone: '07700123456'
  },
  secondary: {
    firstname: 'Alice',
    lastname: 'Smith',
    email: 'alice.smith@testautomation.com',
    phone: '07700111222'
  },
  tertiary: {
    firstname: 'Bob',
    lastname: 'Jones',
    email: 'bob.jones@testautomation.com',
    phone: '07700333444'
  }
};

const EXPECTED_MESSAGES = {
  bookingConfirmation: 'Booking Successful',
  availabilityHeading: 'Our Rooms'
};

const FEES = {
  cleaningFee: 25,
  serviceFee: 15
};

module.exports = {
  ROOM_TYPES,
  BOOKING_DATES,
  GUEST_DETAILS,
  EXPECTED_MESSAGES,
  FEES
};
