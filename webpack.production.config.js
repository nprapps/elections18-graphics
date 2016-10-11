'use strict';

var webpack = require('webpack');
var glob_entries = require('webpack-glob-entries');

module.exports = {
    entry: glob_entries('./www/js/*.js'),
    output: {
        path: './www/js/rendered',
        filename: '[name].min.js'
    },
    module: {
        loaders: [{
            test: /\.js$/,
            exclude: /node_modules/,
            loader: 'babel-loader'
        }, {
            test: /\.json$/,
            loader: 'json-loader'
        }]
    },
    plugins: [
        new webpack.optimize.UglifyJsPlugin()
    ]
}
