export default {
  default: {
    import: ['step-definitions/**/*.ts', 'support/**/*.ts'],
    paths: ['features/**/*.feature'],
    format: ['progress', 'html:reports/cucumber-report.html', 'json:reports/cucumber-report.json'],
    publishQuiet: true,
    parallel: 1
  }
};
