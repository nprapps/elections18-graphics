// Babel 7's `"useBuiltIns: "usage"` will automatically insert polyfills
// https://babeljs.io/docs/en/next/babel-preset-env#usebuiltins

// npm libraries
import '../js/includes/navbar.js';

/*
* Initialize the graphic.
*/
var onWindowLoaded = function () {
  // init pym and render callback
  if (!window.pymChild) {
    window.pymChild = new window.pym.Child();
    setTimeout(window.pymChild.sendHeight, 0);
  }
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
if (document.readyState === 'complete') {
  onWindowLoaded();
} else {
  window.addEventListener('load', onWindowLoaded);
}
