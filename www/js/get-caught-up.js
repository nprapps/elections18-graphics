// Babel 7's `"useBuiltIns: "usage"` will automatically insert polyfills
// https://babeljs.io/docs/en/next/babel-preset-env#usebuiltins

import { renderGetCaughtUp } from './includes/get-caught-up.js';
import { isLocalhost } from './includes/helpers.js';

window.pymChild = null;

var onWindowLoaded = function () {
  // init pym and render callback
  window.pymChild = new pym.Child({
    renderCallback: render
  });
  addLinkListener();
};

/*
 * Make sure links open in _top
 * Cribbed from https://github.com/nprapps/elections16graphics/blob/master/www/js/map-liveblog-hp.js#L35-L48
 */
var parseParentURL = function () {
  if (!window.pymChild) {
    return null;
  }
  const parentUrl = new URL(window.pymChild.parentUrl, document.location, true);
  if (isLocalhost(parentUrl.hostname)) {
    return 'localhost';
  } else {
    return parentUrl.hostname.split('.').slice(-2).join('.');
  }
};

const addLinkListener = function () {
  const domain = parseParentURL();
  const getCaughtUp = document.getElementById('get-caught-up-wrapper');
  getCaughtUp.addEventListener('click', function (e) {
    if (e.target && e.target.nodeName === 'A') {
      if (window.pymChild && (domain === 'npr.org' || domain === 'localhost')) {
        pymChild.sendMessage('pjax-navigate', e.target.href);
        e.preventDefault();
        e.stopPropagation();
      } else {
        window.open(e.target.href, '_top');
      }
    }
  });
};

var render = function (containerWidth) {
  renderGetCaughtUp(containerWidth);
};

window.onload = onWindowLoaded;
