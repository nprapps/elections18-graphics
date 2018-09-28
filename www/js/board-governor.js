// Babel 7's `"useBuiltIns: "usage"` will automatically insert polyfills
// https://babeljs.io/docs/en/next/babel-preset-env#usebuiltins

// npm libraries
import './includes/app_config.js';
import './includes/analytics.js';
import './includes/colors.js';
import '../js/includes/navbar.js';
import { initBigBoard } from '../js/includes/big-board-core.js';

// global vars
window.pymChild = null;

/*
* Initialize the graphic.
*/
var onWindowLoaded = function () {
  // init pym and render callback
  window.pymChild = new window.pym.Child();
  initBigBoard('governor-national.json', 'Governor', 'governor');
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.addEventListener('load', onWindowLoaded);
