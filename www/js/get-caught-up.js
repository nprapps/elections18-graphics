// Babel 7's `"useBuiltIns: "usage"` will automatically insert polyfills
// https://babeljs.io/docs/en/next/babel-preset-env#usebuiltins

import { renderGetCaughtUp } from '../js/includes/get-caught-up.js';

window.pymChild = null;

var onWindowLoaded = function () {
  // init pym and render callback
  window.pymChild = new pym.Child({
    renderCallback: render
  });
};

var render = function (containerWidth) {
  renderGetCaughtUp(containerWidth);
};

window.onload = onWindowLoaded;
