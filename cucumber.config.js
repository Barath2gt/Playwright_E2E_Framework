module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    require: [
      'support/world.js',
      'support/hooks.js',
      'step-definitions/**/*.js'
    ],
    format: [
      'progress-bar',
      ['@cucumber/html-formatter', 'reports/cucumber-report.html'],
      ['json', 'reports/cucumber-report.json']
    ],
    formatOptions: {
      snippetInterface: 'async-await'
    },
    publishQuiet: true,
    timeout: 60000
  },
  smoke: {
    paths: ['features/**/*.feature'],
    require: [
      'support/world.js',
      'support/hooks.js',
      'step-definitions/**/*.js'
    ],
    tags: '@smoke',
    format: [
      'progress-bar',
      ['@cucumber/html-formatter', 'reports/smoke-report.html']
    ],
    formatOptions: {
      snippetInterface: 'async-await'
    },
    publishQuiet: true,
    timeout: 60000
  },
  regression: {
    paths: ['features/**/*.feature'],
    require: [
      'support/world.js',
      'support/hooks.js',
      'step-definitions/**/*.js'
    ],
    tags: '@regression',
    format: [
      'progress-bar',
      ['@cucumber/html-formatter', 'reports/regression-report.html']
    ],
    formatOptions: {
      snippetInterface: 'async-await'
    },
    publishQuiet: true,
    timeout: 60000
  }
};
