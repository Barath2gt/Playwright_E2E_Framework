'use strict';

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
