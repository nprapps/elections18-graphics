// Babel 7's `"useBuiltIns: "usage"` will automatically insert polyfills
// https://babeljs.io/docs/en/next/babel-preset-env#usebuiltins

// npm libraries
import './includes/analytics.js';
import { initBop, renderBop } from '../js/includes/bop.js';
import { renderGetCaughtUp } from '../js/includes/get-caught-up.js';
import { isLocalhost, isNPRHost, identifyParentHostname } from '../js/includes/helpers.js';

// global vars
window.pymChild = null;
var isBopInit = false;

/*
* Initialize the graphic.
*/
var onWindowLoaded = function () {
  // init pym and render callback
  window.pymChild = new window.pym.Child({
    renderCallback: render
  });
  setTimeout(addLinkListener, 0);
};

const addLinkListener = function () {
  const domain = identifyParentHostname();
  const getCaughtUp = document.getElementById('gcu-wrapper');
  getCaughtUp.addEventListener('click', function (e) {
    if (e.target && e.target.nodeName === 'A') {
      const href = e.target.href;

      if (
        window.pymChild &&
        href.includes('npr.org') &&
        href.includes('/sharecard/')
      ) {
        // Open liveblog links within the liveblog
        e.preventDefault();
        e.stopPropagation();
        const slug = href.split('/').slice(-1)[0].replace('.html', '');
        window.pymChild.scrollParentTo(slug);
      } else if (window.pymChild && (!domain || isNPRHost(domain) || isLocalhost(domain))) {
        // On NPR.org, open external links w/ PJAX (so it doesn't disrupt the persistent audio player)
        window.pymChild.sendMessage('pjax-navigate', href);
        e.preventDefault();
        e.stopPropagation();
      } else {
        // Otherwise, open external links in a new tab/window
        window.open(href, '_top');
      }
    }
  });
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
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.addEventListener('load', onWindowLoaded);
