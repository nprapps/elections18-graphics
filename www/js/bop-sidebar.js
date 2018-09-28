// Babel 7's `"useBuiltIns: "usage"` will automatically insert polyfills
// https://babeljs.io/docs/en/next/babel-preset-env#usebuiltins

// npm libraries
import './includes/analytics.js';
import { initBop, renderBop } from './includes/bop.js';
import { isLocalhost, isNPRHost, identifyParentHostname } from './includes/helpers.js';

// Global vars
window.pymChild = null;
var isBopInit = false;
var navLinks = null;
/*
* Initialize the graphic.
*/
var onWindowLoaded = function () {
  // init pym and render callback
  window.pymChild = new window.pym.Child({
    renderCallback: render
  });

  navLinks = document.querySelectorAll('.nav-link');
  for (var i = 0; i < navLinks.length; i++) {
    navLinks[i].addEventListener('click', onNavLinkClick);
  }
};

var onNavLinkClick = function (e) {
  const domain = identifyParentHostname();
  const url = e.target.href;

  if (window.pymChild && (!domain || isNPRHost(domain) || isLocalhost(domain))) {
    window.pymChild.sendMessage('pjax-navigate', url);
    e.preventDefault();
    e.stopPropagation();
  } else {
    console.log('if statement failing');
    window.open(url, '_top');
  }
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
