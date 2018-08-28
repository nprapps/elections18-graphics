// Babel 7's `"useBuiltIns: "usage"` will automatically insert polyfills
// https://babeljs.io/docs/en/next/babel-preset-env#usebuiltins

// npm libraries
import '../js/includes/navbar.js';
import { initBigBoard } from '../js/includes/big-board-core.js';
import 'superagent';

// global vars
window.pymChild = null;

var resultsMenu = document.querySelector('.small-screen-nav-label');
var stateMenu = document.querySelector('.state-nav-label');
/*
* Initialize the graphic.
*/
var onWindowLoaded = function () {
  // init pym and render callback
  window.pymChild = new pym.Child();
  initBigBoard('senate-national.json', 'Senate', 'senate');
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
