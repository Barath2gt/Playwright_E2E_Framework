const path = require('path');
const cucumberPath = require.resolve('@cucumber/cucumber');
console.log('Cucumber resolved to:', cucumberPath);
console.log('CWD:', process.cwd());
