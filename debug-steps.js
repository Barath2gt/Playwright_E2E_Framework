try {
  const { Given, When, Then } = require('@cucumber/cucumber');
  console.log('Given:', typeof Given);
  console.log('When:', typeof When);
  console.log('Then:', typeof Then);
  const { expect } = require('chai');
  console.log('Chai expect:', typeof expect);
  const HomePage = require('./pages/HomePage');
  console.log('HomePage:', typeof HomePage);
  const ReservationPage = require('./pages/ReservationPage');
  console.log('ReservationPage:', typeof ReservationPage);
  const helpers = require('./utils/helpers');
  console.log('Helpers keys:', Object.keys(helpers));
  console.log('All imports OK');
} catch (e) {
  console.error('IMPORT ERROR:', e.message);
  console.error(e.stack);
}
