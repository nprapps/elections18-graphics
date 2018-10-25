import URL from 'url-parse';

/*
 * Basic Javascript helpers used in analytics.js and graphics code.
 */

/*
 * Convert arbitrary strings to valid css classes.
 * via: https://gist.github.com/mathewbyrne/1280286
 *
 * NOTE: This implementation must be consistent with the Python classify
 * function defined in base_filters.py.
 */
const classify = function (str) {
  return str.toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
};

/*
 * Parse a url parameter by name.
 * via: http://stackoverflow.com/a/901144
 */
const getParameterByName = function (name) {
  name = name.replace(/[[]/, '\\[').replace(/[\]]/, '\\]');
  const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
  const results = regex.exec(document.location.search);
  return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
};

function isLocalhost (hostname) {
  return ['127.0.0.1', 'localhost', '0.0.0.0'].includes(hostname);
}

function isNPRHost (hostname) {
  // Handle NPR subdomains, too
  return hostname === 'npr.org' || hostname.endsWith('.npr.org');
}

const identifyParentHostname = function () {
  return typeof window.pymChild === 'undefined'
    ? window.location.hostname
    : new URL(window.pymChild.parentUrl).hostname;
};

const buildDataURL = function (filename) {
  if (isLocalhost(document.location.hostname)) {
    return document.location.protocol + '//' + document.location.hostname + ':' + document.location.port + '/data/' + filename;
  } else {
    return document.location.protocol + '//' + document.location.hostname + '/elections18/data/' + filename;
  }
};

const getHighestPymEmbed = window => {
  // For when there may be Pym iframes inside Pym iframes, recursively
  // determine which the highest-level Pym child is (ie,
  // which embed is the child of the overall parent `window`)
  if (!window.pymChild) {
    return null;
  } else if (window.pymChild && !window.parent.pymChild) {
    return window.pymChild;
  } else {
    return window.parent.pymChild;
  }
};

// Credit Sonya Moisset
// https://medium.freecodecamp.org/three-ways-to-title-case-a-sentence-in-javascript-676a9175eb27
const toTitleCase = str =>
  str.toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase().concat(word.slice(1)))
    .join(' ');

export {
  classify,
  getParameterByName,
  isLocalhost,
  isNPRHost,
  identifyParentHostname,
  buildDataURL,
  getHighestPymEmbed,
  toTitleCase
};
