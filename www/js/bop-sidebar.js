// Babel 7's `"useBuiltIns: "usage"` will automatically insert polyfills
// https://babeljs.io/docs/en/next/babel-preset-env#usebuiltins

// npm libraries
import { initBop, renderBop } from '../js/includes/bop.js';

// Global vars
window.pymChild = null;
var isBopInit = false;
var navLinks = null;
/*
* Initialize the graphic.
*/
var onWindowLoaded = function () {
  // init pym and render callback
  window.pymChild = new pym.Child({
    renderCallback: render
  });

  navLinks = document.querySelectorAll('.nav-link');
  for (var i = 0; i < navLinks.length; i++) {
    navLinks[i].addEventListener('click', onNavLinkClick);
  }
};

var onNavLinkClick = function (e) {
  const domain = parseParentURL();
  const url = e.target.href;
  console.log('nav link click');

  if (window.pymChild && (domain === 'npr.org' || domain === 'localhost')) {
    console.log('if statement passing');
    window.pymChild.sendMessage('pjax-navigate', url);
    e.preventDefault();
    e.stopPropagation();
  } else {
    console.log('if statement failing');
    window.open(url, '_top');
  }
};

var parseParentURL = function () {
  if (!pymChild) {
    return null;
  }
  const parentUrl = new URL(window.pymChild.parentUrl, location, true);
  if (parentUrl.hostname == '127.0.0.1') {
    return 'localhost';
  } else {
    return parentUrl.hostname.split('.').slice(-2).join('.');
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
window.onload = onWindowLoaded;
