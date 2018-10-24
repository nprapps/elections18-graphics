// Babel 7's `"useBuiltIns: "usage"` will automatically insert polyfills
// https://babeljs.io/docs/en/next/babel-preset-env#usebuiltins

/*
* Initialize the graphic.
*/
var onWindowLoaded = function () {
    console.log('loaded');

  // init pym and render callback
  window.pymChild = new window.pym.Child({
      renderCallback: render;
  });
};


/*
 * Render
 */
var render = function (containerWidth) {
    console.log(containerWidth);

  // Update iframe
  if (window.pymChild) {
    window.pymChild.sendHeight();
  }
};


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.addEventListener('load', onWindowLoaded);
