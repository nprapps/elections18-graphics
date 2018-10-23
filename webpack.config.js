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
      // Uncomment this in order to see a bundle-size analyzer,
      // to help determine which libraries or chunks are contributing
      // most to the size of the built, deployed JS files
      // new BundleAnalyzerPlugin()
    ]
  }
);
