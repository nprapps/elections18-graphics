import { isLocalhost, isNPRHost, identifyParentDomain } from './helpers.js';

const updateMenuParent = function (e) {
  // Update iframe
  if (pymChild) {
    setTimeout(pymChild.sendHeight, 0);
  }
};

const followNavLink = function (e) {
  // Make sure links open in `_top`
  const domain = identifyParentDomain();
  if (
    e.target.tagName === 'A' &&
    e.target !== e.currentTarget &&
    pymChild &&
    (isNPRHost(domain) || isLocalhost(domain))
  ) {
    pymChild.sendMessage('pjax-navigate', e.target.href);
    e.preventDefault();
    e.stopPropagation();
  }
};

const setNavBarHandlers = () => {
  var resultsMenuButton = document.querySelector('.small-screen-nav-label');
  var resultsMenu = document.querySelector('.menu');
  resultsMenuButton.addEventListener('click', updateMenuParent);
  resultsMenu.addEventListener('click', followNavLink);

  var stateMenuButton = document.querySelector('.state-nav-label');
  var stateMenu = document.querySelector('.state-nav');
  stateMenu.addEventListener('click', followNavLink);
  stateMenuButton.addEventListener('click', updateMenuParent);
};

const showNavbarIfNotStationEmbed = () => {
  // Want to disable navigation on all embeds on member-station sites
  // Would make more sense to hide-if-member-station, but because of JS
  // load order and HTML rendering order, that would cause the navbar
  // to show briefly, then disappear
  const domain = identifyParentDomain();
  if (!domain || isNPRHost(domain) || isLocalhost(domain)) {
    const navbarWrapper = document.getElementById('results-nav-wrapper');
    navbarWrapper.classList.remove('hidden');
  }
};

// Set the handlers when this ES6 module is imported for its side-effects
showNavbarIfNotStationEmbed();
setNavBarHandlers();
