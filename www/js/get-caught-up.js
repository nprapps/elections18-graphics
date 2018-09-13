// Babel 7's `"useBuiltIns: "usage"` will automatically insert polyfills
// https://babeljs.io/docs/en/next/babel-preset-env#usebuiltins

import { renderGetCaughtUp } from '../js/includes/get-caught-up.js';

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
const addLinkListener = function() {
    const domain = parseParentURL();
    liveblog.addEventListener('click', function(e) {
        if(e.target && e.target.nodeName == "A") {
            if (window.pymChild && (domain == 'npr.org' || domain == 'localhost')) {
                pymChild.sendMessage('pjax-navigate', e.target.href);
                e.preventDefault();
                e.stopPropagation();
            } else {
                window.open(e.target.href, '_top');
            }
        }
    });
}
var render = function (containerWidth) {
  renderGetCaughtUp(containerWidth);
};

window.onload = onWindowLoaded;
