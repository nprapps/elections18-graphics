// Babel 7's `"useBuiltIns: "usage"` will automatically insert polyfills
// https://babeljs.io/docs/en/next/babel-preset-env#usebuiltins

import './includes/analytics.js';
import { renderGetCaughtUp } from './includes/get-caught-up.js';
import { isLocalhost, isNPRHost, identifyParentHostname } from './includes/helpers.js';

var onWindowLoaded = function () {
  // init pym and render callback
  window.pymChild = new window.pym.Child({
    renderCallback: render
  });
  addLinkListener();
};

const addLinkListener = function () {
  // Make sure links open in `_top`
  const domain = identifyParentHostname();
  const getCaughtUp = document.getElementById('get-caught-up-wrapper');
  getCaughtUp.addEventListener('click', function (e) {
    if (e.target && e.target.nodeName === 'A') {
      if (window.pymChild && (!domain || isNPRHost(domain) || isLocalhost(domain))) {
        window.pymChild.sendMessage('pjax-navigate', e.target.href);
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

window.addEventListener('load', onWindowLoaded);
