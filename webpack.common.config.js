const path = require('path');
const globEntries = require('webpack-glob-entries');

module.exports = {
  entry: globEntries('./www/js/*.js'),
  output: {
    path: path.resolve(__dirname, 'www/js/rendered'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  }
};
