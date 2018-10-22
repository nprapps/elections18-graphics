// Polyfills that aren't covered by `babel-preset-env`
import 'promise-polyfill/src/polyfill';
import 'whatwg-fetch';
import URL from 'url-parse';

import { h, createProjector } from 'maquette';
import { buildDataURL, getHighestPymEmbed } from './helpers.js';

var dataURL;
var lastRequestTime;
var data;
var initialized = false;
var useDebug = false;
var isValidMarkup;

const projector = createProjector();

function renderGetCaughtUp () {
  const wrapper = document.querySelector('.get-caught-up-wrapper');
  projector.replace(wrapper, renderMaquette);

  // Have to delay so that `window.pymChild` is instantiated
  setTimeout(
    () => {
      if (!initialized) {
        initialized = true;

        // Allow loading of the debug `get-caught-up` file instead
        const highestPymChildParentUrl = window.pymChild && getHighestPymEmbed(window).parentUrl;
        const urlToCheck = highestPymChildParentUrl || document.URL;
        useDebug = URL(urlToCheck, true).query['gcu-debug'] === '1';
        dataURL = useDebug
          ? buildDataURL('get-caught-up-debug.json')
          : buildDataURL('get-caught-up.json');
        getData();

        // This `setInterval` will persist across re-renderings
        setInterval(getData, 5000);
      }
    }, 0
  );
}

var getData = function () {
  window.fetch(
    dataURL,
    { headers: { 'If-Modified-Since': lastRequestTime } }
  ).then(res => {
    if (res.status === 304) {
      // There is no body to decode in a `304` response
      return new Promise(() => null);
    } else if (res.ok) {
      return res.json();
    } else {
      throw Error(res.statusText);
    }
  }).then(res => {
    lastRequestTime = new Date().toUTCString();
    if (res) {
      data = res.content;
      isValidMarkup = res.meta.is_valid_markup;
      projector.scheduleRender();
    }
  }).catch(err => console.warn(err));
};

function renderMaquette () {
  const INTRO_KEY_PREFIX = 'intro_';
  const BULLET_KEY_PREFIX = 'bullet_';

  if (!data) {
    return h('div.get-caught-up-wrapper', 'Loading...');
  } else {
    setTimeout(window.pymChild.sendHeight, 0);

    if (!isValidMarkup) {
      return h('div.get-caught-up-wrapper', [
        h('h2', useDebug ? 'Get Caught Up [DEBUG]' : 'Get Caught Up'),
        h('p', data)
      ]);
    } else {
      return h('div.get-caught-up-wrapper', [
        h('h2', useDebug ? 'Get Caught Up [DEBUG]' : 'Get Caught Up'),

        // Render intro paragraphs
        ...Object.keys(data)
          .filter(k => k.startsWith(INTRO_KEY_PREFIX))
          .filter(k => data[k] !== '')
          .sort((a, b) => a > b)
          .map(k => h('p', { key: k, innerHTML: data[k] })),

        // Render bullet points
        h(
          'ul',
          Object.keys(data)
            .filter(k => k.startsWith(BULLET_KEY_PREFIX))
            .filter(k => data[k] !== '')
            .sort((a, b) => a > b)
            .map(k => h('li', { key: k, innerHTML: data[k] }))
        )
      ]);
    }
  }
}

export {
  renderGetCaughtUp
};
