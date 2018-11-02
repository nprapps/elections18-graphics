// Babel 7's `"useBuiltIns: "usage"` will automatically insert polyfills
// https://babeljs.io/docs/en/next/babel-preset-env#usebuiltins

// npm libraries
import './includes/analytics.js';
import { select } from 'd3-selection';
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
  setTimeout(addLinkListener, 1);
};

const addLinkListener = function () {
  const domain = identifyParentHostname();
  const getCaughtUp = document.getElementById('gcu-wrapper');
  getCaughtUp.addEventListener('click', function (e) {
    if (e.target && e.target.nodeName === 'A') {
      // Since this is often the grandchild of the browser window,
      // determine whether triggered click events can be bubbled up
      // to the parent Pym
      const pymToSendEventsTo = (window.pymChild && window.parent.pymChild && window.pymChild !== window.parent.pymChild)
        ? window.parent.pymChild
        : window.pymChild;

      // Send Google Analytics information about which link was clicked
      const href = e.target.href;
      const paragraphOrBulletText = e.target.parentNode.innerText;
      window.ANALYTICS.trackEvent('gcu-link-click', `${paragraphOrBulletText} <${href}>`);

      if (
        window.pymChild &&
        href.includes('npr.org') &&
        href.includes('/sharecard/')
      ) {
        // Open liveblog links by scrolling within the liveblog
        e.preventDefault();
        e.stopPropagation();
        const slug = href.split('/').slice(-1)[0].replace('.html', '');
        pymToSendEventsTo.scrollParentToChildEl(slug);
      } else if (
        window.pymChild &&
        shouldUsePJAXForHost(domain)
      ) {
        // On NPR.org, open external links w/ PJAX (so it doesn't disrupt the persistent audio player)
        e.preventDefault();
        e.stopPropagation();
        pymToSendEventsTo.sendMessage('pjax-navigate', href);
      } else {
        // Open non-NPR links in a new window
        e.preventDefault();
        e.stopPropagation();
        window.open(href);
      }
    }
  });
};

/*
 * Render
 */
var render = function (containerWidth) {
  // delete existing BOP
  select('#bop').html('');

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
