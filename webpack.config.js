const common = require('./webpack.common.config.js');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = Object.assign(
  {},
  common,
  {
    mode: 'development',
    devtool: 'eval-source-map',
    watch: true,
    plugins: [
      new BundleAnalyzerPlugin()
    ]
  }
);
