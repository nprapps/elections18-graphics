// Babel 7's `"useBuiltIns: "usage"` will automatically insert polyfills
// https://babeljs.io/docs/en/next/babel-preset-env#usebuiltins

// npm libraries
import './includes/analytics.js';
import { initBop, renderBop } from '../js/includes/bop.js';

// global vars
var isBopInit = false;

/*
* Initialize the graphic.
*/
var onWindowLoaded = function () {
  // init pym and render callback
  window.pymChild = new window.pym.Child({
    renderCallback: render
  });
};

/*
 * Render
 */
var render = function (containerWidth) {
  // only run the first time
  if (!isBopInit) {
    initBop(containerWidth);
    isBopInit = true;
  // run onresize
  } else {
    renderBop(containerWidth);
  }
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.addEventListener('load', onWindowLoaded);
