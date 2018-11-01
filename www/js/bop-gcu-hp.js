// Babel 7's `"useBuiltIns: "usage"` will automatically insert polyfills
// https://babeljs.io/docs/en/next/babel-preset-env#usebuiltins

// npm libraries
import './includes/analytics.js';
import '../js/includes/navbar.js';
import appConfig from './includes/app_config.js';
import { initBop, renderBop } from '../js/includes/bop.js';
import { renderGetCaughtUp } from '../js/includes/get-caught-up.js';
import { getParameterByName, shouldUsePJAXForHost, identifyParentHostname } from '../js/includes/helpers.js';

// global vars
var isBopInit = false;

/*
* Initialize the graphic.
*/
var onWindowLoaded = function () {
    // (if someone clicked the "This code will be embedded
    // on the NPR homepage." checkbox when pulling the embed code.)
   if (getParameterByName('mode') == 'hp') {
       document.body.classList.add('hp');
   }

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
      const href = e.target.href;

      // Send Google Analytics information about which link was clicked
      const paragraphOrBulletText = e.target.parentNode.innerText;
      window.ANALYTICS.trackEvent('gcu-link-click', `${paragraphOrBulletText} <${href}>`);

      if (
        window.pymChild &&
        href.includes('npr.org') &&
        href.includes('/sharecard/')
      ) {
        // PJAX navigate straight to the liveblog, skipping the sharecard,
        // in order to make the UX smoother
        e.preventDefault();
        e.stopPropagation();
        const slug = href.split('/').slice(-1)[0].replace('.html', '');
        window.pymChild.sendMessage('pjax-navigate', `${appConfig.LIVEBLOG_URL}?post=${slug}`);
      } else if (window.pymChild && shouldUsePJAXForHost(domain)) {
        // On NPR.org, open NPR links w/ PJAX (so it doesn't disrupt the persistent audio player)
        window.pymChild.sendMessage('pjax-navigate', href);
        e.preventDefault();
        e.stopPropagation();
      } else {
        // Open non-NPR links in a new window
        window.open(href);
      }
    }
  });
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.addEventListener('load', onWindowLoaded);
