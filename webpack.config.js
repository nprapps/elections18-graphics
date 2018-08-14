const common = require('./webpack.common.config.js');

module.exports = Object.assign(
  {},
  common,
  {
    mode: 'development',
    devtool: 'eval-source-map',
    watch: true
  }
);
