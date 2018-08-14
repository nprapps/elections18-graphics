const common = require('./webpack.common.config.js');

module.exports = Object.assign(
  {},
  common,
  {
    mode: 'production'
  }
);
