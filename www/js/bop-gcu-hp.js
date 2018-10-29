// Babel 7's `"useBuiltIns: "usage"` will automatically insert polyfills
// https://babeljs.io/docs/en/next/babel-preset-env#usebuiltins

// npm libraries
import './includes/analytics.js';
import '../js/includes/navbar.js';
import { initBop, renderBop } from '../js/includes/bop.js';
import { renderGetCaughtUp } from '../js/includes/get-caught-up.js';
import { shouldUsePJAXForHost, identifyParentHostname } from '../js/includes/helpers.js';

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
  addLinkListener();
};

/*
 * Render
 */
var render = function (containerWidth) {
  var bopWidth = document.getElementById('bop').getBoundingClientRect()['width'];

  // only run the first time
  if (!isBopInit) {
    initBop(bopWidth);
    isBopInit = true;
  // run onresize
  } else {
    renderBop(bopWidth);
  }
  renderGetCaughtUp(containerWidth);
};

/*
 * On NPR.org, open links w/ PJAX (so it doesn't disrupt the persistent audio player)
 */
const addLinkListener = function () {
  // Make sure links open in `_top`
  const domain = identifyParentHostname();
  const getCaughtUp = document.getElementById('gcu-wrapper');
  getCaughtUp.addEventListener('click', function (e) {
    if (e.target && e.target.nodeName === 'A') {
      if (window.pymChild && shouldUsePJAXForHost(domain)) {
        window.pymChild.sendMessage('pjax-navigate', e.target.href);
        e.preventDefault();
        e.stopPropagation();
      } else {
        window.open(e.target.href, '_top');
      }
    }
  });
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.addEventListener('load', onWindowLoaded);
